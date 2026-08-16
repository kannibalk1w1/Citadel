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

const VARIABLES: Record<CanvasColorName, string> = {
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
const FALLBACKS: Record<CanvasColorName, string> = {
  accent: '#c8a96e',
  accentSoft: 'rgba(200, 169, 110, 0.16)',
  accentDanger: '#8b2020',
  textPrimary: '#e8ddd0',
  textSecondary: '#b9ad9f',
  textMuted: '#81766a',
  textAccent: '#d2b47c',
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

let resolved: Record<CanvasColorName, string> = { ...FALLBACKS }

export function refreshCanvasColors(root: HTMLElement | null = typeof document === 'undefined' ? null : document.documentElement): Record<CanvasColorName, string> {
  if (!root || typeof getComputedStyle !== 'function') {
    resolved = { ...FALLBACKS }
    return resolved
  }

  const computed = getComputedStyle(root)
  const next = {} as Record<CanvasColorName, string>
  for (const name of Object.keys(VARIABLES) as CanvasColorName[]) {
    const value = computed.getPropertyValue(VARIABLES[name]).trim()
    next[name] = value || FALLBACKS[name]
  }
  resolved = next
  return resolved
}

export function canvasColor(name: CanvasColorName): string {
  return resolved[name]
}

export function canvasColors(): Record<CanvasColorName, string> {
  return resolved
}
