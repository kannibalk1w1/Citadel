// VideoItem renders as a DOM element synced to canvas coordinates.
// The actual Konva layer renders a placeholder rect; the <video> is absolutely positioned.
import React from 'react'
import { Rect } from 'react-konva'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { DOMItem } from './DOMItem'
import { pathToUrl } from '../../utils/pathToUrl'

type Props = { item: CanvasItem }

export function VideoItem({ item }: Props): React.ReactElement {
  const setSelection = useCanvasStore((s) => s.setSelection)

  return (
    <>
      {/* Transparent hit area in Konva */}
      <Rect
        x={item.x} y={item.y}
        width={item.width} height={item.height}
        rotation={item.rotation}
        opacity={0}
        onClick={(e) => { e.cancelBubble = true; setSelection([item.id]) }}
      />
      <DOMItem item={item}>
        <video
          src={pathToUrl(item.src ?? '')}
          style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
          controls
          loop
        />
      </DOMItem>
    </>
  )
}
