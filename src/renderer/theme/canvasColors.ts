// Resolved theme colours for the Konva layer.
//
// Konva paints to a 2D canvas context, and `ctx.strokeStyle = 'var(--accent)'`
// is an invalid assignment that the browser silently ignores — leaving the
// previous colour, usually black. So Konva shapes cannot take CSS variables the
// way DOM and SVG elements can, and canvas code hardcoded hex values instead.
// That is why the canvas never followed the theme.
//
// This resolves the variables once against the document element and hands the
// canvas real colour strings. `refreshCanvasColors()` re-reads them whenever the
// theme or a custom palette changes.

export type CanvasColorName =
  | 'accent'
  | 'accentSoft'
  | 'accentDanger'
  | 'textPrimary'
  | 'textSecondary'
  | 'textMuted'
  | 'textAccent'
  | 'bgCanvas'
  | 'bgPanel'
  | 'bgSunken'
  | 'border'
  | 'borderMuted'
  // Code snippet card. Needed on this side because image and PDF export paint
  // the card with the 2D context, which cannot read CSS variables either.
  | 'codeBg'
  | 'codeBgHeader'
  | 'codeBorder'
  | 'codeText'
  | 'codeTextDim'
  | 'codeGutter'
  | 'codeKeyword'
  | 'codeString'
  | 'codeNumber'
  | 'codeComment'
  | 'codeAlert'

export const CANVAS_COLOR_VARIABLES: Record<CanvasColorName, string> = {
  accent: '--accent',
  accentSoft: '--accent-soft',
  accentDanger: '--accent-danger',
  textPrimary: '--text-primary',
  textSecondary: '--text-secondary',
  textMuted: '--text-muted',
  textAccent: '--text-accent',
  bgCanvas: '--bg-canvas',
  bgPanel: '--bg-panel',
  bgSunken: '--bg-sunken',
  border: '--border',
  borderMuted: '--border-muted',
  codeBg: '--code-bg',
  codeBgHeader: '--code-bg-header',
  codeBorder: '--code-border',
  codeText: '--code-text',
  codeTextDim: '--code-text-dim',
  codeGutter: '--code-gutter',
  codeKeyword: '--code-keyword',
  codeString: '--code-string',
  codeNumber: '--code-number',
  codeComment: '--code-comment',
  codeAlert: '--code-alert',
}

// Used before styles resolve, and in tests without a document. These match
// dark.css so a missed refresh degrades to the shipped theme rather than black.
// canvasColors.test.ts parses dark.css and holds them to that, because they had
// already drifted once: the palette moved to a blue accent and this list kept
// handing out the old gold.
export const FALLBACKS: Record<CanvasColorName, string> = {
  accent: '#73a8db',
  accentSoft: 'rgba(115, 168, 219, 0.16)',
  accentDanger: '#d36472',
  textPrimary: '#e8ddd0',
  textSecondary: '#b9ad9f',
  textMuted: '#81766a',
  textAccent: '#9fc3e6',
  bgCanvas: '#0f0d0b',
  bgPanel: '#1d1813',
  bgSunken: '#0a0907',
  border: '#3a3025',
  borderMuted: '#292117',
  codeBg: '#11161f',
  codeBgHeader: '#18212d',
  codeBorder: '#2d3745',
  codeText: '#d8dee9',
  codeTextDim: '#aeb9c7',
  codeGutter: '#596779',
  codeKeyword: '#86b7ff',
  codeString: '#9fda95',
  codeNumber: '#e6bd8a',
  codeComment: '#7d899a',
  codeAlert: '#f07f7f',
}

// Type faces have the same problem as colours: `ctx.font = '16px var(--font-body)'`
// is an invalid assignment, so the context keeps whatever font it last had.
export type CanvasFontName = 'body' | 'mono' | 'display'

export const CANVAS_FONT_VARIABLES: Record<CanvasFontName, string> = {
  body: '--font-body',
  mono: '--font-mono',
  display: '--font-display',
}

// Matching dark.css, where the type faces are declared for every theme.
export const FONT_FALLBACKS: Record<CanvasFontName, string> = {
  body: "'Inter', 'DM Sans', sans-serif",
  mono: "'JetBrains Mono', monospace",
  display: "'Inter', 'DM Sans', sans-serif",
}

let resolved: Record<CanvasColorName, string> = { ...FALLBACKS }
let resolvedFonts: Record<CanvasFontName, string> = { ...FONT_FALLBACKS }

/**
 * Custom properties that are not in the fixed lists above, read out of saved
 * item data. Cached per token because a canvas redraw touches every shape, and
 * `getComputedStyle` per shape per frame is not free. Cleared on refresh.
 */
const tokenCache = new Map<string, string>()

const CSS_VAR = /^var\(\s*(--[a-z0-9_-]+)\s*\)$/i

function readVariable(token: string): string {
  const cached = tokenCache.get(token)
  if (cached !== undefined) return cached
  const value = typeof document === 'undefined' || typeof getComputedStyle !== 'function'
    ? ''
    : getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  tokenCache.set(token, value)
  return value
}

export function refreshCanvasColors(root: HTMLElement | null = typeof document === 'undefined' ? null : document.documentElement): Record<CanvasColorName, string> {
  tokenCache.clear()

  if (!root || typeof getComputedStyle !== 'function') {
    resolved = { ...FALLBACKS }
    resolvedFonts = { ...FONT_FALLBACKS }
    return resolved
  }

  const computed = getComputedStyle(root)
  const next = {} as Record<CanvasColorName, string>
  for (const name of Object.keys(CANVAS_COLOR_VARIABLES) as CanvasColorName[]) {
    const value = computed.getPropertyValue(CANVAS_COLOR_VARIABLES[name]).trim()
    next[name] = value || FALLBACKS[name]
  }
  resolved = next

  const nextFonts = {} as Record<CanvasFontName, string>
  for (const name of Object.keys(CANVAS_FONT_VARIABLES) as CanvasFontName[]) {
    const value = computed.getPropertyValue(CANVAS_FONT_VARIABLES[name]).trim()
    nextFonts[name] = value || FONT_FALLBACKS[name]
  }
  resolvedFonts = nextFonts

  return resolved
}

export function canvasColor(name: CanvasColorName): string {
  return resolved[name]
}

export function canvasColors(): Record<CanvasColorName, string> {
  return resolved
}

export function canvasFont(name: CanvasFontName): string {
  return resolvedFonts[name]
}

/**
 * Turns a colour held in item `meta` into something a 2D context accepts.
 *
 * Saved projects contain `var(--text-primary)` strings, because that is what
 * the text tool wrote for a long time, so this has to keep working rather than
 * be migrated away — a project file is the user's, and reopening one must not
 * silently repaint it. Named and literal colours pass straight through; only
 * `var()` needs resolving, and an unknown token falls back to the theme.
 */
export function resolveCanvasColor(value: unknown, fallback: CanvasColorName): string {
  if (typeof value !== 'string' || value.trim() === '') return canvasColor(fallback)
  const trimmed = value.trim()
  const match = CSS_VAR.exec(trimmed)
  if (!match) return trimmed
  return readVariable(match[1]) || canvasColor(fallback)
}

export function resolveCanvasFontFamily(value: unknown, fallback: CanvasFontName): string {
  if (typeof value !== 'string' || value.trim() === '') return canvasFont(fallback)
  const trimmed = value.trim()
  const match = CSS_VAR.exec(trimmed)
  if (!match) return trimmed
  return readVariable(match[1]) || canvasFont(fallback)
}

/**
 * Konva wants a number. Saved items may hold `'var(--text-xl)'`, which reaches
 * the context as `"var(--text-xl)px"` and is thrown away whole, taking the font
 * with it. The rhythm tokens are declared in px, so parsing the resolved value
 * gives the size the theme intended.
 */
export function resolveCanvasFontSize(value: unknown, fallback: number): number {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : fallback
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  const match = CSS_VAR.exec(trimmed)
  const raw = match ? readVariable(match[1]) : trimmed
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}
