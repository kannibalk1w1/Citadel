import type { DocumentBlock, DocumentRun, RichDocument } from '../types/documents'
import { DOCUMENT_LIMITS, safeDocumentLink, sliceDocumentText } from '../types/documents'

/** The small part of Mammoth's document tree that Citadel consumes. */
type WordNode = {
  type?: string
  children?: WordNode[]
  value?: string
  styleId?: string
  styleName?: string
  isBold?: boolean
  isItalic?: boolean
  href?: string
  numbering?: { level?: string; isOrdered?: boolean }
}

/** No HTML conversion, style-map interpretation, image reads, or link opening. */
export function richDocumentFromWord(root: WordNode): RichDocument {
  const blocks: DocumentBlock[] = []
  const listCounters = new Map<number, number>()
  const visitBlocks = (node: WordNode, depth: number) => {
    if (depth > 64) return
    if (node.type === 'paragraph') {
      const heading = /^(?:heading)\s*([1-6])$/i.exec(node.styleName ?? '')
        ?? /^(?:heading)\s*([1-6])$/i.exec(node.styleId ?? '')
      const block: DocumentBlock = { type: heading ? 'heading' : 'paragraph', runs: [] }
      if (heading) block.level = Number(heading[1])
      if (node.numbering) {
        block.type = 'list'
        block.level = Math.min(6, Math.max(0, Number.parseInt(node.numbering.level ?? '0') || 0))
        block.ordered = !!node.numbering.isOrdered
        for (const level of listCounters.keys()) if (level > block.level) listCounters.delete(level)
        if (block.ordered) {
          block.start = (listCounters.get(block.level) ?? 0) + 1
          listCounters.set(block.level, block.start)
        } else listCounters.delete(block.level)
      } else listCounters.clear()
      const visitRuns = (child: WordNode, marks: Omit<DocumentRun, 'text'>, level: number) => {
        if (level > 64) return
        if (child.type === 'image' || child.type === 'noteReference' || child.type === 'commentReference') return
        if (child.type === 'text' || child.type === 'tab' || child.type === 'break') {
          const text = child.type === 'text' ? child.value ?? '' : child.type === 'tab' ? '\t' : '\n'
          block.runs.push({ ...marks, text: text.replace(/\r\n?/g, '\n').replace(/[\u00a0\u2007\u202f]/g, ' ') })
          return
        }
        const href = child.type === 'hyperlink' ? safeDocumentLink(child.href) : undefined
        const next = { ...marks, ...(child.isBold ? { bold: true } : {}), ...(child.isItalic ? { italic: true } : {}), ...(href ? { href } : {}) }
        for (const entry of child.children ?? []) visitRuns(entry, next, level + 1)
      }
      for (const child of node.children ?? []) visitRuns(child, {}, 0)
      if (block.runs.some((run) => run.text.trim())) blocks.push(block)
      return
    }
    // Tables flatten in reading order. Embedded objects and notes are omitted.
    if (['document', 'table', 'tableRow', 'tableCell'].includes(node.type ?? '')) {
      for (const child of node.children ?? []) visitBlocks(child, depth + 1)
    }
  }
  visitBlocks(root, 0)
  return { version: 1, blocks }
}

/** Bound structural payload as well as text; a long tail flattens safely. */
export function capRichDocument(document: RichDocument, notice: string): { document: RichDocument; truncated: boolean } {
  let remaining: number = DOCUMENT_LIMITS.maxCharacters
  let runCount = 0
  let sourceBudget: number = DOCUMENT_LIMITS.maxMarkdownCharacters
  let truncated = false
  const blocks: DocumentBlock[] = []
  outer: for (const block of document.blocks) {
    sourceBudget -= 32
    const overhead = blocks.length ? 2 : 0
    remaining -= overhead + (block.type === 'list' ? (block.level ?? 0) * 2 + (block.ordered ? String(block.start ?? 1).length + 2 : 2) : 0)
    if (remaining < 0 || blocks.length >= 10000) { truncated = true; break }
    const next = { ...block, runs: [] as DocumentRun[] }
    blocks.push(next)
    for (const run of block.runs) {
      const text = sliceDocumentText(run.text, remaining)
      sourceBudget -= text.length * 2 + (run.href?.length ?? 0) + 16
      if (++runCount > 100000 || sourceBudget < 0) { truncated = true; break outer }
      next.runs.push({ ...run, text })
      remaining -= text.length
      if (text.length < run.text.length) { truncated = true; break outer }
    }
  }
  if (truncated) blocks.push({ type: 'paragraph', runs: [{ text: notice }] })
  return { document: { version: 1, blocks }, truncated }
}
