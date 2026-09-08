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
  /** Markdown may add escaping and link destinations to the plain-text budget. */
  maxMarkdownCharacters: 1_000_000,
  /** A zip bomb is small on disk, so wall-clock is the second bound. */
  timeoutMs: 15_000,
} as const

/**
 * What was read, not how it will be drawn. `markdown` arrives as its own
 * source text alongside safe structured formatting; no HTML crosses IPC.
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
  /** Plain-text projection for search and ordinary exports. */
  text: string
  /** Optional for compatibility with older extraction responses and projects. */
  richDocument?: RichDocument
  markdown?: string
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

/** A deliberately small data format, never HTML or executable markup. */
export type DocumentRun = { text: string; bold?: boolean; italic?: boolean; code?: boolean; href?: string }
export type DocumentBlock = {
  type: 'paragraph' | 'heading' | 'list' | 'quote' | 'code'
  runs: DocumentRun[]
  level?: number
  ordered?: boolean
  start?: number
}
export type RichDocument = { version: 1; blocks: DocumentBlock[] }

/** Only inert, explicit web/mail destinations survive; nothing is fetched. */
export function safeDocumentLink(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2048 || /[\s<>"\\\u0000-\u001f]/.test(value)) return undefined
  if (!/^(https?:\/\/|mailto:)/i.test(value)) return undefined
  try {
    const url = new URL(value)
    if ((url.protocol === 'http:' || url.protocol === 'https:') && !url.hostname) return undefined
    return value
  } catch { return undefined }
}

/** Avoid leaving half of an astral character at any import/edit boundary. */
export function sliceDocumentText(text: string, limit: number): string {
  const end = Math.max(0, Math.floor(limit))
  const cut = text.slice(0, end)
  return /[\ud800-\udbff]$/.test(cut) ? cut.slice(0, -1) : cut
}

export function richDocumentText(document: RichDocument): string {
  return document.blocks.map((block) => {
    const text = block.runs.map((run) => run.text).join('')
    if (block.type === 'list') return `${'  '.repeat(block.level ?? 0)}${block.ordered ? `${block.start ?? 1}.` : '•'} ${text}`
    return text
  }).join('\n\n')
}

/** Read persisted metadata defensively; old/plain items have no rich payload. */
export function readRichDocument(value: unknown): RichDocument | null {
  if (!value || typeof value !== 'object') return null
  const doc = value as RichDocument
  if (doc.version !== 1 || !Array.isArray(doc.blocks) || doc.blocks.length > 10001) return null
  let size = 0
  let runs = 0
  for (const block of doc.blocks) {
    if (!block || !['paragraph', 'heading', 'list', 'quote', 'code'].includes(block.type) || !Array.isArray(block.runs)) return null
    if (block.ordered !== undefined && typeof block.ordered !== 'boolean') return null
    if (block.level !== undefined && (!Number.isInteger(block.level) || block.level < 0 || block.level > 6)) return null
    if (block.start !== undefined && (!Number.isInteger(block.start) || block.start < 1 || block.start > 999999999)) return null
    for (const run of block.runs) {
      if (!run || typeof run.text !== 'string') return null
      size += run.text.length
      runs++
      if (size > DOCUMENT_LIMITS.maxCharacters + 1024 || runs > 100001) return null
      if (run.href !== undefined && safeDocumentLink(run.href) !== run.href) return null
      if (['bold', 'italic', 'code'].some((key) => run[key as keyof DocumentRun] !== undefined && typeof run[key as keyof DocumentRun] !== 'boolean')) return null
    }
  }
  return doc
}

function pushDocumentRun(runs: DocumentRun[], run: DocumentRun): void {
  if (!run.text) return
  const last = runs[runs.length - 1]
  if (last && last.bold === run.bold && last.italic === run.italic && last.code === run.code && last.href === run.href) last.text += run.text
  else runs.push(run)
}

/** Bounded inline subset. Raw HTML stays literal text, including script tags. */
export function parseDocumentInline(source: string, marks: Omit<DocumentRun, 'text'> = {}, depth = 0): DocumentRun[] {
  const runs: DocumentRun[] = []
  let plain = ''
  const flush = () => { pushDocumentRun(runs, { ...marks, text: plain }); plain = '' }
  for (let i = 0; i < source.length;) {
    if (source[i] === '\\' && i + 1 < source.length) { plain += source[i + 1]; i += 2; continue }
    // Restrict lookahead so adversarial unmatched markup stays linear in input size.
    const window = source.slice(i, i + 4096)
    const image = window.match(/^!\[([^\]\n]*)\]\(([^)\n]*)\)/)
    if (image) { plain += image[1] || '[Image omitted]'; i += image[0].length; continue }
    const link = window.match(/^\[([^\]\n]+)\]\(([^)\n]*)\)/)
    if (link && depth < 8) {
      flush()
      const href = safeDocumentLink(link[2])
      runs.push(...parseDocumentInline(link[1], { ...marks, ...(href ? { href } : {}) }, depth + 1))
      i += link[0].length; continue
    }
    const delimiter = ['***', '___', '**', '__', '*', '_', '`'].find((token) => window.startsWith(token))
    // Intraword underscores are ordinary text (file_names and identifiers).
    if (delimiter && depth < 8 && !(delimiter[0] === '_' && i > 0 && /[\p{L}\p{N}]/u.test(source[i - 1]))) {
      let end = window.indexOf(delimiter, delimiter.length)
      while (end > 0 && window[end - 1] === '\\') end = window.indexOf(delimiter, end + delimiter.length)
      if (end > delimiter.length) {
        flush()
        const inner = window.slice(delimiter.length, end)
        if (delimiter === '`') pushDocumentRun(runs, { ...marks, code: true, text: inner })
        else runs.push(...parseDocumentInline(inner, {
          ...marks,
          ...(delimiter.length >= 2 ? { bold: true } : {}),
          ...(delimiter.length !== 2 ? { italic: true } : {}),
        }, depth + 1))
        i += end + delimiter.length; continue
      }
    }
    plain += source[i++]
  }
  flush()
  return runs
}

/** Paragraphs, ATX/setext headings, emphasis, lists, quotes, code and links. */
export function parseDocumentMarkdown(markdown: string): RichDocument {
  const lines = sliceDocumentText(markdown.replace(/\r\n?/g, '\n'), DOCUMENT_LIMITS.maxMarkdownCharacters + 1024).split('\n')
  const blocks: DocumentBlock[] = []
  let fence: string | null = null
  let codeLines = 0
  for (let i = 0; i < lines.length; i++) {
    if (blocks.length >= 10000) {
      blocks.push({ type: 'paragraph', runs: [{ text: lines.slice(i).join('\n') }] })
      break
    }
    const line = lines[i]
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/)
    if (marker) {
      if (!fence) { fence = marker[1]; codeLines = 0; blocks.push({ type: 'code', runs: [{ text: '', code: true }] }); continue }
      if (marker[1][0] === fence[0] && marker[1].length >= fence.length) { fence = null; continue }
    }
    if (fence) { const run = blocks[blocks.length - 1].runs[0]; run.text += (codeLines++ ? '\n' : '') + line; continue }
    if (!line.trim()) { blocks.push({ type: 'paragraph', runs: [] }); continue }
    const heading = line.match(/^ {0,3}(#{1,6})\s+(.+?)(?:\s+#+)?$/)
    const setext = i + 1 < lines.length && /^ {0,3}(=+|-+)\s*$/.test(lines[i + 1])
    const list = line.match(/^( *)([-+*]|\d{1,9}[.)])\s+(.*)$/)
    const quote = line.match(/^ {0,3}> ?(.*)$/)
    if (heading || setext) {
      blocks.push({ type: 'heading', level: heading ? heading[1].length : lines[i + 1].trim()[0] === '=' ? 1 : 2, runs: parseDocumentInline(heading ? heading[2] : line) })
      if (!heading) i++
    } else if (list) {
      blocks.push({ type: 'list', level: Math.min(6, Math.floor(list[1].length / 2)), ordered: /^\d/.test(list[2]), ...(/^\d/.test(list[2]) ? { start: Math.max(1, Number.parseInt(list[2])) } : {}), runs: parseDocumentInline(list[3]) })
    } else if (quote) blocks.push({ type: 'quote', runs: parseDocumentInline(quote[1]) })
    else {
      const previous = blocks[blocks.length - 1]
      // Keep source line breaks, including Markdown hard breaks, readable.
      const runs = parseDocumentInline(line.replace(/ {2}$/, ''))
      if (previous?.type === 'paragraph' && previous.runs.length) previous.runs.push({ text: '\n' }, ...runs)
      else blocks.push({ type: 'paragraph', runs })
    }
    if (blocks.length >= 10000) {
      blocks.push({ type: 'paragraph', runs: [{ text: lines.slice(i + 1).join('\n') }] })
      break
    }
  }
  return { version: 1, blocks: blocks.filter((block) => block.runs.some((run) => run.text.length > 0)) }
}

function escapeDocumentMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+.!>~-]/g, '\\$&')
}

/** Word imports use the same explicit, editable syntax as Markdown imports. */
export function richDocumentMarkdown(document: RichDocument): string {
  return document.blocks.map((block) => {
    if (block.type === 'code') {
      const value = block.runs.map((run) => run.text).join('')
      const fence = '`'.repeat(Math.max(3, ...(value.match(/`+/g) ?? []).map((match) => match.length + 1)))
      return `${fence}\n${value}\n${fence}`
    }
    const text = block.runs.map((run) => {
      let value = escapeDocumentMarkdown(run.text)
      if (run.bold && run.italic) value = `***${value}***`
      else if (run.bold) value = `**${value}**`
      else if (run.italic) value = `*${value}*`
      if (run.href) value = `[${value}](${run.href.replace(/\(/g, '%28').replace(/\)/g, '%29')})`
      return value
    }).join('')
    if (block.type === 'heading') return `${'#'.repeat(block.level || 1)} ${text}`
    if (block.type === 'list') return `${'  '.repeat(block.level ?? 0)}${block.ordered ? `${block.start ?? 1}.` : '-'} ${text}`
    if (block.type === 'quote') return `> ${text}`
    return text
  }).join('\n\n')
}
