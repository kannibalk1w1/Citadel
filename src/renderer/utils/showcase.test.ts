import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { ITEM_TYPES } from '../../types'
import type { CanvasItem, Connection } from '../../types'
import { CODE_LANGUAGES } from '../canvas/items/codeSnippet'
import { parseProjectFile } from './projectSchema'

/**
 * examples/showcase.citadel is the guided tour a new user opens, so it has two
 * jobs: load cleanly through the same path a real project takes, and actually
 * demonstrate what the app can do.
 *
 * Both rot silently. A new item type added to ITEM_TYPES without a showcase
 * entry leaves the tour quietly incomplete, and a schema change can start
 * dropping items on load without anything failing — which is exactly the bug
 * ITEM_TYPES was introduced to prevent. This checks the shipped file rather
 * than a fixture, so it is the real thing being verified.
 *
 * Regenerate with: node scripts/buildShowcase.mjs
 */
const raw = readFileSync(join(process.cwd(), 'examples', 'showcase.citadel'), 'utf-8')
const project = parseProjectFile(raw)
const items: CanvasItem[] = project.boards.flatMap((board) => board.items)
const threads: Connection[] = project.boards.flatMap((board) => board.connections)
const meta = (item: CanvasItem) => (item.meta ?? {}) as Record<string, unknown>

describe('the showcase project loads', () => {
  it('parses through the app’s own loader', () => {
    expect(project.boards.length).toBeGreaterThanOrEqual(4)
    expect(project.boards.some((board) => board.id === project.activeBoardId)).toBe(true)
  })

  it('keeps every item it was built with', () => {
    // migrateProjectFile drops items it does not recognise. Counting the raw
    // file against the parsed result catches a type being silently discarded.
    const rawCount = (JSON.parse(raw) as typeof project).boards
      .reduce((total, board) => total + board.items.length, 0)

    expect(items).toHaveLength(rawCount)
  })

  it('carries no reference to a file that has to exist beside it', () => {
    // Everything rides inline, so the tour cannot open with broken relics.
    const external = items
      .map((item) => item.src)
      .filter((src): src is string => Boolean(src))
      .filter((src) => !/^(data:|https:)/.test(src))

    expect(external).toEqual([])
  })

  it('points every connection at items that exist', () => {
    const ids = new Set(items.map((item) => item.id))
    const dangling = threads.filter((t) => !ids.has(t.fromId) || !ids.has(t.toId))

    expect(dangling.map((t) => t.id)).toEqual([])
  })
})

describe('the showcase demonstrates', () => {
  it('every item type', () => {
    const shown = new Set(items.map((item) => item.type))

    expect([...ITEM_TYPES].filter((type) => !shown.has(type))).toEqual([])
  })

  it('every code language', () => {
    const shown = new Set(items.filter((i) => i.type === 'code').map((i) => meta(i).language))

    expect([...CODE_LANGUAGES].filter((language) => !shown.has(language))).toEqual([])
  })

  it('every connection meaning', () => {
    const MEANINGS = [
      'reference', 'memory', 'source', 'echo', 'contradiction',
      'question', 'proof', 'inspiration', 'warning', 'sequence',
    ]
    const shown = new Set(threads.map((t) => t.meaning))

    expect(MEANINGS.filter((meaning) => !shown.has(meaning as Connection['meaning']))).toEqual([])
  })

  it('every connection style and arrow head, dashed and solid', () => {
    const styles = new Set(threads.map((t) => t.style))
    const heads = new Set(threads.map((t) => t.arrowHead))

    expect(['straight', 'bezier', 'elbow'].filter((s) => !styles.has(s as Connection['style']))).toEqual([])
    expect(['none', 'arrow', 'dot', 'diamond'].filter((h) => !heads.has(h as Connection['arrowHead']))).toEqual([])
    expect(new Set(threads.map((t) => t.dashed))).toEqual(new Set([true, false]))
  })

  it('the per-item properties a person can change', () => {
    expect(items.some((i) => i.locked)).toBe(true)
    expect(items.some((i) => i.opacity < 1)).toBe(true)
    expect(items.some((i) => i.rotation !== 0)).toBe(true)
    expect(items.some((i) => i.tint)).toBe(true)
    expect(items.some((i) => i.link)).toBe(true)
    expect(items.some((i) => i.tags.length > 0)).toBe(true)
  })

  it('comment pins and source captures, anchored and free-standing', () => {
    const captures = items.filter((i) => meta(i).kind === 'source-capture')
    const sources = captures.map((i) => (meta(i).source ?? {}) as Record<string, unknown>)

    expect(items.some((i) => meta(i).kind === 'comment')).toBe(true)
    expect(captures.length).toBeGreaterThanOrEqual(2)
    expect(sources.some((s) => s.region && s.sourceItemId)).toBe(true)
    expect(sources.some((s) => !s.sourceItemId)).toBe(true)
  })

  it('board moods and bookmarks', () => {
    const moods = new Set(project.boards.map((board) => board.meta?.mood))
    const waystones = project.boards.flatMap((board) => (board.meta?.waystones ?? []) as unknown[])

    expect(moods.size).toBeGreaterThanOrEqual(4)
    expect(waystones.length).toBeGreaterThanOrEqual(2)
  })

  it('text alignment and a multi-swatch palette', () => {
    const aligns = new Set(items.filter((i) => i.type === 'text').map((i) => meta(i).align))
    const swatches = items.filter((i) => i.type === 'swatch')

    expect(aligns).toEqual(new Set(['left', 'center', 'right']))
    expect(swatches.length).toBeGreaterThanOrEqual(2)
    expect((meta(swatches[0]).colors as string[]).length).toBeGreaterThanOrEqual(4)
  })
})
