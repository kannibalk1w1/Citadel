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
  /** Largest `.docx` opened at all. Bigger files are refused, not streamed. */
  maxBytes: 25 * 1024 * 1024,
  /** Characters kept on the canvas. The file on disk is never modified. */
  maxCharacters: 200_000,
  /** A zip bomb is small on disk, so wall-clock is the second bound. */
  timeoutMs: 15_000,
} as const

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
  | 'unreadable'
  | 'empty'
  | 'timeout'

export type DocumentExtraction = {
  ok: true
  format: 'docx'
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
