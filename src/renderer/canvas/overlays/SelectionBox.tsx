import React from 'react'
import { Rect } from 'react-konva'
import { useCanvasStore } from '../../store/canvasStore'

export function SelectionBox(): React.ReactElement | null {
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const items = useCanvasStore((s) => s.items())

  if (selectedIds.length < 2) return null

  const selected = items.filter((i) => selectedIds.includes(i.id))
  if (selected.length === 0) return null

  const minX = Math.min(...selected.map((i) => i.x))
  const minY = Math.min(...selected.map((i) => i.y))
  const maxX = Math.max(...selected.map((i) => i.x + i.width))
  const maxY = Math.max(...selected.map((i) => i.y + i.height))

  return (
    <Rect
      x={minX - 4}
      y={minY - 4}
      width={maxX - minX + 8}
      height={maxY - minY + 8}
      stroke="var(--accent)"
      strokeWidth={1}
      fill="rgba(185,148,85,0.04)"
      dash={[6, 3]}
      listening={false}
    />
  )
}
