import type { CanvasItem } from '../../types'

function presentationOrder(item: CanvasItem): number | null {
  const value = item.meta?.presentationOrder
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function orderedPresentationItems(items: CanvasItem[]): CanvasItem[] {
  return items
    .filter((item) => item.visible !== false && item.meta?.skipPresentation !== true)
    .sort((a, b) => {
      const orderA = presentationOrder(a)
      const orderB = presentationOrder(b)
      if (orderA !== null || orderB !== null) {
        if (orderA === null) return 1
        if (orderB === null) return -1
        return (orderA - orderB) || (a.y - b.y) || (a.x - b.x) || (a.zIndex - b.zIndex)
      }
      return (a.y - b.y) || (a.x - b.x) || (a.zIndex - b.zIndex)
    })
}

export function nextPresentationIndex(items: CanvasItem[], currentId: string | null, direction: 1 | -1): number {
  const ordered = orderedPresentationItems(items)
  if (ordered.length === 0) return direction === 1 ? 0 : -1
  if (!currentId) return direction === 1 ? 0 : ordered.length - 1
  const currentIndex = ordered.findIndex((item) => item.id === currentId)
  if (currentIndex === -1) return direction === 1 ? 0 : ordered.length - 1
  return currentIndex + direction
}
