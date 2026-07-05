import type { CanvasItem } from '../../types'

// Wiki-style [[references]] inside inscriptions. A reference is not a hard
// link to an item id — it is a phrase the Living Index can chase, so renaming
// or relinking relics never breaks anything.

export function parseInscriptionRefs(content: string): string[] {
  const refs: string[] = []
  const seen = new Set<string>()
  for (const match of content.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const ref = match[1].trim()
    if (!ref) continue
    const key = ref.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    refs.push(ref)
  }
  return refs
}

export function itemInscriptionRefs(item: CanvasItem): string[] {
  const content = item.meta?.content
  if (typeof content !== 'string') return []
  return parseInscriptionRefs(content)
}
