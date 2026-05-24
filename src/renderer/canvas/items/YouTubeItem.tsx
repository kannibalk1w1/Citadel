import React from 'react'
import { Rect } from 'react-konva'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { DOMItem } from './DOMItem'
import { MediaPlaceholder } from './MediaPlaceholder'

type Props = { item: CanvasItem; domOnly?: boolean }

export function YouTubeItem({ item, domOnly = false }: Props): React.ReactElement {
  const setSelection = useCanvasStore((s) => s.setSelection)

  return (
    <>
      {!domOnly && (
        <Rect
          x={item.x} y={item.y}
          width={item.width} height={item.height}
          rotation={item.rotation}
          opacity={0}
          onClick={(e) => { e.cancelBubble = true; setSelection([item.id]) }}
        />
      )}
      <DOMItem
        item={item}
        onClick={(e) => {
          e.stopPropagation()
          setSelection([item.id])
        }}
      >
        {item.src ? (
          <webview
            src={item.src}
            style={{ width: '100%', height: '100%' }}
            // @ts-expect-error webview is an Electron-specific element
            allowpopups="false"
          />
        ) : <MediaPlaceholder item={item} />}
      </DOMItem>
    </>
  )
}
