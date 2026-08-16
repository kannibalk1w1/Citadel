import type { CanvasItem, Viewport } from '../../types'
import {
  CODE_CARD_LAYOUT,
  gutterWidth,
  normalizeCodeLanguage,
  tokenizeSnippet,
  type Token,
} from '../canvas/items/codeSnippet'
import { canvasColors } from '../theme/canvasColors'

/**
 * Code cards are DOM-layer items. `prepareExportCanvas` captures the Konva stage
 * canvas, and the DOM overlay is a separate element that capture never sees, so
 * a board exported to PNG or PDF used to show an empty gap where every snippet
 * was. This repaints the card onto the export canvas with the 2D context.
 *
 * It is a still of the card, not the card: the Copy button is a control with no
 * meaning in a PNG, and it is left out rather than drawn as a dead pixel button.
 */

export type ExportCodeLine = {
  number: number
  tokens: Token[]
  /** True when the line ran past the card and was cut rather than wrapped. */
  clipped: boolean
}

export type CodeCardExportLayout = {
  language: string
  /** Card rect in destination-canvas pixels. */
  x: number
  y: number
  width: number
  height: number
  headerHeight: number
  fontPx: number
  lineHeight: number
  padX: number
  padY: number
  gutterWidth: number
  gutterGap: number
  lines: ExportCodeLine[]
  /** Lines that did not fit; 0 when the whole snippet is shown. */
  hiddenLineCount: number
}

const MONO_STACK = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"

/** Mono glyphs are ~0.6em wide; used to decide where a line stops fitting. */
const MONO_ADVANCE_RATIO = 0.6

export function isExportableCodeItem(item: CanvasItem): boolean {
  return item.type === 'code' && item.visible !== false
}

/**
 * Clips a tokenized line to a column budget, preserving token kinds so the
 * export keeps its colours. Matches the card, which sets `white-space: pre` and
 * hides the overflow — it never wraps — so the export cuts in the same place
 * rather than reflowing into a different shape.
 */
export function clipTokens(tokens: Token[], maxChars: number): { tokens: Token[]; clipped: boolean } {
  if (maxChars <= 0) return { tokens: [], clipped: tokens.length > 0 }
  let used = 0
  const out: Token[] = []
  for (const token of tokens) {
    if (used >= maxChars) return { tokens: out, clipped: true }
    const room = maxChars - used
    if (token.text.length <= room) {
      out.push(token)
      used += token.text.length
      continue
    }
    out.push({ ...token, text: token.text.slice(0, room) })
    return { tokens: out, clipped: true }
  }
  return { tokens: out, clipped: false }
}

/**
 * Works out what the card shows once it is drawn at `viewport` scale. Pure, so
 * the truncation rules are testable without a canvas.
 */
export function codeCardExportLayout(
  item: CanvasItem,
  viewport: Viewport,
  pixelRatio = 1,
): CodeCardExportLayout | null {
  const unit = viewport.scale * pixelRatio
  const width = item.width * unit
  const height = item.height * unit
  if (width <= 0 || height <= 0) return null

  const code = typeof item.meta?.code === 'string' ? item.meta.code : ''
  const language = normalizeCodeLanguage(item.meta?.language)
  // Same tokens the live card renders, so the still stays faithful to it.
  const allLines = tokenizeSnippet(code, language)

  const headerHeight = Math.min(CODE_CARD_LAYOUT.headerHeight * unit, height)
  const fontPx = CODE_CARD_LAYOUT.fontPx * unit
  const lineHeight = fontPx * CODE_CARD_LAYOUT.lineHeight
  const padX = CODE_CARD_LAYOUT.padX * unit
  const padY = CODE_CARD_LAYOUT.padY * unit
  const gutter = gutterWidth(allLines.length) * unit
  const gutterGap = CODE_CARD_LAYOUT.gutterGap * unit

  const bodyHeight = height - headerHeight - padY * 2
  const bodyWidth = width - padX * 2 - gutter
  const fitCount = lineHeight > 0 ? Math.floor(bodyHeight / lineHeight) : 0
  const visibleCount = Math.max(0, Math.min(allLines.length, fitCount))
  const hiddenLineCount = allLines.length - visibleCount

  // One line is surrendered to the "+N more" marker, so the marker never covers
  // a line that would otherwise have been readable.
  const shown = hiddenLineCount > 0 ? Math.max(0, visibleCount - 1) : visibleCount
  const hidden = allLines.length - shown

  const maxChars = fontPx > 0 ? Math.floor(bodyWidth / (fontPx * MONO_ADVANCE_RATIO)) : 0
  const lines: ExportCodeLine[] = allLines.slice(0, shown).map((lineTokens, index) => {
    const { tokens, clipped } = clipTokens(lineTokens, maxChars)
    return { number: index + 1, tokens, clipped }
  })

  return {
    language,
    x: item.x * viewport.scale * pixelRatio + viewport.x * pixelRatio,
    y: item.y * viewport.scale * pixelRatio + viewport.y * pixelRatio,
    width,
    height,
    headerHeight,
    fontPx,
    lineHeight,
    padX,
    padY,
    gutterWidth: gutter,
    gutterGap,
    lines,
    hiddenLineCount: hidden > 0 ? hidden : 0,
  }
}

const TOKEN_COLOR_KEYS = {
  plain: 'codeText',
  keyword: 'codeKeyword',
  string: 'codeString',
  number: 'codeNumber',
  comment: 'codeComment',
} as const

/** Paints one card. The context is expected to be in destination-canvas pixels. */
export function paintCodeCard(ctx: CanvasRenderingContext2D, layout: CodeCardExportLayout): void {
  const colors = canvasColors()
  const { x, y, width, height } = layout

  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.clip()

  ctx.fillStyle = colors.codeBg
  ctx.fillRect(x, y, width, height)

  ctx.fillStyle = colors.codeBgHeader
  ctx.fillRect(x, y, width, layout.headerHeight)

  ctx.strokeStyle = colors.codeBorder
  ctx.lineWidth = Math.max(1, layout.fontPx / 12)
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1)
  ctx.beginPath()
  ctx.moveTo(x, y + layout.headerHeight)
  ctx.lineTo(x + width, y + layout.headerHeight)
  ctx.stroke()

  // Header: the three terminal dots, then the language. Both identify the card
  // at a glance in a board-sized export where the code itself may be tiny.
  const dotR = Math.max(0.5, layout.fontPx * 0.29)
  const dotY = y + layout.headerHeight / 2
  const dotColors = [colors.codeAlert, colors.codeNumber, colors.codeString]
  dotColors.forEach((color, index) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x + layout.padX * 0.8 + dotR + index * dotR * 3, dotY, dotR, 0, Math.PI * 2)
    ctx.fill()
  })

  const headerFont = Math.max(1, layout.fontPx * 0.92)
  ctx.font = `${headerFont}px ${MONO_STACK}`
  ctx.textBaseline = 'middle'
  ctx.fillStyle = colors.codeTextDim
  ctx.fillText(
    layout.language.toUpperCase(),
    x + layout.padX * 0.8 + dotR * 8,
    dotY,
    Math.max(0, width - layout.padX * 2 - dotR * 8),
  )

  // Body
  ctx.font = `${layout.fontPx}px ${MONO_STACK}`
  ctx.textBaseline = 'top'
  const textLeft = x + layout.padX + layout.gutterWidth
  let lineY = y + layout.headerHeight + layout.padY

  for (const line of layout.lines) {
    ctx.fillStyle = colors.codeGutter
    ctx.textAlign = 'right'
    ctx.fillText(String(line.number), x + layout.padX + layout.gutterWidth - layout.gutterGap, lineY)

    ctx.textAlign = 'left'
    let cursor = textLeft
    for (const token of line.tokens) {
      ctx.fillStyle = colors[TOKEN_COLOR_KEYS[token.kind]]
      ctx.fillText(token.text, cursor, lineY)
      cursor += ctx.measureText(token.text).width
    }
    if (line.clipped) {
      ctx.fillStyle = colors.codeComment
      ctx.fillText('…', cursor, lineY)
    }
    lineY += layout.lineHeight
  }

  if (layout.hiddenLineCount > 0) {
    ctx.textAlign = 'left'
    ctx.fillStyle = colors.codeComment
    ctx.fillText(`… +${layout.hiddenLineCount} more lines`, textLeft, lineY)
  }

  ctx.restore()
}


/**
 * Paints every code card on the board onto an already-captured stage canvas.
 * Returns how many were drawn so callers (and tests) can tell the difference
 * between "no code cards" and "code cards silently skipped".
 */
export function paintCodeCardsForExport(
  ctx: CanvasRenderingContext2D,
  items: CanvasItem[],
  viewport: Viewport,
  pixelRatio = 1,
): number {
  let painted = 0
  for (const item of items) {
    if (!isExportableCodeItem(item)) continue
    const layout = codeCardExportLayout(item, viewport, pixelRatio)
    if (!layout) continue
    ctx.save()
    ctx.globalAlpha = item.opacity ?? 1
    paintCodeCard(ctx, layout)
    ctx.restore()
    painted += 1
  }
  return painted
}
