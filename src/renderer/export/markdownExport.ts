import type { CanvasItem, Connection } from '../../types'
import { normalizeCodeLanguage } from '../canvas/items/codeSnippet'
import { imageRegionPercent, sourceCaptureContent, sourceCaptureReference } from '../canvas/sourceCapture'
import { useCanvasStore } from '../store/canvasStore'
import { inscribe } from '../ui/toasts/inscriptionToastStore'

/**
 * The Obsidian handoff.
 *
 * A board leaves Citadel as one ordinary Markdown file — no plugin, no vault
 * assumptions, nothing to install on the other side. That is the deliberate
 * first step: an export a person can drop into any vault, editor, or repo is
 * worth more than a two-way plugin nobody can try yet, and it is what tells us
 * whether the two-way version is wanted at all.
 *
 * What survives the trip: reading order, item text, code with its language,
 * tags, links, source captures with their citation, and the threads between
 * exported items. What does not: position, size, rotation, colour, and z-order.
 * Markdown has no place to put them, and inventing one would make a file that
 * only Citadel can read — the opposite of the point.
 */

/**
 * Items within this many canvas units of each other vertically read as one row,
 * so a left-to-right row of notes exports left-to-right rather than by exact y.
 */
const ROW_BAND = 120

export type MarkdownExportOptions = {
  /** Names the note. The board's own name, normally. */
  boardName: string
  /** Where the `.md` will be written, so asset links can be made relative to it. */
  destinationDir?: string
  /** Fixed by the caller in tests; `Date.now()` otherwise. */
  exportedAt?: number
}

/**
 * Reading order: down the board in bands, left to right inside each band.
 * Sorting on raw y alone puts a row of side-by-side notes in the order their
 * tops happen to fall, which reads as shuffled.
 */
export function markdownItemOrder(items: CanvasItem[]): CanvasItem[] {
  return [...items].sort((a, b) => {
    const band = Math.floor(a.y / ROW_BAND) - Math.floor(b.y / ROW_BAND)
    if (band !== 0) return band
    if (a.x !== b.x) return a.x - b.x
    return a.y - b.y
  })
}

/**
 * A path expressed relative to the directory the note is written to, so the
 * exported file keeps working when the vault moves as a whole.
 *
 * Returns the path unchanged when the two cannot be related — a different
 * Windows drive, a URL, or no destination known yet. A wrong relative path
 * would break silently; an absolute one at least still opens on this machine.
 */
export function relativeAssetPath(fromDir: string | undefined, target: string): string {
  if (!fromDir || !target) return target
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(target)) return target
  const from = fromDir.replace(/\\/g, '/').replace(/\/+$/, '').split('/')
  const to = target.replace(/\\/g, '/').split('/')
  if (from[0]?.toLowerCase() !== to[0]?.toLowerCase()) return target
  let shared = 0
  while (shared < from.length && shared < to.length && from[shared].toLowerCase() === to[shared].toLowerCase()) shared++
  const up = from.length - shared
  const down = to.slice(shared)
  if (down.length === 0) return target
  return [...Array(up).fill('..'), ...down].join('/')
}

/**
 * A Markdown link target. Spaces and parentheses end a plain `(…)` target
 * early, so those paths go in angle brackets, which CommonMark and Obsidian
 * both accept and which stays readable — unlike percent-encoding a whole path.
 */
function linkTarget(path: string): string {
  return /[\s()<>]/.test(path) ? `<${path.replace(/[<>]/g, '')}>` : path
}

function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

/** The heading a single item gets. Short, and taken from the item's own words. */
export function markdownItemHeading(item: CanvasItem): string {
  const capture = sourceCaptureReference(item)
  if (capture) return firstLine(sourceCaptureContent(item)) || 'Capture'
  if (item.type === 'text' || item.type === 'sticky') {
    const documentName = typeof item.meta?.documentName === 'string' ? item.meta.documentName : ''
    return documentName || firstLine(readContent(item)) || (item.type === 'sticky' ? 'Note' : 'Text')
  }
  if (item.type === 'code') {
    return firstLine(typeof item.meta?.code === 'string' ? item.meta.code : '') || 'Snippet'
  }
  if (item.src) return basename(item.src)
  return item.type
}

/**
 * The first line, with any leading Markdown marker taken off. A note that
 * opens `# Ideas` would otherwise become the heading `## # Ideas`.
 */
function firstLine(text: string): string {
  const line = (text.trim().split(/\r?\n/, 1)[0] ?? '').replace(/^\s*(?:[#>*+-]+|\d+\.)\s*/, '').replace(/`/g, '').trim()
  return line.length > 80 ? `${line.slice(0, 79)}…` : line
}

function readContent(item: CanvasItem): string {
  return typeof item.meta?.content === 'string' ? item.meta.content : ''
}

/**
 * The body of one item.
 *
 * Text arrives verbatim, including anything that happens to be Markdown
 * syntax. A note that reads `# Ideas` becomes a heading in the export — which
 * is what someone writing Markdown in a note wants, and the reason a `.md`
 * imported into Citadel round-trips as itself rather than as escaped text.
 */
function itemBody(item: CanvasItem, options: MarkdownExportOptions): string[] {
  const lines: string[] = []
  const capture = sourceCaptureReference(item)

  if (capture) {
    const note = sourceCaptureContent(item)
    if (note) lines.push(...note.split(/\r?\n/).map((line) => (line ? `> ${line}` : '>')))
    const citation = [capture.reference, capture.locator].filter(Boolean).join(', ')
    if (citation) lines.push('', `— ${citation}`)
    if (capture.region) lines.push('', `Image region: ${imageRegionPercent(capture.region)}`)
    return [...lines, ...trailingLines(item)]
  }

  switch (item.type) {
    case 'text':
    case 'sticky': {
      const content = readContent(item).trim()
      if (content) lines.push(content)
      if (item.meta?.documentTruncated === true) {
        lines.push('', '*Shortened on import; the original document is unchanged.*')
      }
      break
    }
    case 'code': {
      const code = typeof item.meta?.code === 'string' ? item.meta.code : ''
      const language = normalizeCodeLanguage(item.meta?.language)
      lines.push('```' + (language === 'plaintext' ? '' : language), code, '```')
      break
    }
    case 'image':
    case 'gif': {
      if (item.src) lines.push(`![${basename(item.src)}](${linkTarget(relativeAssetPath(options.destinationDir, item.src))})`)
      break
    }
    case 'youtube': {
      if (item.src) lines.push(`[YouTube — ${item.src}](${linkTarget(item.src)})`)
      break
    }
    case 'video':
    case 'audio':
    case 'model3d': {
      // Not embedded: no Markdown reader agrees on how to play these, and a
      // broken embed is worse than a link that always opens.
      if (item.src) lines.push(`${item.type}: [${basename(item.src)}](${linkTarget(relativeAssetPath(options.destinationDir, item.src))})`)
      break
    }
    case 'swatch': {
      const colors = Array.isArray(item.meta?.colors) ? (item.meta.colors as unknown[]).filter((c): c is string => typeof c === 'string') : []
      if (colors.length > 0) lines.push(colors.map((color) => `\`${color}\``).join(' '))
      break
    }
    case 'comparison': {
      // A comparison is two images behind one slider; a linear document can
      // only put them one after the other, so it does.
      const sources = [item.meta?.srcA, item.meta?.srcB].filter((s): s is string => typeof s === 'string' && s !== '')
      for (const source of sources) {
        lines.push(`![${basename(source)}](${linkTarget(relativeAssetPath(options.destinationDir, source))})`)
      }
      break
    }
  }

  return [...lines, ...trailingLines(item)]
}

/** The link and tags every item can carry, written the way a vault reads them. */
function trailingLines(item: CanvasItem): string[] {
  const lines: string[] = []
  if (item.link) lines.push('', `[Open link](${linkTarget(item.link)})`)
  if (item.tags.length > 0) lines.push('', item.tags.map((tag) => `#${tag.replace(/\s+/g, '-')}`).join(' '))
  return lines
}

function frontmatter(items: CanvasItem[], options: MarkdownExportOptions): string[] {
  const tags = [...new Set(items.flatMap((item) => item.tags))].sort()
  const exportedAt = new Date(options.exportedAt ?? Date.now()).toISOString()
  return [
    '---',
    `title: ${yamlScalar(options.boardName)}`,
    `source: Citadel`,
    `exported: ${exportedAt}`,
    `items: ${items.length}`,
    ...(tags.length > 0 ? [`tags: [${tags.map((tag) => tag.replace(/\s+/g, '-')).join(', ')}]`] : []),
    '---',
  ]
}

function yamlScalar(value: string): string {
  return /^[\w][\w .'-]*$/.test(value) ? value : JSON.stringify(value)
}

/**
 * The whole note. Threads come last, as a list, because a line between two
 * items has no position in a linear document — but losing it altogether would
 * throw away the part of a board that is actually about relationships.
 */
export function itemsToMarkdown(
  items: CanvasItem[],
  connections: Connection[],
  options: MarkdownExportOptions,
): string {
  const ordered = markdownItemOrder(items)
  const lines: string[] = [...frontmatter(ordered, options), '', `# ${options.boardName}`]

  for (const item of ordered) {
    lines.push('', `## ${markdownItemHeading(item)}`, '')
    const body = itemBody(item, options)
    lines.push(...(body.length > 0 ? body : ['*(empty)*']))
  }

  const exportedIds = new Set(ordered.map((item) => item.id))
  const headings = new Map(ordered.map((item) => [item.id, markdownItemHeading(item)]))
  const threads = connections.filter((c) => exportedIds.has(c.fromId) && exportedIds.has(c.toId))
  if (threads.length > 0) {
    lines.push('', '## Connections', '')
    for (const thread of threads) {
      const detail = [thread.label, thread.meaning].filter(Boolean).join(' · ')
      lines.push(`- ${headings.get(thread.fromId)} → ${headings.get(thread.toId)}${detail ? ` — ${detail}` : ''}`)
    }
  }

  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n')}\n`
}

/** A filename a vault can live with, derived from the board's name. */
export function markdownExportFilename(boardName: string): string {
  const stem = boardName.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').slice(0, 60).trim()
  return `${stem || 'citadel-board'}.md`
}

function directoryOf(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/')
  parts.pop()
  return parts.join('/')
}

/**
 * Exports the selection, or the whole board when nothing is selected — the
 * same rule the rest of the app uses for "what am I acting on".
 */
export async function exportSelectionToMarkdown(): Promise<void> {
  const canvas = useCanvasStore.getState()
  const board = canvas.activeBoard()
  if (!board) return

  const selected = new Set(canvas.selectedIds)
  const items = selected.size > 0 ? board.items.filter((item) => selected.has(item.id)) : board.items
  if (items.length === 0) {
    inscribe('Nothing to export — the board is empty', { tone: 'danger' })
    return
  }

  const boardName = board.name || 'Citadel board'
  const { path } = await window.ipc.invoke('file:saveDialog', {
    defaultName: markdownExportFilename(boardName),
    filters: [{ name: 'Markdown', extensions: ['md'] }],
  }) as { path: string | null }
  if (!path) return

  const markdown = itemsToMarkdown(items, board.connections, {
    boardName,
    destinationDir: directoryOf(path),
  })

  try {
    await window.ipc.invoke('file:save', { path, data: markdown })
  } catch (error) {
    console.error('Markdown export failed:', error)
    inscribe('Markdown export failed — the file could not be written', { tone: 'danger' })
    return
  }
  inscribe(selected.size > 0
    ? `${items.length} selected item${items.length === 1 ? '' : 's'} exported as Markdown`
    : 'Board exported as Markdown')
}
