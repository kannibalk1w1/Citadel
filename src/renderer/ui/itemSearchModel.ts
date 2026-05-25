import type { CanvasItem } from '../../types'

export type SearchResult = {
  item: CanvasItem
  label: string
  detail: string
  haystack: string
}

export type SearchResultGroupId = 'relics' | 'inscriptions' | 'sigils'

export type SearchResultGroup = {
  id: SearchResultGroupId
  title: string
  results: SearchResult[]
}

type ParsedSearchQuery = {
  text: string
  types: string[]
  tags: string[]
  states: string[]
  assets: string[]
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

function hasInscription(item: CanvasItem): boolean {
  return item.type === 'sticky' || item.type === 'text' || textValue(item.meta?.content) !== ''
}

function hasRelicSource(item: CanvasItem): boolean {
  return Boolean(item.src || item.meta?.srcA || item.meta?.srcB)
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

function parseSearchQuery(query: string): ParsedSearchQuery {
  const parsed: ParsedSearchQuery = { text: '', types: [], tags: [], states: [], assets: [] }
  const text: string[] = []

  query.trim().toLowerCase().split(/\s+/).filter(Boolean).forEach((token) => {
    const [prefix, ...valueParts] = token.split(':')
    const value = valueParts.join(':')
    if (!value) {
      text.push(token)
      return
    }

    if (prefix === 'type') parsed.types.push(value)
    else if (prefix === 'tag') parsed.tags.push(value)
    else if (prefix === 'is') parsed.states.push(value)
    else if (prefix === 'has') parsed.assets.push(value)
    else text.push(token)
  })

  parsed.text = text.join(' ')
  return parsed
}

function matchesSearchQuery(result: SearchResult, parsed: ParsedSearchQuery): boolean {
  const item = result.item
  const isComment = isCommentItem(item)

  if (parsed.text && !result.haystack.includes(parsed.text)) return false
  if (parsed.types.length && !parsed.types.some((type) => type === item.type || (type === 'comment' && isComment))) return false
  if (parsed.tags.length && !parsed.tags.every((tag) => item.tags.some((itemTag) => itemTag.toLowerCase() === tag))) return false

  if (!parsed.states.every((state) => {
    if (state === 'hidden') return item.visible === false
    if (state === 'visible') return item.visible !== false
    if (state === 'locked') return item.locked
    if (state === 'unlocked') return !item.locked
    if (state === 'comment') return isComment
    return true
  })) return false

  if (!parsed.assets.every((asset) => {
    if (asset === 'link') return Boolean(item.link)
    if (asset === 'src' || asset === 'asset') return Boolean(item.src || item.meta?.srcA || item.meta?.srcB)
    if (asset === 'tag' || asset === 'tags') return item.tags.length > 0
    return true
  })) return false

  return true
}

export function getSearchResults(items: CanvasItem[], query: string, limit = 30): SearchResult[] {
  const parsed = parseSearchQuery(query)
  if (!parsed.text && !parsed.types.length && !parsed.tags.length && !parsed.states.length && !parsed.assets.length) return []
  return items.map(buildSearchResult).filter((result) => matchesSearchQuery(result, parsed)).slice(0, limit)
}

export function getCommentResults(items: CanvasItem[], limit = 20): SearchResult[] {
  return items.filter(isCommentItem).map(buildSearchResult).slice(0, limit)
}

export function groupSearchResults(results: SearchResult[]): SearchResultGroup[] {
  return [
    {
      id: 'relics',
      title: 'Relics',
      results: results.filter((result) => hasRelicSource(result.item)),
    },
    {
      id: 'inscriptions',
      title: 'Inscriptions',
      results: results.filter((result) => hasInscription(result.item)),
    },
    {
      id: 'sigils',
      title: 'Sigils',
      results: results.filter((result) => result.item.tags.length > 0),
    },
  ]
}

export function nextSearchResultIndex(currentIndex: number, resultCount: number, direction: 1 | -1): number {
  if (resultCount <= 0) return -1
  if (currentIndex < 0 || currentIndex >= resultCount) return direction === 1 ? 0 : resultCount - 1
  return (currentIndex + direction + resultCount) % resultCount
}
