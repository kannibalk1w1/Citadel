import { describe, expect, it } from 'vitest'
import type { CanvasItem, Viewport } from '../../types'
import { tokenizeSnippet, tokensForLine, type CodeLanguage } from '../canvas/items/codeSnippet'
import { CODE_LANGUAGES } from '../canvas/items/codeSnippet'
import {
  clipTokens,
  codeCardExportLayout,
  isExportableCodeItem,
  paintCodeCard,
  paintCodeCardsForExport,
} from './codeCardExport'

const viewport: Viewport = { x: 0, y: 0, scale: 1 }

function codeItem(code: string, over: Partial<CanvasItem> = {}): CanvasItem {
  return {
    id: 'code-1', type: 'code', x: 0, y: 0, width: 500, height: 300,
    rotation: 0, zIndex: 1, locked: false, visible: true, opacity: 1, tags: [],
    meta: { language: 'typescript', code },
    ...over,
  }
}

/** Records the drawing calls a real 2D context would receive. */
function recordingContext() {
  const calls: { op: string; args: unknown[] }[] = []
  const state: Record<string, unknown> = {}
  const ctx = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'measureText') return (text: string) => ({ width: text.length * 7 })
      if (prop === 'calls') return calls
      if (prop in state) return state[prop]
      return (...args: unknown[]) => { calls.push({ op: prop, args }) }
    },
    set(_t, prop: string, value) { state[prop] = value; calls.push({ op: `set:${prop}`, args: [value] }); return true },
  }) as unknown as CanvasRenderingContext2D & { calls: { op: string; args: unknown[] }[] }
  return ctx
}

function drawnText(ctx: { calls: { op: string; args: unknown[] }[] }): string[] {
  return ctx.calls.filter((c) => c.op === 'fillText').map((c) => String(c.args[0]))
}

function numberedLines(count: number): string {
  return Array.from({ length: count }, (_, i) => `l${i}`).join('\n')
}

/** Largest snippet the default test card shows without truncating. */
function cardLineCapacity(): number {
  for (let n = 1; n <= 500; n += 1) {
    if (codeCardExportLayout(codeItem(numberedLines(n)), viewport)!.hiddenLineCount > 0) return n - 1
  }
  throw new Error('card never truncated')
}

describe('isExportableCodeItem', () => {
  it('accepts a visible code card', () => {
    expect(isExportableCodeItem(codeItem('a'))).toBe(true)
  })

  it('ignores other item types and hidden cards', () => {
    expect(isExportableCodeItem(codeItem('a', { type: 'image' }))).toBe(false)
    expect(isExportableCodeItem(codeItem('a', { visible: false }))).toBe(false)
  })
})

describe('clipTokens', () => {
  it('keeps a line that fits', () => {
    const tokens = tokensForLine('const a = 1', 'typescript')
    expect(clipTokens(tokens, 80)).toEqual({ tokens, clipped: false })
  })

  it('cuts mid-token and reports the cut', () => {
    const result = clipTokens(tokensForLine('const answer = 1', 'typescript'), 8)
    expect(result.clipped).toBe(true)
    expect(result.tokens.map((t) => t.text).join('')).toBe('const an')
  })

  it('preserves token kinds through the cut so colours survive', () => {
    const result = clipTokens(tokensForLine("const t = 'citadel-archive-name'", 'typescript'), 14)
    expect(result.tokens[0]).toEqual({ text: 'const', kind: 'keyword' })
    expect(result.clipped).toBe(true)
  })

  it('drops everything when there is no room at all', () => {
    expect(clipTokens(tokensForLine('const a = 1', 'typescript'), 0)).toEqual({ tokens: [], clipped: true })
  })

  it('does not claim a cut on an empty line with no room', () => {
    expect(clipTokens([], 0)).toEqual({ tokens: [], clipped: false })
  })
})

describe('codeCardExportLayout', () => {
  it('shows every line of a snippet that fits, numbered from one', () => {
    const layout = codeCardExportLayout(codeItem('const a = 1\nconst b = 2'), viewport)!

    expect(layout.lines.map((l) => l.number)).toEqual([1, 2])
    expect(layout.hiddenLineCount).toBe(0)
    expect(layout.language).toBe('typescript')
  })

  it('truncates a long snippet and reports what it hid', () => {
    const layout = codeCardExportLayout(codeItem(numberedLines(400)), viewport)!

    expect(layout.lines.length).toBeGreaterThan(0)
    expect(layout.lines.length).toBeLessThan(400)
    expect(layout.hiddenLineCount).toBe(400 - layout.lines.length)
  })

  // The "+N more lines" marker occupies a row, so it must not be written over a
  // line that would otherwise have been shown.
  it('gives the truncation marker its own row', () => {
    const capacity = cardLineCapacity()

    const exact = codeCardExportLayout(codeItem(numberedLines(capacity)), viewport)!
    expect(exact.lines.length).toBe(capacity)
    expect(exact.hiddenLineCount).toBe(0)

    // One line over: the last row goes to the marker, so two lines end up hidden.
    const over = codeCardExportLayout(codeItem(numberedLines(capacity + 1)), viewport)!
    expect(over.lines.length).toBe(capacity - 1)
    expect(over.hiddenLineCount).toBe(2)
  })

  it('accounts for every line it was given', () => {
    const layout = codeCardExportLayout(codeItem(numberedLines(400)), viewport)!
    expect(layout.lines.length + layout.hiddenLineCount).toBe(400)
  })

  it('marks a line that ran past the card', () => {
    const layout = codeCardExportLayout(codeItem('x'.repeat(4000)), viewport)!
    expect(layout.lines[0].clipped).toBe(true)
  })

  it('falls back to plaintext for an unknown language', () => {
    const item = codeItem('a', { meta: { language: 'elvish', code: 'a' } })
    expect(codeCardExportLayout(item, viewport)!.language).toBe('plaintext')
  })

  it('places the card through the same viewport transform the stage used', () => {
    const item = codeItem('a', { x: 10, y: 20 })
    const layout = codeCardExportLayout(item, { x: 5, y: 7, scale: 2 })!

    expect(layout.x).toBe(10 * 2 + 5)
    expect(layout.y).toBe(20 * 2 + 7)
    expect(layout.width).toBe(500 * 2)
  })

  it('multiplies through the device pixel ratio so it lands on the backing store', () => {
    const layout = codeCardExportLayout(codeItem('a', { x: 10 }), { x: 4, y: 0, scale: 2 }, 3)!

    expect(layout.x).toBe(10 * 2 * 3 + 4 * 3)
    expect(layout.width).toBe(500 * 2 * 3)
    expect(layout.fontPx).toBe(12 * 2 * 3)
  })

  // The card scales as a whole — box, header, font and line height together —
  // so a zoomed-out board exports the same snippet content, just smaller. The
  // export never silently drops lines because of the zoom the user happened to
  // be at when they hit export.
  it('shows the same lines whatever the board zoom was', () => {
    const code = numberedLines(400)
    const near = codeCardExportLayout(codeItem(code), { x: 0, y: 0, scale: 1 })!
    const far = codeCardExportLayout(codeItem(code), { x: 0, y: 0, scale: 0.25 })!

    expect(far.lines.map((l) => l.number)).toEqual(near.lines.map((l) => l.number))
    expect(far.hiddenLineCount).toBe(near.hiddenLineCount)
    expect(far.fontPx).toBeLessThan(near.fontPx)
  })

  // A short card has room for fewer lines than a tall one at the same zoom.
  it('shows fewer lines in a shorter card', () => {
    const code = numberedLines(400)
    const tall = codeCardExportLayout(codeItem(code, { height: 600 }), viewport)!
    const short = codeCardExportLayout(codeItem(code, { height: 200 }), viewport)!

    expect(short.lines.length).toBeLessThan(tall.lines.length)
  })

  it('returns nothing for a card with no area to draw into', () => {
    expect(codeCardExportLayout(codeItem('a', { width: 0 }), viewport)).toBeNull()
    expect(codeCardExportLayout(codeItem('a'), { x: 0, y: 0, scale: 0 })).toBeNull()
  })

  it('treats a card with no code as an empty snippet rather than failing', () => {
    const layout = codeCardExportLayout(codeItem('', { meta: { language: 'json' } }), viewport)!
    expect(layout.lines).toEqual([{ number: 1, tokens: [], clipped: false }])
    expect(layout.hiddenLineCount).toBe(0)
    expect(layout.language).toBe('json')
  })
})

describe('paintCodeCard', () => {
  it('draws the card identity: language, line numbers and code', () => {
    const ctx = recordingContext()
    paintCodeCard(ctx, codeCardExportLayout(codeItem("const title = 'Citadel'"), viewport)!)
    const text = drawnText(ctx)

    expect(text).toContain('TYPESCRIPT')
    expect(text).toContain('1')
    expect(text).toContain('const')
    expect(text.join(' ')).toContain('Citadel')
  })

  it('leaves interactive controls out of a still image', () => {
    const ctx = recordingContext()
    paintCodeCard(ctx, codeCardExportLayout(codeItem('const a = 1'), viewport)!)

    expect(drawnText(ctx).join(' ')).not.toMatch(/Copy/i)
  })

  it('says how many lines it could not show', () => {
    const ctx = recordingContext()
    paintCodeCard(ctx, codeCardExportLayout(codeItem(numberedLines(400)), viewport)!)

    expect(drawnText(ctx).some((t) => /^… \+\d+ more lines$/.test(t))).toBe(true)
  })

  it('confines its drawing to the card rect', () => {
    const ctx = recordingContext()
    paintCodeCard(ctx, codeCardExportLayout(codeItem('const a = 1'), viewport)!)

    expect(ctx.calls.some((c) => c.op === 'clip')).toBe(true)
  })
})

describe('paintCodeCardsForExport', () => {
  it('paints each code card and reports the count', () => {
    const ctx = recordingContext()
    const painted = paintCodeCardsForExport(ctx, [
      codeItem('const a = 1', { id: 'a' }),
      codeItem('const b = 2', { id: 'b', y: 400 }),
    ], viewport)

    expect(painted).toBe(2)
    expect(drawnText(ctx).join(' ')).toContain('const')
  })

  it('skips items that are not exportable code cards', () => {
    const ctx = recordingContext()
    const painted = paintCodeCardsForExport(ctx, [
      codeItem('a', { id: 'img', type: 'image' }),
      codeItem('a', { id: 'hidden', visible: false }),
    ], viewport)

    expect(painted).toBe(0)
  })

  it('carries the item opacity into the export', () => {
    const ctx = recordingContext()
    paintCodeCardsForExport(ctx, [codeItem('const a = 1', { opacity: 0.4 })], viewport)

    expect(ctx.calls.some((c) => c.op === 'set:globalAlpha' && c.args[0] === 0.4)).toBe(true)
  })
})

/**
 * The card and its exported still must colour the same snippet identically —
 * that is the whole reason the tokenizer is shared rather than reimplemented on
 * the export side.
 */
describe('live and export parity', () => {
  const samples: Record<string, string> = {
    typescript: "const n = 42 // sum\nconst s = 'x'",
    python: 'def run():\n    return None  # go',
    json: '{\n  "name": "Citadel",\n  "ok": true\n}',
    html: '<!-- note -->\n<a href="/x">t</a>',
    css: '@media screen {\n  color: #fff; /* c */\n}',
    bash: 'if [ -f x ]; then\n  echo "hi"  # check\nfi',
    sql: "SELECT * FROM t -- note\nWHERE n = 'a'",
    yaml: 'name: Citadel  # app\ncount: 12',
    plaintext: 'const x = 1 // not code',
  }

  it.each(CODE_LANGUAGES)('gives %s the same tokens on both sides', (language) => {
    const code = samples[language] ?? 'x'
    // The card renders tokenizeSnippet directly; the export layout must carry
    // those very tokens through, unclipped when the card is wide enough.
    const live = tokenizeSnippet(code, language as CodeLanguage)
    const layout = codeCardExportLayout(
      codeItem(code, { width: 1400, height: 600, meta: { language, code } }),
      viewport,
    )!

    expect(layout.lines).toHaveLength(live.length)
    layout.lines.forEach((exported, index) => {
      expect(exported.clipped, `${language} line ${index + 1} was clipped`).toBe(false)
      expect(exported.tokens).toEqual(live[index])
    })
  })

  it('carries the language through to the export, not a fixed default', () => {
    const code = '# comment'
    const asPython = codeCardExportLayout(codeItem(code, { meta: { language: 'python', code } }), viewport)!
    const asJson = codeCardExportLayout(codeItem(code, { meta: { language: 'json', code } }), viewport)!

    expect(asPython.lines[0].tokens[0].kind).toBe('comment')
    expect(asJson.lines[0].tokens[0].kind).toBe('plain')
  })

  // Block comments and template literals only read correctly with state carried
  // between lines, so the export must tokenize the snippet, not each line alone.
  it('keeps multi-line constructs coloured in the export', () => {
    const code = '/* one\ntwo */\nconst a = 1'
    const layout = codeCardExportLayout(codeItem(code, { meta: { language: 'typescript', code } }), viewport)!

    expect(layout.lines[1].tokens[0].kind).toBe('comment')
    expect(layout.lines[2].tokens.some((token) => token.kind === 'keyword')).toBe(true)
  })
})
