import React from 'react'
import { Rect } from 'react-konva'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { selectionBounds } from './boardChromeViewModel'

function canvasToken(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

type SelectionBoxProps = {
  items?: CanvasItem[]
}

export function SelectionBox({ items: providedItems }: SelectionBoxProps = {}): React.ReactElement | null {
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const storeItems = useCanvasStore((s) => s.items())
  const items = providedItems ?? storeItems

  if (selectedIds.length < 2) return null

  const selected = items.filter((i) => selectedIds.includes(i.id))
  if (selected.length === 0) return null

  const bounds = selectionBounds(selected)
  if (!bounds) return null

  return (
    <Rect
      x={bounds.x}
      y={bounds.y}
      width={bounds.width}
      height={bounds.height}
      stroke={canvasToken('--accent', '#bd9652')}
      strokeWidth={1}
      fill="rgba(189,150,82,0.045)"
      dash={[10, 5]}
      cornerRadius={2}
      listening={false}
    />
  )
}
