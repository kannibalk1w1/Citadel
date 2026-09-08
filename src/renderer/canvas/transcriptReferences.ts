import type { CanvasItem } from '../../types'

/** Keep a duplicated audio/transcript pair bound to its copies, not originals. */
export function remapTranscriptReferences(
  item: CanvasItem,
  ids: ReadonlyMap<string, string>,
  preserveExternal = true,
): CanvasItem {
  if (!item.meta) return item
  const meta = { ...item.meta }
  for (const key of ['transcriptSourceItemId', 'transcriptItemId']) {
    const id = meta[key]
    if (typeof id !== 'string') continue
    const replacement = ids.get(id)
    if (replacement) meta[key] = replacement
    else if (!preserveExternal) delete meta[key]
  }
  return { ...item, meta }
}
