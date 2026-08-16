/**
 * The `document:extractText` wire contract.
 *
 * Kept in `src/types` and compiled by both the main and renderer projects so
 * the reason codes cannot drift apart: the main process is the only side that
 * reads a file, and the renderer is the only side that turns a reason into a
 * sentence a person sees.
 */

/**
 * The bounds an import is held to. They live in the contract because the main
 * process enforces them and the renderer has to state them to a person; two
 * copies of "25 MB" would eventually disagree.
 */
export const DOCUMENT_LIMITS = {
  /** Largest document opened at all. Bigger files are refused, not streamed. */
  maxBytes: 25 * 1024 * 1024,
  /** Characters kept on the canvas. The file on disk is never modified. */
  maxCharacters: 200_000,
  /** A zip bomb is small on disk, so wall-clock is the second bound. */
  timeoutMs: 15_000,
} as const

/**
 * What was read, not how it will be drawn. `markdown` arrives as its own
 * source text: Citadel does not render Markdown, and recording the format is
 * how a future renderer would find these items without guessing.
 */
export type DocumentFormat = 'docx' | 'markdown' | 'text'

/** What a file's name says it is. `doc` is listed only so it can be refused by name. */
export type PathFormat = DocumentFormat | 'doc'

/**
 * The one table of importable extensions. Main decides what it will open and
 * the renderer decides what it will hand over; those two answers have to be the
 * same one, or a file is either read twice or dropped in silence.
 */
export const DOCUMENT_EXTENSIONS: Record<string, PathFormat> = {
  docx: 'docx',
  doc: 'doc',
  md: 'markdown',
  markdown: 'markdown',
  txt: 'text',
  text: 'text',
}

/** Reads the format off a filename or a full path. */
export function documentFormatForFilename(filename: string): PathFormat | null {
  const extension = filename.split(/[\\/]/).pop()?.split('.').pop()?.toLowerCase() ?? ''
  return DOCUMENT_EXTENSIONS[extension] ?? null
}

export type DocumentFailureCode =
  | 'unsupported-format'
  /** A `.doc` by name: refused outright, never half-parsed. */
  | 'legacy-doc'
  /**
   * A `.docx` by name whose bytes are an OLE2 container. That is either a
   * legacy `.doc` renamed or a password-protected document; the two are not
   * worth telling apart, because the fix is to save an unprotected `.docx`.
   */
  | 'ole-container'
  | 'external-source'
  | 'missing'
  | 'too-large'
  /** A text file carrying bytes no text file has, so it is not decoded as text. */
  | 'binary'
  | 'unreadable'
  | 'empty'
  | 'timeout'

export type DocumentExtraction = {
  ok: true
  format: DocumentFormat
  /** The document's own path, unchanged. Citadel never writes to it. */
  sourcePath: string
  sourceName: string
  /** Plain text only — no styles, no HTML, no embedded objects. */
  text: string
  /** Characters found before any cap was applied. */
  characters: number
  words: number
  truncated: boolean
}

export type DocumentExtractionFailure = {
  ok: false
  code: DocumentFailureCode
  reason: string
}

export type DocumentExtractionResult = DocumentExtraction | DocumentExtractionFailure
