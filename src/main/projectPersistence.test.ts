import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  makeCitadelProjectPortable,
  readCitadelProject,
  resolveCitadelProjectAssets,
  writeCitadelProject,
} from './projectPersistence'

const roots: string[] = []

function tempRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), 'citadel-project-'))
  roots.push(dir)
  return dir
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true })
})

type TestProject = {
  version: string
  boards: { id: string; name: string; items: { id: string; type: string; src?: string }[] }[]
  activeBoardId: string
}

function project(items: TestProject['boards'][number]['items']): TestProject {
  return {
    version: '1.0.0',
    boards: [{ id: 'chamber-1', name: 'First Chamber', items }],
    activeBoardId: 'chamber-1',
  }
}

describe('writeCitadelProject / readCitadelProject', () => {
  it('round-trips a relic-free chamber unchanged', () => {
    const root = tempRoot()
    const path = join(root, 'archive.citadel')
    const original = project([{ id: 'note-1', type: 'sticky' }])

    writeCitadelProject(path, JSON.stringify(original))

    expect(JSON.parse(readCitadelProject(path))).toEqual(original)
  })

  it('stores relics inside the chamber folder as relative paths and restores them absolute', () => {
    const root = tempRoot()
    const relicPath = join(root, 'media', 'relic.png')
    mkdirSync(join(root, 'media'))
    writeFileSync(relicPath, 'relic-bytes')
    const path = join(root, 'archive.citadel')

    writeCitadelProject(path, JSON.stringify(project([{ id: 'relic-1', type: 'image', src: relicPath }])))

    // On disk the path is relative and forward-slashed, so the folder stays portable.
    const onDisk = JSON.parse(readFileSync(path, 'utf-8')) as TestProject
    expect(onDisk.boards[0].items[0].src).toBe('media/relic.png')

    // The renderer gets an absolute path back.
    const loaded = JSON.parse(readCitadelProject(path)) as TestProject
    expect(loaded.boards[0].items[0].src).toBe(resolve(relicPath))
  })

  it('copies outside relics into assets/ on save so the chamber is self-contained', () => {
    const root = tempRoot()
    const outside = tempRoot()
    const relicPath = join(outside, 'far relic.png')
    writeFileSync(relicPath, 'relic-bytes')
    const path = join(root, 'archive.citadel')

    writeCitadelProject(path, JSON.stringify(project([{ id: 'relic-1', type: 'image', src: relicPath }])))

    const onDisk = JSON.parse(readFileSync(path, 'utf-8')) as TestProject
    expect(onDisk.boards[0].items[0].src).toBe('assets/far-relic.png')
    expect(readFileSync(join(root, 'assets', 'far-relic.png'), 'utf-8')).toBe('relic-bytes')
  })

  it('does not collide when two outside relics share a filename', () => {
    const root = tempRoot()
    const outsideA = tempRoot()
    const outsideB = tempRoot()
    writeFileSync(join(outsideA, 'relic.png'), 'first')
    writeFileSync(join(outsideB, 'relic.png'), 'second')
    const path = join(root, 'archive.citadel')

    writeCitadelProject(path, JSON.stringify(project([
      { id: 'relic-1', type: 'image', src: join(outsideA, 'relic.png') },
      { id: 'relic-2', type: 'image', src: join(outsideB, 'relic.png') },
    ])))

    const srcs = (JSON.parse(readFileSync(path, 'utf-8')) as TestProject).boards[0].items.map((item) => item.src)
    expect(srcs).toEqual(['assets/relic.png', 'assets/relic-2.png'])
    expect(readFileSync(join(root, 'assets', 'relic.png'), 'utf-8')).toBe('first')
    expect(readFileSync(join(root, 'assets', 'relic-2.png'), 'utf-8')).toBe('second')
  })

  it('leaves remote and embedded sources untouched in both directions', () => {
    const root = tempRoot()
    const path = join(root, 'archive.citadel')
    const remote = project([
      { id: 'tube-1', type: 'youtube', src: 'https://www.youtube.com/watch?v=abc' },
      { id: 'inline-1', type: 'image', src: 'data:image/png;base64,AAAA' },
    ])

    writeCitadelProject(path, JSON.stringify(remote))

    expect(JSON.parse(readCitadelProject(path))).toEqual(remote)
  })

  it('keeps PDF originals and transcript source references portable and deduplicated', () => {
    const root = tempRoot()
    const outside = tempRoot()
    const preview = join(outside, 'preview.png')
    const pdf = join(outside, 'paper.pdf')
    const audio = join(outside, 'voice.wav')
    for (const path of [preview, pdf, audio]) writeFileSync(path, path)
    const original = {
      boards: [{ items: [
        { id: 'pdf', src: preview, meta: { sourcePdf: pdf, sourcePdfPage: 2 } },
        { id: 'audio', src: audio },
        { id: 'transcript', src: audio, meta: { transcriptOf: audio, content: 'Keep this text' } },
      ] }],
      recordings: [{ events: [{ before: null, after: { id: 'audio', src: audio } }] }],
    }
    const path = join(root, 'archive.citadel')
    writeCitadelProject(path, JSON.stringify(original))
    const portable = JSON.parse(readFileSync(path, 'utf8'))
    expect(portable.boards[0].items[0].meta.sourcePdf).toBe('assets/paper.pdf')
    expect(portable.boards[0].items[1].src).toBe(portable.boards[0].items[2].src)
    expect(portable.boards[0].items[2].meta.transcriptOf).toBe(portable.boards[0].items[1].src)
    expect(portable.recordings[0].events[0].after.src).toBe(portable.boards[0].items[1].src)
    const moved = tempRoot()
    const loaded = JSON.parse(resolveCitadelProjectAssets(JSON.stringify(portable), join(moved, 'archive.citadel')))
    expect(loaded.boards[0].items[0].meta.sourcePdf).toBe(join(moved, 'assets', 'paper.pdf'))
    expect(loaded.boards[0].items[2].meta.transcriptOf).toBe(join(moved, 'assets', 'voice.wav'))
  })

  it('does not overwrite an existing project asset with an unrelated same-named source', () => {
    const root = tempRoot()
    const outside = tempRoot()
    mkdirSync(join(root, 'assets'))
    writeFileSync(join(root, 'assets', 'voice.wav'), 'existing recording')
    writeFileSync(join(outside, 'voice.wav'), 'different recording')
    writeCitadelProject(join(root, 'archive.citadel'), JSON.stringify(project([
      { id: 'new', type: 'audio', src: join(outside, 'voice.wav') },
    ])))
    expect(readFileSync(join(root, 'assets', 'voice.wav'), 'utf8')).toBe('existing recording')
    expect(readFileSync(join(root, 'assets', 'voice-2.wav'), 'utf8')).toBe('different recording')
    // Re-saving unchanged external references must not keep copying a large PDF
    // or recording into another numbered file on every save.
    writeCitadelProject(join(root, 'archive.citadel'), JSON.stringify(project([
      { id: 'new', type: 'audio', src: join(outside, 'voice.wav') },
    ])))
    expect(readdirSync(join(root, 'assets')).sort()).toEqual(['voice-2.wav', 'voice.wav'])
  })

  it('keeps a missing relic path as written rather than silently dropping it', () => {
    const root = tempRoot()
    const path = join(root, 'archive.citadel')
    const missing = join(root, 'gone.png')

    writeCitadelProject(path, JSON.stringify(project([{ id: 'relic-1', type: 'image', src: missing }])))

    expect(existsSync(join(root, 'assets'))).toBe(false)
    const onDisk = JSON.parse(readFileSync(path, 'utf-8')) as TestProject
    expect(onDisk.boards[0].items[0].src).toBe(missing)
  })

  it('survives a chamber folder being moved after save', () => {
    const first = tempRoot()
    mkdirSync(join(first, 'assets'))
    writeFileSync(join(first, 'assets', 'relic.png'), 'relic-bytes')
    const portable = makeCitadelProjectPortable(
      JSON.stringify(project([{ id: 'relic-1', type: 'image', src: join(first, 'assets', 'relic.png') }])),
      join(first, 'archive.citadel'),
    )

    // Same JSON, read from a different folder — the relic resolves against the new home.
    const moved = tempRoot()
    const reloaded = JSON.parse(resolveCitadelProjectAssets(portable, join(moved, 'archive.citadel'))) as TestProject
    expect(reloaded.boards[0].items[0].src).toBe(resolve(moved, 'assets', 'relic.png'))
  })

  it('writes non-.citadel paths verbatim', () => {
    const root = tempRoot()
    const path = join(root, 'recovery.json')
    const raw = '{"kind":"citadel-recovery"}'

    writeCitadelProject(path, raw)

    expect(readFileSync(path, 'utf-8')).toBe(raw)
    expect(readCitadelProject(path)).toBe(raw)
  })
})
