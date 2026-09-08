import { createHash } from 'node:crypto'
import { createReadStream, constants } from 'node:fs'
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

// Packages existing, verified artifacts for separate itch uploads. No builds,
// authentication, uploads, or replacement of an existing directory occur here.
const root = fileURLToPath(new URL('..', import.meta.url))
const { values } = parseArgs({ options: {
  source: { type: 'string' }, output: { type: 'string' }, version: { type: 'string' },
} })
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const version = values.version ?? pkg.version
if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version)) throw new Error('Expected a semver release version')
const source = resolve(values.source ?? resolve(root, 'dist'))
const output = resolve(values.output ?? resolve(root, 'dist', `itch-${version}`))
const artifacts = [
  { name: `Citadel-${version}-setup.exe`, platform: 'Windows', label: 'Windows installer' },
  { name: `Citadel-${version}-portable.exe`, platform: 'Windows', label: 'Windows portable' },
  { name: `Citadel-${version}.AppImage`, platform: 'Linux', label: 'Linux AppImage' },
  { name: `citadel-${version}.tar.gz`, platform: 'Linux', label: 'Linux tar.gz' },
]
// Validate the complete set before writing anything.
for (const artifact of artifacts) {
  const info = await stat(resolve(source, artifact.name))
  if (!info.isFile() || info.size === 0) throw new Error(`Missing or empty artifact: ${artifact.name}`)
}
await mkdir(output) // Fails if it exists: never overwrite an earlier release.
const checksums = []
for (const artifact of artifacts) {
  const destination = resolve(output, artifact.name)
  await copyFile(resolve(source, artifact.name), destination, constants.COPYFILE_EXCL)
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(destination)) hash.update(chunk)
  checksums.push(`${hash.digest('hex')}  ${artifact.name}`)
}
await writeFile(resolve(output, 'SHA256SUMS.txt'), `${checksums.join('\n')}\n`, { flag: 'wx' })
await writeFile(resolve(output, 'uploads.json'), JSON.stringify({
  project: 'kannibalkwi/citadel', version, artifacts,
  note: 'Upload each artifact separately and select its platform. Keep the HTML demo.',
}, null, 2) + '\n', { flag: 'wx' })
console.log(`Prepared ${artifacts.length} separate downloads in ${output}`)
