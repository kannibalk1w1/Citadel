import { promises as fsp } from 'fs'
import { basename, isAbsolute } from 'path'
import mammoth from 'mammoth'
import { DOCUMENT_LIMITS } from '../types/documents'
import type {
  DocumentExtractionFailure,
  DocumentExtractionResult,
  DocumentFailureCode,
} from '../types/documents'

/**
 * Word document text extraction, main process only.
 *
 * Scope is deliberately narrow: `.docx` in, plain text out. Mammoth is asked
 * for raw text rather than HTML, so nothing here interprets styles, images, or
 * embedded objects, and nothing is ever fetched — the only thing read is the
 * one local file path the renderer dropped. Legacy `.doc` is detected and
 * refused by name rather than half-parsed into nonsense.
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

/** `docx`, `doc`, or null for anything this module does not claim to read. */
export function documentFormatForPath(path: string): 'docx' | 'doc' | null {
  const extension = path.split(/[\\/]/).pop()?.split('.').pop()?.toLowerCase() ?? ''
  if (extension === 'docx') return 'docx'
  if (extension === 'doc') return 'doc'
  return null
}

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

export async function extractDocumentText(path: unknown): Promise<DocumentExtractionResult> {
  if (typeof path !== 'string' || path.trim() === '') {
    return fail('unsupported-format', 'No document path was given.')
  }
  if (isExternalSource(path)) {
    return fail('external-source', 'Citadel reads Word documents from local files only.')
  }
  if (!isAbsolute(path)) {
    return fail('external-source', 'A Word document must be given as a full local path.')
  }

  const format = documentFormatForPath(path)
  if (format === 'doc') {
    return fail('legacy-doc', 'Legacy .doc files are not supported. Save the file as .docx and import it again.')
  }
  if (format !== 'docx') {
    return fail('unsupported-format', 'Citadel imports Word documents in .docx format only.')
  }

  let size: number
  try {
    const stat = await fsp.stat(path)
    if (!stat.isFile()) return fail('missing', 'That path is not a file.')
    size = stat.size
  } catch {
    return fail('missing', 'The document could not be found.')
  }

  if (size === 0) return fail('unreadable', 'The document is empty.')
  if (size > DOCUMENT_LIMITS.maxBytes) {
    return fail('too-large', `The document is larger than ${Math.round(DOCUMENT_LIMITS.maxBytes / (1024 * 1024))} MB.`)
  }

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

  const capped = capDocumentText(normalized, DOCUMENT_LIMITS.maxCharacters)
  return {
    ok: true,
    format: 'docx',
    sourcePath: path,
    sourceName: basename(path),
    text: capped.text,
    characters: normalized.length,
    words: countWords(normalized),
    truncated: capped.truncated,
  }
}
