import type { CanvasItem } from '../../types'

export type CanvasRuntimeStats = {
  totalRelics: number
  mountedRelics: number
  awakeDOMMedia: number
  sleepingAnimatedRelics: number
}

const DOM_MEDIA_TYPES = new Set<CanvasItem['type']>(['video', 'youtube', 'audio', 'model3d'])
const ANIMATED_RELIC_TYPES = new Set<CanvasItem['type']>(['gif', 'video', 'youtube', 'audio', 'model3d'])

export function canvasRuntimeStats(
  allItems: CanvasItem[],
  renderedItems: CanvasItem[],
): CanvasRuntimeStats {
  const renderedIds = new Set(renderedItems.map((item) => item.id))
  return {
    totalRelics: allItems.length,
    mountedRelics: renderedItems.length,
    awakeDOMMedia: renderedItems.filter((item) => DOM_MEDIA_TYPES.has(item.type)).length,
    sleepingAnimatedRelics: allItems.filter((item) => (
      item.visible &&
      ANIMATED_RELIC_TYPES.has(item.type) &&
      !renderedIds.has(item.id)
    )).length,
  }
}
