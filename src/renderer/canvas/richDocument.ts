import type { RichDocument } from '../../types/documents'
import { DOCUMENT_LIMITS, parseDocumentMarkdown, readRichDocument, richDocumentMarkdown, richDocumentText, sliceDocumentText } from '../../types/documents'

/** Ignore stale rich metadata if an older editor/plugin changed plain content. */
export function itemRichDocument(meta: Record<string, unknown> | undefined): RichDocument | null {
  const document = readRichDocument(meta?.richDocument)
  return document && richDocumentText(document) === meta?.content ? document : null
}

export function documentEditorSource(meta: Record<string, unknown> | undefined): string {
  const document = itemRichDocument(meta)
  if (!document) return typeof meta?.content === 'string' ? meta.content : ''
  return typeof meta?.documentMarkdown === 'string' ? meta.documentMarkdown : richDocumentMarkdown(document)
}

/** Atomic content + formatting patch; caller records the entire meta in ITEM_STYLE. */
export function documentTextMetaPatch(meta: Record<string, unknown>, source: string): Record<string, unknown> {
  if (!itemRichDocument(meta)) return { content: source }
  if (source === documentEditorSource(meta)) return { content: meta.content, richDocument: meta.richDocument, documentMarkdown: source }
  const limited = sliceDocumentText(source, Math.max(DOCUMENT_LIMITS.maxCharacters, Math.min(DOCUMENT_LIMITS.maxMarkdownCharacters, documentEditorSource(meta).length)))
  const shortened = limited.length < source.length
  const markdown = shortened ? `${limited}\n\n[Citadel shortened this edit to 200,000 characters.]` : limited
  const richDocument = parseDocumentMarkdown(markdown)
  if (richDocumentText(richDocument).length > DOCUMENT_LIMITS.maxCharacters + 1024) {
    const plain = `${sliceDocumentText(richDocumentText(richDocument), DOCUMENT_LIMITS.maxCharacters)}\n\n[Citadel shortened this edit to 200,000 characters.]`
    const bounded: RichDocument = { version: 1, blocks: [{ type: 'paragraph', runs: [{ text: plain }] }] }
    return { content: plain, richDocument: bounded, documentMarkdown: richDocumentMarkdown(bounded), documentTruncated: true }
  }
  return { content: richDocumentText(richDocument), richDocument, documentMarkdown: markdown, ...(shortened ? { documentTruncated: true } : {}) }
}
