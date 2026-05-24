import React from 'react'
import { Circle, Group } from 'react-konva'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { anchorHandles } from './boardChromeViewModel'

export function AnchorHandles(): React.ReactElement | null {
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const items = useCanvasStore((s) => s.items())
  const viewport = useCanvasStore((s) => s.viewport())
  const toolMode = useUIStore((s) => s.toolMode)

  if (selectedIds.length !== 1) return null
  const item = items.find((candidate) => candidate.id === selectedIds[0])
  if (!item || item.locked) return null

  const radius = toolMode === 'connect' ? 5 / viewport.scale : 3.5 / viewport.scale
  return (
    <Group listening={false}>
      {anchorHandles(item).map((anchor) => (
        <Circle
          key={anchor.side}
          x={anchor.x}
          y={anchor.y}
          radius={radius}
          fill="#0b0a09"
          stroke="#bd9652"
          strokeWidth={1.25 / viewport.scale}
          shadowColor="rgba(189,150,82,0.5)"
          shadowBlur={toolMode === 'connect' ? 9 / viewport.scale : 4 / viewport.scale}
          opacity={toolMode === 'select' || toolMode === 'connect' ? 0.95 : 0.45}
        />
      ))}
    </Group>
  )
}

