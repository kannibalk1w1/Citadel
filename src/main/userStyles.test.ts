import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { displayName, fontsDirFor, listFonts, listSnippets, readFont, snippetsDirFor } from './userStyles'
import { APPEARANCE_LIMITS } from '../types/appearance'

const tempDirs: string[] = []
const makeTempDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'citadel-styles-'))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('listSnippets', () => {
  it('reads the .css files in the folder and marks the ones switched on', async () => {
    const dir = makeTempDir()
    writeFileSync(join(dir, 'contrast.css'), ':root { --accent: #ff0000; }')
    writeFileSync(join(dir, 'quiet.css'), ':root { --border: #111; }')

    const result = await listSnippets(dir, ['quiet'])

    expect(result.snippets.map((snippet) => snippet.name)).toEqual(['contrast', 'quiet'])
    expect(result.snippets.find((snippet) => snippet.name === 'quiet')?.enabled).toBe(true)
    expect(result.snippets.find((snippet) => snippet.name === 'contrast')?.enabled).toBe(false)
    expect(result.snippets[0].css).toContain('--accent')
  })

  it('creates the folder rather than failing on the first run', async () => {
    const dir = join(makeTempDir(), 'snippets')
    const result = await listSnippets(dir, [])

    expect(result.snippets).toEqual([])
    expect(result.folder).toBe(dir)
  })

  it('ignores everything that is not a stylesheet, including folders', async () => {
    const dir = makeTempDir()
    writeFileSync(join(dir, 'theme.css'), 'body {}')
    writeFileSync(join(dir, 'notes.txt'), 'not css')
    writeFileSync(join(dir, '.hidden.css'), 'body {}')
    mkdirSync(join(dir, 'nested.css'))

    const result = await listSnippets(dir, [])

    expect(result.snippets.map((snippet) => snippet.name)).toEqual(['theme'])
  })

  it('skips a file too large to be a stylesheet instead of reading it', async () => {
    const dir = makeTempDir()
    writeFileSync(join(dir, 'huge.css'), 'a'.repeat(APPEARANCE_LIMITS.maxSnippetBytes + 1))
    writeFileSync(join(dir, 'small.css'), 'body {}')

    const result = await listSnippets(dir, [])

    expect(result.snippets.map((snippet) => snippet.name)).toEqual(['small'])
  })
})

describe('listFonts', () => {
  it('lists font files and hands back the current assignments', async () => {
    const dir = makeTempDir()
    writeFileSync(join(dir, 'Berkeley Mono.woff2'), 'x')
    writeFileSync(join(dir, 'notes.md'), 'x')

    const result = await listFonts(dir, { mono: 'Berkeley Mono' })

    expect(result.fonts.map((font) => font.family)).toEqual(['Berkeley Mono'])
    expect(result.choices).toEqual({ mono: 'Berkeley Mono' })
  })
})

describe('readFont', () => {
  it('hands back bytes for a font in the folder', async () => {
    const dir = makeTempDir()
    writeFileSync(join(dir, 'Iosevka.ttf'), 'font-bytes')

    const result = await readFont(dir, 'Iosevka.ttf')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.family).toBe('Iosevka')
    expect(Buffer.from(result.data).toString()).toBe('font-bytes')
  })

  it('refuses a name that tries to leave the folder', async () => {
    const dir = makeTempDir()
    // The folder is the whole permission: a name is not a path, and one that
    // reads like a path is refused rather than resolved.
    for (const name of ['../settings.json', '..\\settings.json', '/etc/passwd', 'sub/font.ttf']) {
      expect(await readFont(dir, name)).toMatchObject({ ok: false })
    }
  })

  it('refuses a file that is not a font, whatever it holds', async () => {
    const dir = makeTempDir()
    writeFileSync(join(dir, 'settings.json'), '{}')

    expect(await readFont(dir, 'settings.json')).toMatchObject({ ok: false })
    expect(await readFont(dir, 42)).toMatchObject({ ok: false })
  })
})

describe('where the folders are', () => {
  it('is the user data folder, never a project', () => {
    // A .citadel file is made to be handed around. CSS or a font travelling
    // inside one would be a project that could restyle someone else's app.
    expect(snippetsDirFor('/data')).toBe(join('/data', 'snippets'))
    expect(fontsDirFor('/data')).toBe(join('/data', 'fonts'))
  })

  it('names a file by what it is called, without its extension', () => {
    expect(displayName('Berkeley Mono.woff2')).toBe('Berkeley Mono')
    expect(displayName('theme.css')).toBe('theme')
  })
})
