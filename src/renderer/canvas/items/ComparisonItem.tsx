// ComparisonItem: side-by-side or slider comparison of two images.
import React, { useState } from 'react'
import { Group, Rect, Image as KonvaImage, Line } from 'react-konva'
import useImage from 'use-image'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'

type Props = { item: CanvasItem }

export function ComparisonItem({ item }: Props): React.ReactElement {
  const [splitX, setSplitX] = useState(0.5)
  const setSelection = useCanvasStore((s) => s.setSelection)
  const updateItem = useCanvasStore((s) => s.updateItem)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)!
  const toolMode = useUIStore((s) => s.toolMode)

  const srcA = (item.meta?.srcA as string) ?? ''
  const srcB = (item.meta?.srcB as string) ?? ''
  const [imageA] = useImage(srcA)
  const [imageB] = useImage(srcB)

  const splitPx = item.width * splitX

  return (
    <Group
      x={item.x} y={item.y}
      rotation={item.rotation}
      draggable={toolMode === 'select' && !item.locked}
      onClick={(e) => { e.cancelBubble = true; setSelection([item.id]) }}
      onDragEnd={(e) => updateItem(activeBoardId, item.id, { x: e.target.x(), y: e.target.y() })}
    >
      {/* Right image (full) */}
      {imageB && (
        <KonvaImage image={imageB} x={0} y={0} width={item.width} height={item.height} opacity={item.opacity} />
      )}
      {/* Left image clipped to split */}
      {imageA && (
        <KonvaImage
          image={imageA}
          x={0} y={0}
          width={item.width}
          height={item.height}
          opacity={item.opacity}
          clipX={0}
          clipY={0}
          clipWidth={splitPx}
          clipHeight={item.height}
        />
      )}
      {/* Drag handle */}
      <Line
        points={[splitPx, 0, splitPx, item.height]}
        stroke="var(--accent)"
        strokeWidth={2}
        draggable
        onDragMove={(e) => {
          const newX = Math.max(0, Math.min(item.width, e.target.x()))
          setSplitX(newX / item.width)
          e.target.x(newX)
          e.target.y(0)
        }}
      />
    </Group>
  )
}
