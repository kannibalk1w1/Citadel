/**
 * Fetch the transcription engine for a packaged build.
 *
 * Run: npm run engine        (automatic as part of npm run package)
 *
 * Citadel transcribes voice notes with whisper.cpp, run as a child process. The
 * binary is not committed: it is platform specific, it comes with a set of
 * shared libraries rather than being one file, and a locally built copy is
 * compiled for the machine that built it — `GGML_NATIVE` defaults on, so a
 * developer's build would fail with an illegal instruction on an older CPU
 * rather than with a message. Committing one would be committing a landmine.
 *
 * So the engine is fetched instead, from a pinned upstream release, verified
 * against a pinned SHA-256, and unpacked into resources/whisper/ where
 * src/main/transcription.ts looks for it. That is the same bargain the model
 * downloader makes at runtime: nothing arrives unverified, and nothing that
 * fails verification is left behind.
 *
 * Upstream's release builds carry every ggml CPU variant and choose one at
 * runtime, which is exactly the portability a hand-built binary lacks. All of
 * them are kept for that reason; the rest of the archive (the server, the
 * streaming demos, SDL2, llama, the test binaries) is not.
 *
 * Moving to a newer release: change RELEASE, run this with --print-digest to
 * read the new digests, and paste them in. Then run the engine test in
 * docs/testing.md, because the flags and the JSON shape are upstream's to
 * change and this project reads both.
 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import {
  chmodSync, createWriteStream, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync,
  readlinkSync, rmSync, statSync, symlinkSync, writeFileSync,
} from 'node:fs'
import { get } from 'node:https'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const engineDir = join(root, 'resources', 'whisper')
/** Records what was installed, so a second run is free rather than a second download. */
const stampFile = join(engineDir, '.engine-version')

const RELEASE = 'b4938'

/**
 * One entry per platform Citadel packages for. `keep` is deliberately a list of
 * exact names and one prefix rule rather than "everything": an installer should
 * not carry a whisper server and an SDL2 copy to transcribe a voice note.
 */
const ENGINES = {
  win32: {
    asset: 'whisper-bin-x64.zip',
    sha256: 'c2a4b60edb11f7e11a9191ffb50929535527d4d91c9903dbe3e554583bbbc63d',
    entryPrefix: 'Release/',
    binary: 'whisper-cli.exe',
    keep: (name) => name === 'whisper-cli.exe' || name === 'whisper.dll' || /^ggml.*\.dll$/.test(name),
  },
  linux: {
    asset: 'whisper-bin-ubuntu-x64.tar.gz',
    sha256: 'f4cfc1f969a13805908fb72043ce7cc896eb42e0b8afbe841dc8e7298923b061',
    entryPrefix: 'whisper-bin-ubuntu-x64/',
    binary: 'whisper-cli',
    keep: (name) => name === 'whisper-cli' || /^lib(whisper|ggml).*\.so($|\.)/.test(name),
  },
}

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const value = (name) => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : null
}

const platform = value('platform') ?? process.platform
const engine = ENGINES[platform]

if (!engine) {
  // macOS is not a Citadel target yet. Saying so beats a stack trace, and a
  // person building there can still point Settings at their own binary.
  console.log(`No whisper.cpp release is pinned for ${platform}. Citadel packages for ${Object.keys(ENGINES).join(' and ')}.`)
  console.log('Settings can point at a whisper.cpp binary you build yourself.')
  process.exit(0)
}

const url = `https://github.com/ggml-org/whisper.cpp/releases/download/${RELEASE}/${engine.asset}`

/** GitHub answers with a redirect to its object store, so redirects are followed. */
function download(target, destination, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    get(target, { headers: { 'user-agent': 'citadel-build' } }, (response) => {
      const status = response.statusCode ?? 0
      if (status >= 300 && status < 400 && response.headers.location) {
        response.resume()
        if (redirectsLeft <= 0) return reject(new Error('redirected too many times'))
        return resolve(download(new URL(response.headers.location, target).toString(), destination, redirectsLeft - 1))
      }
      if (status !== 200) {
        response.resume()
        return reject(new Error(`the download server answered ${status || 'nothing'}`))
      }

      const total = Number(response.headers['content-length']) || 0
      const hash = createHash('sha256')
      const file = createWriteStream(destination)
      let received = 0
      let lastPercent = -1

      response.on('data', (chunk) => {
        hash.update(chunk)
        received += chunk.length
        const percent = total ? Math.floor((received / total) * 100) : 0
        if (percent >= lastPercent + 10) {
          lastPercent = percent
          process.stdout.write(`\r  ${percent}%`)
        }
      })
      response.on('error', reject)
      file.on('error', reject)
      file.on('finish', () => {
        process.stdout.write('\r      \r')
        resolve(hash.digest('hex'))
      })
      response.pipe(file)
    }).on('error', reject)
  })
}

/** Only the files the engine needs, flattened out of the archive's own folder. */
async function unpack(archive, workDir) {
  mkdirSync(workDir, { recursive: true })

  if (engine.asset.endsWith('.zip')) {
    // JSZip is already a dependency, and unzip is not on every Windows runner.
    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(readFileSync(archive))
    const written = []
    for (const [path, entry] of Object.entries(zip.files)) {
      if (entry.dir || !path.startsWith(engine.entryPrefix)) continue
      const name = path.slice(engine.entryPrefix.length)
      if (name.includes('/') || !engine.keep(name)) continue
      writeFileSync(join(workDir, name), await entry.async('nodebuffer'))
      written.push(name)
    }
    return written
  }

  // tar ships with every Linux and macOS, and the tarball is only fetched when
  // packaging for one of them.
  execFileSync('tar', ['xzf', archive, '-C', workDir, '--strip-components=1'], { stdio: 'inherit' })
  return readdirSync(workDir).filter((name) => engine.keep(name))
}

async function main() {
  const stamp = `${RELEASE} ${platform}`
  if (!flag('force') && existsSync(join(engineDir, engine.binary))
    && existsSync(stampFile) && readFileSync(stampFile, 'utf-8').trim() === stamp) {
    console.log(`whisper.cpp ${RELEASE} is already in resources/whisper (--force to fetch again).`)
    return
  }

  console.log(`Fetching whisper.cpp ${RELEASE} for ${platform}: ${engine.asset}`)
  const workDir = join(tmpdir(), `citadel-engine-${Date.now()}`)
  mkdirSync(workDir, { recursive: true })
  const archive = join(workDir, engine.asset)

  try {
    const digest = await download(url, archive)

    if (flag('print-digest')) {
      console.log(`${engine.asset}  sha256 ${digest}`)
      return
    }
    // A mirror, a proxy, or a truncated transfer all end here rather than in a
    // signed installer.
    if (digest !== engine.sha256) {
      throw new Error(`the download did not match its pinned checksum.\n  expected ${engine.sha256}\n  received ${digest}`)
    }

    const extracted = join(workDir, 'extracted')
    const kept = await unpack(archive, extracted)
    if (!kept.includes(engine.binary)) {
      throw new Error(`${engine.asset} no longer contains ${engine.binary}. The release layout has changed.`)
    }

    // Cleared before writing, so a switch between platforms or releases cannot
    // leave one version's libraries beside another's binary. The README is the
    // only committed thing in here and it stays.
    mkdirSync(engineDir, { recursive: true })
    for (const name of readdirSync(engineDir)) {
      if (name !== 'README.md') rmSync(join(engineDir, name), { recursive: true, force: true })
    }
    for (const name of kept) {
      const from = join(extracted, name)
      const to = join(engineDir, name)
      // The unix archives carry the usual libfoo.so -> libfoo.so.1.2.3 chain.
      // Copying through those links would put three identical copies of every
      // library in the installer, so the links are recreated as links.
      if (lstatSync(from).isSymbolicLink()) symlinkSync(readlinkSync(from), to)
      else writeFileSync(to, readFileSync(from))
    }
    if (platform !== 'win32') chmodSync(join(engineDir, engine.binary), 0o755)
    writeFileSync(stampFile, `${stamp}\n`)

    const bytes = kept.reduce((total, name) => {
      const stat = lstatSync(join(engineDir, name))
      return stat.isSymbolicLink() ? total : total + statSync(join(engineDir, name)).size
    }, 0)
    console.log(`Installed ${kept.length} files (${Math.round(bytes / (1024 * 1024))} MB) into resources/whisper`)
  } finally {
    rmSync(workDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(`Could not fetch the transcription engine: ${error.message}`)
  console.error('Citadel still builds without it: transcription refuses with a named reason, and Settings can point at a whisper.cpp binary.')
  process.exit(1)
})
