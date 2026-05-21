import type { CanvasItem } from '../../types'

export type SearchResult = {
  item: CanvasItem
  label: string
  detail: string
  haystack: string
}

function basename(value: string | undefined): string {
  if (!value) return ''
  const clean = value.split('?')[0].replace(/\\/g, '/')
  return clean.split('/').filter(Boolean).at(-1) ?? value
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

function arrayText(value: unknown): string {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').join(', ') : ''
}

export function isCommentItem(item: CanvasItem): boolean {
  return item.type === 'sticky' && item.meta?.kind === 'comment'
}

export function buildSearchResult(item: CanvasItem): SearchResult {
  const content = textValue(item.meta?.content)
  const srcName = basename(item.src)
  const srcAName = basename(textValue(item.meta?.srcA))
  const srcBName = basename(textValue(item.meta?.srcB))
  const swatches = arrayText(item.meta?.colors)
  const isComment = isCommentItem(item)

  const label =
    content ||
    (isComment ? 'Untitled comment' : '') ||
    srcName ||
    srcAName ||
    srcBName ||
    swatches ||
    `${item.type} ${item.id.slice(0, 6)}`

  const detailParts = [
    isComment ? 'comment' : item.type,
    isComment && item.meta?.attachedTo ? 'attached' : '',
    item.tags.length ? `tags: ${item.tags.join(', ')}` : '',
    item.src ? `src: ${item.src}` : '',
    item.link ? `link: ${item.link}` : '',
    srcAName ? `A: ${srcAName}` : '',
    srcBName ? `B: ${srcBName}` : '',
    swatches ? `colors: ${swatches}` : '',
  ].filter(Boolean)

  const detail = detailParts.join('  |  ')
  const haystack = [
    item.type,
    isComment ? 'comment annotation note' : '',
    item.id,
    item.tags.join(' '),
    item.src ?? '',
    item.link ?? '',
    content,
    textValue(item.meta?.srcA),
    textValue(item.meta?.srcB),
    swatches,
  ].join(' ').toLowerCase()

  return { item, label, detail, haystack }
}

export function getSearchResults(items: CanvasItem[], query: string, limit = 30): SearchResult[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return []
  return items.map(buildSearchResult).filter((result) => result.haystack.includes(normalizedQuery)).slice(0, limit)
}

export function getCommentResults(items: CanvasItem[], limit = 20): SearchResult[] {
  return items.filter(isCommentItem).map(buildSearchResult).slice(0, limit)
}
