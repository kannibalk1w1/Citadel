import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'

type AlignAxis = 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom'

export function alignItems(ids: string[], axis: AlignAxis): void {
  const store = useCanvasStore.getState()
  const { activeBoardId, items } = store
  if (!activeBoardId) return

  const targets = items().filter((i) => ids.includes(i.id))
  if (targets.length < 2) return

  const minX = Math.min(...targets.map((i) => i.x))
  const maxX = Math.max(...targets.map((i) => i.x + i.width))
  const minY = Math.min(...targets.map((i) => i.y))
  const maxY = Math.max(...targets.map((i) => i.y + i.height))
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  for (const item of targets) {
    let patch: Partial<CanvasItem> = {}
    switch (axis) {
      case 'left':    patch = { x: minX }; break
      case 'right':   patch = { x: maxX - item.width }; break
      case 'centerH': patch = { x: centerX - item.width / 2 }; break
      case 'top':     patch = { y: minY }; break
      case 'bottom':  patch = { y: maxY - item.height }; break
      case 'centerV': patch = { y: centerY - item.height / 2 }; break
    }
    store.updateItem(activeBoardId, item.id, patch)
  }
}
