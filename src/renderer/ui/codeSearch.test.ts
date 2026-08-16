import { describe, expect, it } from 'vitest'
import type { CanvasBoard, CanvasItem } from '../../types'
import {
  buildSearchResult,
  CODE_SEARCH_LIMITS,
  getArchiveIndexResults,
  getIndexResults,
  getSearchResults,
  groupSearchResults,
  resultBadgeLabel,
} from './itemSearchModel'

function codeItem(code: string, over: Partial<CanvasItem> = {}): CanvasItem {
  return {
    id: 'code-abc123', type: 'code', x: 0, y: 0, width: 400, height: 300,
    rotation: 0, zIndex: 1, locked: false, visible: true, opacity: 1, tags: [],
    meta: { language: 'typescript', code },
    ...over,
  }
}

function plainItem(over: Partial<CanvasItem> = {}): CanvasItem {
  return {
    id: 'image-1', type: 'image', x: 0, y: 0, width: 100, height: 100,
    rotation: 0, zIndex: 1, locked: false, visible: true, opacity: 1, tags: [],
    src: 'refs/study.png',
    ...over,
  }
}

const SNIPPET = "// header note\nconst secretHandshake = 'hello'\nexport default secretHandshake"

describe('searching code content', () => {
  it('finds a snippet by text inside it', () => {
    expect(getSearchResults([codeItem(SNIPPET)], 'secrethandshake').map((r) => r.id)).toEqual(['code-abc123'])
  })

  it('finds a snippet by its selected language', () => {
    expect(getSearchResults([codeItem(SNIPPET)], 'typescript')).toHaveLength(1)
    expect(getSearchResults([codeItem(SNIPPET, { meta: { language: 'python', code: SNIPPET } })], 'typescript')).toHaveLength(0)
  })

  it('matches the language by its display name too', () => {
    const item = codeItem('x = 1', { meta: { language: 'json', code: 'x = 1' } })
    expect(getSearchResults([item], 'json')).toHaveLength(1)
  })

  it('is case-insensitive, like the rest of search', () => {
    expect(getSearchResults([codeItem(SNIPPET)], 'SECRETHANDSHAKE')).toHaveLength(1)
  })

  it('works through the existing type filter', () => {
    const items = [codeItem(SNIPPET), plainItem()]
    expect(getSearchResults(items, 'type:code').map((r) => r.id)).toEqual(['code-abc123'])
  })

  it('works through the existing tag filter', () => {
    const items = [codeItem(SNIPPET, { tags: ['shader'] })]
    expect(getSearchResults(items, 'tag:shader')).toHaveLength(1)
    expect(getSearchResults(items, 'tag:other')).toHaveLength(0)
  })

  it('finds nothing for text that is not in the snippet', () => {
    expect(getSearchResults([codeItem(SNIPPET)], 'nowhere')).toHaveLength(0)
  })
})

describe('code result context', () => {
  it('leads with Code and the language, written the way the language is', () => {
    expect(buildSearchResult(codeItem(SNIPPET)).detail).toContain('Code · TypeScript')
    const json = codeItem('{}', { meta: { language: 'json', code: '{}' } })
    expect(buildSearchResult(json).detail).toContain('Code · JSON')
  })

  it('names the snippet by its first line rather than an id', () => {
    const result = buildSearchResult(codeItem(SNIPPET))
    expect(result.label).toBe('// header note')
    expect(result.label).not.toContain(result.item.id)
  })

  it('never exposes the implementation id in what a person reads', () => {
    const result = buildSearchResult(codeItem(SNIPPET))
    expect(`${result.label} ${result.detail}`).not.toContain('code-abc123')
  })

  it('shows the line the query matched, not just the first line', () => {
    const [result] = getSearchResults([codeItem(SNIPPET)], 'export default')
    expect(result.detail).toContain('export default secretHandshake')
    expect(result.detail).not.toContain('// header note')
  })

  it('reports the size of the snippet', () => {
    expect(buildSearchResult(codeItem(SNIPPET)).detail).toContain('3 lines')
    expect(buildSearchResult(codeItem('one')).detail).toContain('1 line')
  })

  it('badges a code result with its language', () => {
    expect(resultBadgeLabel(buildSearchResult(codeItem(SNIPPET)))).toBe('typescript')
  })

  it('still badges by tags when the snippet has them', () => {
    expect(resultBadgeLabel(buildSearchResult(codeItem(SNIPPET, { tags: ['a'] })))).toBe('1 tag')
  })
})

describe('empty and oversized snippets', () => {
  it('names an empty card by its language instead of going blank', () => {
    const result = buildSearchResult(codeItem('', { meta: { language: 'python', code: '' } }))
    expect(result.label).toBe('Python snippet')
    expect(result.detail).toContain('empty')
  })

  it('survives a card with no code metadata at all', () => {
    const result = buildSearchResult(codeItem('', { meta: {} }))
    expect(result.label).toBe('Plain text snippet')
    expect(() => getSearchResults([codeItem('', { meta: {} })], 'anything')).not.toThrow()
  })

  it('skips blank leading lines when naming the snippet', () => {
    expect(buildSearchResult(codeItem('\n\n   \nreal line')).label).toBe('real line')
  })

  // A result row is a summary, never a place a whole snippet can be dumped.
  it('caps the excerpt however long the matched line is', () => {
    const long = `const a = '${'x'.repeat(500)}'`
    const detail = buildSearchResult(codeItem(long)).detail
    const excerpt = detail.split('  |  ').at(-1)!

    expect(excerpt.length).toBeLessThanOrEqual(CODE_SEARCH_LIMITS.excerptChars)
    expect(excerpt.endsWith('…')).toBe(true)
  })

  it('collapses whitespace so an indented match stays one tidy line', () => {
    const detail = buildSearchResult(codeItem('        deeply\t\tindented')).detail
    expect(detail).toContain('deeply indented')
  })

  it('indexes only a bounded prefix of a very large snippet', () => {
    const filler = 'a'.repeat(CODE_SEARCH_LIMITS.haystackChars)
    const item = codeItem(`${filler}\nneedleBeyondTheCap`)

    expect(getSearchResults([item], 'needlebeyondthecap')).toHaveLength(0)
    // The prefix is still fully searchable, and nothing was lost from the card.
    expect(getSearchResults([item], 'aaaa')).toHaveLength(1)
    expect(item.meta!.code).toContain('needleBeyondTheCap')
  })

  it('handles a large snippet without falling over', () => {
    const big = Array.from({ length: 5000 }, (_, i) => `line ${i}`).join('\n')
    expect(getSearchResults([codeItem(big)], 'line 42')).toHaveLength(1)
  })
})

describe('display grouping', () => {
  // The search panel renders groups only, so an ungrouped result is invisible
  // no matter how well it matched.
  it('puts a code result in a group so it can be rendered at all', () => {
    const groups = groupSearchResults([buildSearchResult(codeItem(SNIPPET))])
    const withResults = groups.filter((group) => group.results.length > 0)

    expect(withResults.map((group) => group.id)).toEqual(['code'])
    expect(withResults[0].title).toBe('Code')
  })

  it('also lists a tagged snippet under Tags, as any tagged item is', () => {
    const groups = groupSearchResults([buildSearchResult(codeItem(SNIPPET, { tags: ['shader'] }))])
    expect(groups.filter((g) => g.results.length).map((g) => g.id)).toEqual(['code', 'sigils'])
  })

  it('leaves the other groups exactly as they were', () => {
    const groups = groupSearchResults([buildSearchResult(plainItem())])
    expect(groups.filter((g) => g.results.length).map((g) => g.id)).toEqual(['relics'])
  })
})

describe('board filters and multi-board search', () => {
  const board = (id: string, name: string, items: CanvasItem[]): CanvasBoard =>
    ({ id, name, items, connections: [], viewport: { x: 0, y: 0, scale: 1 } })

  const boards = [
    board('b1', 'Shaders', [codeItem(SNIPPET, { id: 'code-1' })]),
    board('b2', 'Vault', [codeItem('const other = 1', { id: 'code-2' })]),
  ]

  it('finds snippets on every board, active board first', () => {
    const results = getArchiveIndexResults(boards, 'b2', 'const')
    expect(results.map((r) => r.id)).toEqual(['code-2', 'code-1'])
  })

  it('honours the board filter', () => {
    expect(getArchiveIndexResults(boards, 'b1', 'board:vault const').map((r) => r.id)).toEqual(['code-2'])
  })

  it('carries board context into a dormant board result', () => {
    const [, dormant] = getArchiveIndexResults(boards, 'b2', 'const')
    expect(dormant.detail).toContain('board: Shaders')
    expect(dormant.detail).toContain('Code · TypeScript')
  })

  it('keeps the matched line when a result travels from another board', () => {
    const [dormant] = getArchiveIndexResults(boards, 'b2', 'secretHandshake')
    expect(dormant.chamber?.name).toBe('Shaders')
    expect(dormant.detail).toContain("const secretHandshake = 'hello'")
  })
})

describe('regression safety for other item types', () => {
  const items = [
    plainItem({ id: 'img', tags: ['ref'] }),
    { ...plainItem({ id: 'note' }), type: 'sticky' as const, src: undefined, meta: { content: 'a written note' } },
    codeItem(SNIPPET, { id: 'code' }),
  ]

  it('leaves image results reading as they did', () => {
    const result = getSearchResults(items, 'study').find((r) => r.id === 'img')!
    expect(result.label).toBe('study.png')
    expect(result.detail).toContain('item: image')
  })

  it('leaves note results reading as they did', () => {
    const result = getSearchResults(items, 'written').find((r) => r.id === 'note')!
    expect(result.label).toBe('a written note')
    expect(result.detail).toContain('note: sticky')
  })

  it('does not let a code query drag in unrelated items', () => {
    expect(getSearchResults(items, 'secrethandshake').map((r) => r.id)).toEqual(['code'])
  })

  it('keeps connections searchable alongside code', () => {
    const connections = [{
      id: 'conn-1', fromId: 'img', toId: 'code', fromAnchor: 'auto' as const, toAnchor: 'auto' as const,
      style: 'bezier' as const, color: '#fff', width: 2, arrowHead: 'arrow' as const, dashed: false, label: 'derives',
    }]
    const results = getIndexResults(items, connections, 'derives')
    expect(results.map((r) => r.id)).toEqual(['conn-1'])
  })
})
