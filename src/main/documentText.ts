import { promises as fsp } from 'fs'
import { basename, isAbsolute } from 'path'
import mammoth from 'mammoth'
import { DOCUMENT_LIMITS, documentFormatForFilename } from '../types/documents'
import type {
  DocumentExtractionFailure,
  DocumentExtractionResult,
  DocumentFailureCode,
  DocumentFormat,
} from '../types/documents'

/**
 * Document text extraction, main process only.
 *
 * Scope is deliberately narrow: `.docx`, `.md`, and `.txt` in, plain text out.
 * Mammoth is asked for raw text rather than HTML, Markdown is kept as its own
 * source rather than rendered, and nothing is ever fetched — the only thing
 * read is the one local file path the renderer dropped. Legacy `.doc` is
 * detected and refused by name rather than half-parsed into nonsense.
 */

function groupDigits(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Appended when a document is longer than the cap, so a partial import can
 * never look complete. It is ordinary editable text: anyone who does not want
 * the line can delete it, and the file on disk still holds everything.
 */
export function truncationNotice(maxCharacters: number): string {
  return `[Citadel imported the first ${groupDigits(maxCharacters)} characters of this document. The original file is unchanged.]`
}

export const TRUNCATION_NOTICE = truncationNotice(DOCUMENT_LIMITS.maxCharacters)

/** The first bytes of an OLE2 compound file — every pre-2007 `.doc`. */
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]

export function isLegacyDocHeader(header: Uint8Array): boolean {
  if (header.length < OLE_MAGIC.length) return false
  return OLE_MAGIC.every((byte, index) => header[index] === byte)
}

/** Re-exported so this module reads as one piece; the table itself is shared. */
export const documentFormatForPath = documentFormatForFilename

/**
 * True for anything carrying a URL scheme — `http:`, `file:`, `data:`. A
 * Windows drive letter is one character before the colon and a scheme is never
 * shorter than two, which is what keeps `C:\Docs\report.docx` a local path.
 */
export function isExternalSource(path: string): boolean {
  return /^[a-z][a-z0-9+.-]+:/i.test(path)
}

/**
 * Word emits `\r\n`, hard page breaks, and long runs of empty paragraphs.
 * Collapsing those keeps an imported document readable in a canvas text item
 * without rewriting the words themselves.
 */
export function normalizeDocumentText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/[^\S\n]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * A `.md` or `.txt` file is already text, so it arrives as written. Only line
 * endings are normalised and the trailing newline is trimmed: collapsing blank
 * runs or stripping trailing spaces would edit Markdown's own meaning — two
 * trailing spaces are a hard line break, and blank lines separate blocks.
 */
export function normalizePlainText(raw: string): string {
  return raw.replace(/\r\n?/g, '\n').replace(/\s+$/, '')
}

/**
 * Decodes a text file the way the editor that wrote it meant. Notepad's
 * "Unicode" save is UTF-16 with a byte-order mark, and reading that as UTF-8
 * would produce either mojibake or a false "this is binary" refusal.
 */
export function decodeTextBuffer(buffer: Buffer): string {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString('utf16le')
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    // Node decodes little-endian only, so byte-swap a copy first.
    return Buffer.from(buffer.subarray(2)).swap16().toString('utf16le')
  }
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.subarray(3).toString('utf8')
  }
  return buffer.toString('utf8')
}

/**
 * True for content no text file has. A NUL byte settles it outright; otherwise
 * a scattering of replacement characters means the bytes were not the encoding
 * they claimed, and pasting that onto a canvas would help nobody.
 */
export function looksBinary(text: string): boolean {
  if (text.includes('\u0000')) return true
  if (text.length === 0) return false
  const replacements = text.match(/\ufffd/g)?.length ?? 0
  return replacements > 0 && replacements / text.length > 0.01
}

export function capDocumentText(text: string, maxCharacters: number): { text: string; truncated: boolean } {
  if (text.length <= maxCharacters) return { text, truncated: false }
  return { text: `${text.slice(0, maxCharacters).trimEnd()}\n\n${truncationNotice(maxCharacters)}`, truncated: true }
}

export function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

function fail(code: DocumentFailureCode, reason: string): DocumentExtractionFailure {
  return { ok: false, code, reason }
}

/** Mammoth cannot be cancelled, so the race only bounds what the caller waits for. */
function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    work,
    new Promise<never>((_resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs)
      // Never hold the process open just to fail a document later.
      timer.unref?.()
    }),
  ])
}

/** The one place a successful result is shaped, so every format reports alike. */
function succeed(path: string, format: DocumentFormat, normalized: string): DocumentExtractionResult {
  const capped = capDocumentText(normalized, DOCUMENT_LIMITS.maxCharacters)
  return {
    ok: true,
    format,
    sourcePath: path,
    sourceName: basename(path),
    text: capped.text,
    characters: normalized.length,
    words: countWords(normalized),
    truncated: capped.truncated,
  }
}

async function readWordDocument(path: string): Promise<DocumentExtractionResult> {
  // A readable .docx is a zip. An OLE2 container under a .docx name is either a
  // renamed legacy .doc or a password-protected document — both are named for
  // what they are rather than reported as damage, because the fix is the same.
  try {
    const handle = await fsp.open(path, 'r')
    try {
      const header = new Uint8Array(OLE_MAGIC.length)
      await handle.read(header, 0, header.length, 0)
      if (isLegacyDocHeader(header)) {
        return fail('ole-container', 'This file is a legacy .doc or a password-protected document, not a readable .docx.')
      }
    } finally {
      await handle.close()
    }
  } catch {
    return fail('unreadable', 'The document could not be opened.')
  }

  let raw: string
  try {
    const result = await withTimeout(mammoth.extractRawText({ path }), DOCUMENT_LIMITS.timeoutMs)
    raw = typeof result?.value === 'string' ? result.value : ''
  } catch (error) {
    if (error instanceof Error && error.message === 'timeout') {
      return fail('timeout', 'The document took too long to read.')
    }
    return fail('unreadable', 'The document could not be read as a .docx file. It may be damaged.')
  }

  const normalized = normalizeDocumentText(raw)
  if (!normalized) return fail('empty', 'The document has no text to import.')
  return succeed(path, 'docx', normalized)
}

/**
 * `.md` and `.txt` need no parser — reading them is the whole job. They are
 * still read here rather than in the renderer, because the renderer has no
 * filesystem, and they are still held to the same bounds as a Word document.
 */
async function readPlainTextDocument(path: string, format: DocumentFormat): Promise<DocumentExtractionResult> {
  let buffer: Buffer
  try {
    buffer = await withTimeout(fsp.readFile(path), DOCUMENT_LIMITS.timeoutMs)
  } catch (error) {
    if (error instanceof Error && error.message === 'timeout') {
      return fail('timeout', 'The document took too long to read.')
    }
    return fail('unreadable', 'The document could not be opened.')
  }

  const decoded = decodeTextBuffer(buffer)
  if (looksBinary(decoded)) {
    return fail('binary', 'That file is not text, whatever its name says.')
  }

  const normalized = normalizePlainText(decoded)
  if (!normalized) return fail('empty', 'The document has no text to import.')
  return succeed(path, format, normalized)
}

export async function extractDocumentText(path: unknown): Promise<DocumentExtractionResult> {
  if (typeof path !== 'string' || path.trim() === '') {
    return fail('unsupported-format', 'No document path was given.')
  }
  if (isExternalSource(path)) {
    return fail('external-source', 'Citadel reads documents from local files only.')
  }
  if (!isAbsolute(path)) {
    return fail('external-source', 'A document must be given as a full local path.')
  }

  const format = documentFormatForPath(path)
  if (format === 'doc') {
    return fail('legacy-doc', 'Legacy .doc files are not supported. Save the file as .docx and import it again.')
  }
  if (format === null) {
    return fail('unsupported-format', 'Citadel imports .docx, .md, and .txt documents.')
  }

  let size: number
  try {
    const stat = await fsp.stat(path)
    if (!stat.isFile()) return fail('missing', 'That path is not a file.')
    size = stat.size
  } catch {
    return fail('missing', 'The document could not be found.')
  }

  if (size > DOCUMENT_LIMITS.maxBytes) {
    return fail('too-large', `The document is larger than ${Math.round(DOCUMENT_LIMITS.maxBytes / (1024 * 1024))} MB.`)
  }
  // An empty text file is empty; an empty .docx is not a zip at all.
  if (size === 0) {
    return format === 'docx'
      ? fail('unreadable', 'The document is empty.')
      : fail('empty', 'The document has no text to import.')
  }

  return format === 'docx' ? readWordDocument(path) : readPlainTextDocument(path, format)
}
