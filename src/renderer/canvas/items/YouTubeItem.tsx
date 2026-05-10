import React from 'react'
import { Rect } from 'react-konva'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { DOMItem } from './DOMItem'

type Props = { item: CanvasItem }

export function YouTubeItem({ item }: Props): React.ReactElement {
  const setSelection = useCanvasStore((s) => s.setSelection)

  return (
    <>
      <Rect
        x={item.x} y={item.y}
        width={item.width} height={item.height}
        rotation={item.rotation}
        opacity={0}
        onClick={(e) => { e.cancelBubble = true; setSelection([item.id]) }}
      />
      <DOMItem item={item}>
        {/* Electron <webview> required for YouTube */}
        <webview
          src={item.src ?? 'about:blank'}
          style={{ width: '100%', height: '100%' }}
          // @ts-expect-error webview is an Electron-specific element
          allowpopups="false"
        />
      </DOMItem>
    </>
  )
}
