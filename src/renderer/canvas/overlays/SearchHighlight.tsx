import React from 'react'
import { Rect } from 'react-konva'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'

export function SearchHighlight(): React.ReactElement | null {
  const highlightId = useUIStore((s) => s.searchHighlightId)
  const viewport = useCanvasStore((s) => s.viewport())
  const item = useCanvasStore((s) => s.items().find((i) => i.id === highlightId))

  if (!highlightId || !item) return null

  const pad = 8 / viewport.scale

  return (
    <Rect
      x={item.x - pad}
      y={item.y - pad}
      width={item.width + pad * 2}
      height={item.height + pad * 2}
      rotation={item.rotation}
      stroke="#b99455"
      strokeWidth={2 / viewport.scale}
      dash={[8 / viewport.scale, 5 / viewport.scale]}
      shadowEnabled
      shadowColor="rgba(185,148,85,0.85)"
      shadowBlur={16 / viewport.scale}
      shadowOpacity={0.9}
      listening={false}
    />
  )
}
