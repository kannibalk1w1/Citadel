import type { DocumentRun, RichDocument } from '../../types/documents'

export type DocumentGlyphRun = DocumentRun & { x: number; y: number; width: number; fontSize: number; fontStyle: string }
export type DocumentMeasure = (text: string, size: number, style: string, code: boolean) => number

/** Wrap styled words in item-local canvas coordinates; stop at visible bounds. */
export function layoutRichDocument(document: RichDocument, width: number, height: number, baseSize: number, measure: DocumentMeasure, align = 'left', baseStyle = 'normal'): DocumentGlyphRun[] {
  const result: DocumentGlyphRun[] = []
  if (![width, height, baseSize].every(Number.isFinite) || width <= 0 || height <= 0 || baseSize <= 0) return result
  let y = 0
  for (const block of document.blocks) {
    const fontSize = baseSize * (block.type === 'heading' ? [1.8, 1.5, 1.3, 1.15, 1.05, 1][Math.max(0, (block.level || 1) - 1)] : 1)
    const lineHeight = fontSize * 1.35
    const indent = Math.min(width / 3, block.type === 'list' ? ((block.level ?? 0) + 1) * baseSize : block.type === 'quote' ? baseSize : 0)
    let x = indent
    let lineStart = result.length
    const finishLine = () => {
      const spare = Math.max(0, width - x)
      const shift = align === 'center' ? spare / 2 : align === 'right' ? spare : 0
      for (let i = lineStart; i < result.length; i++) result[i].x += shift
      y += lineHeight; x = indent; lineStart = result.length
    }
    const runs: DocumentRun[] = block.type === 'list'
      ? [{ text: block.ordered ? `${block.start ?? 1}. ` : '• ' }, ...block.runs]
      : block.type === 'quote' ? [{ text: '› ' }, ...block.runs] : block.runs
    for (const run of runs) {
      const fontStyle = [run.bold || block.type === 'heading' || baseStyle.includes('bold') ? 'bold' : '', run.italic || baseStyle.includes('italic') ? 'italic' : ''].filter(Boolean).join(' ') || 'normal'
      const code = !!run.code || block.type === 'code'
      for (const token of run.text.match(/\n|[^\S\n]+|[^\s]+/g) ?? []) {
        if (y + lineHeight > height || result.length >= 4000) return result
        if (token === '\n') { finishLine(); continue }
        let tokenWidth = measure(token, fontSize, fontStyle, code)
        if (x > indent && x + tokenWidth > width) finishLine()
        if (y + lineHeight > height) return result
        if (x === indent && /^\s+$/.test(token)) continue
        if (tokenWidth <= width - indent) {
          result.push({ ...run, code, text: token, x, y, width: tokenWidth, fontSize, fontStyle }); x += tokenWidth
        } else {
          // Iterate code points so a narrow item never tears a surrogate pair.
          for (const char of token) {
            tokenWidth = measure(char, fontSize, fontStyle, code)
            if (x > indent && x + tokenWidth > width) finishLine()
            if (y + lineHeight > height || result.length >= 4000) return result
            result.push({ ...run, code, text: char, x, y, width: tokenWidth, fontSize, fontStyle }); x += tokenWidth
          }
        }
      }
    }
    finishLine()
    y += baseSize * 0.45
    if (y >= height) break
  }
  return result
}
