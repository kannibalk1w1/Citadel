import type { CanvasItem } from '../../types'
import { DOCUMENT_LIMITS, documentFormatForFilename } from '../../types/documents'
import type { DocumentExtraction, DocumentFailureCode, PathFormat } from '../../types/documents'

/**
 * Turning a dropped document into an ordinary canvas text item.
 *
 * Nothing here reads a file: `useFileDrop` hands the path to the main process
 * over `document:extractText` and passes the answer through these pure
 * functions. What lands on the canvas is a plain `text` item — the same one the
 * text tool makes — so editing, search, undo, export, and saving need no
 * document-specific code anywhere else. The document's path stays on `src` so
 * the origin survives the import and the original file is bundled by
 * `.citadelz` export, and a few `document*` meta fields record what was
 * imported. Markdown arrives as its own source text; nothing renders it.
 */

export const DOCUMENT_ITEM_LAYOUT = {
  width: 480,
  fontSize: 16,
  lineHeight: 20,
  padding: 16,
  minHeight: 120,
  maxHeight: 640,
  /** Rough average glyph width at the item's font size, for the height guess. */
  charWidth: 8,
} as const

/**
 * What a dropped file claims to be. `doc` is recognised here so the drop can be
 * refused in the interface without troubling the main process for a file it
 * would only refuse as well.
 */
export function documentDropFormat(filename: string): PathFormat | null {
  return documentFormatForFilename(filename)
}

/**
 * A first size for the item, from a wrapped-line estimate. It is only a
 * starting point: the item carries normal resize handles the moment it lands.
 */
export function documentItemHeight(text: string): number {
  const charsPerLine = Math.max(1, Math.floor(DOCUMENT_ITEM_LAYOUT.width / DOCUMENT_ITEM_LAYOUT.charWidth))
  const lines = text.split('\n').reduce(
    (total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)),
    0,
  )
  const height = lines * DOCUMENT_ITEM_LAYOUT.lineHeight + DOCUMENT_ITEM_LAYOUT.padding
  return Math.min(DOCUMENT_ITEM_LAYOUT.maxHeight, Math.max(DOCUMENT_ITEM_LAYOUT.minHeight, Math.round(height)))
}

export type DocumentItemPlacement = {
  id: string
  dropX: number
  dropY: number
  /** Position in the drop batch, so several files do not land on one spot. */
  offsetIndex: number
  stackOffset: number
  zIndex: number
}

export function buildDocumentItem(extraction: DocumentExtraction, placement: DocumentItemPlacement): CanvasItem {
  const width = DOCUMENT_ITEM_LAYOUT.width
  const height = documentItemHeight(extraction.text)
  const shift = placement.offsetIndex * placement.stackOffset

  return {
    id: placement.id,
    type: 'text',
    x: placement.dropX - width / 2 + shift,
    y: placement.dropY - height / 2 + shift,
    width,
    height,
    rotation: 0,
    zIndex: placement.zIndex,
    locked: false,
    visible: true,
    opacity: 1,
    tags: [],
    // The document itself, still where its owner keeps it.
    src: extraction.sourcePath,
    meta: {
      content: extraction.text,
      fontSize: DOCUMENT_ITEM_LAYOUT.fontSize,
      color: 'var(--text-primary)',
      align: 'left',
      documentFormat: extraction.format,
      documentName: extraction.sourceName,
      documentCharacters: extraction.characters,
      documentWords: extraction.words,
      documentTruncated: extraction.truncated,
    },
  }
}

export function documentImportedMessage(extraction: DocumentExtraction): string {
  if (extraction.truncated) {
    return `${extraction.sourceName} imported as text, shortened to fit. The original file is unchanged.`
  }
  // Said once, at the moment it could mislead: a dropped .md is its own source,
  // not a rendered page, and the item shows exactly what the file holds.
  if (extraction.format === 'markdown') {
    return `${extraction.sourceName} imported as Markdown source text — Citadel does not render Markdown.`
  }
  return `${extraction.sourceName} imported as text`
}

/**
 * One sentence per reason, each naming the file and, where there is one, the
 * step that would actually fix it. A dropped document never disappears without
 * one of these.
 */
export function documentImportFailureMessage(filename: string, code: DocumentFailureCode): string {
  const isWord = documentFormatForFilename(filename) === 'docx'

  switch (code) {
    case 'legacy-doc':
      return `${filename} is a legacy Word file. Citadel imports .docx only — open it in Word and save as .docx, then drop it again.`
    case 'ole-container':
      return `${filename} is either a legacy .doc renamed or a password-protected document. Save it as an unprotected .docx and drop it again.`
    case 'unsupported-format':
      return `${filename} is not a document Citadel imports. It reads .docx, .md, and .txt.`
    case 'external-source':
      return `Citadel imports documents from local files only, so ${filename} was not imported.`
    case 'missing':
      return `${filename} could not be found, so nothing was imported.`
    case 'too-large':
      return `${filename} is larger than ${Math.round(DOCUMENT_LIMITS.maxBytes / (1024 * 1024))} MB, so Citadel did not import it.`
    case 'binary':
      return `${filename} is not a text file, whatever its name says, so Citadel did not import it.`
    case 'unreadable':
      return isWord
        ? `${filename} could not be read as a Word document. It may be damaged.`
        : `${filename} could not be read. It may be damaged or in use by another program.`
    case 'empty':
      return `${filename} has no text to import.`
    case 'timeout':
      return `${filename} took too long to read, so Citadel stopped.`
    default:
      return `${filename} could not be imported.`
  }
}
