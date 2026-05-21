import type { CanvasItem } from '../../types'

export function orderedPresentationItems(items: CanvasItem[]): CanvasItem[] {
  return items
    .filter((item) => item.visible !== false)
    .sort((a, b) => (a.y - b.y) || (a.x - b.x) || (a.zIndex - b.zIndex))
}

export function nextPresentationIndex(items: CanvasItem[], currentId: string | null, direction: 1 | -1): number {
  const ordered = orderedPresentationItems(items)
  if (ordered.length === 0) return direction === 1 ? 0 : -1
  if (!currentId) return direction === 1 ? 0 : ordered.length - 1
  const currentIndex = ordered.findIndex((item) => item.id === currentId)
  if (currentIndex === -1) return direction === 1 ? 0 : ordered.length - 1
  return currentIndex + direction
}
