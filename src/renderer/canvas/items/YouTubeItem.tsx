import React from 'react'
import { Rect } from 'react-konva'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { handleConnectRelicClick } from '../connections/connectInteraction'
import { DOMItem } from './DOMItem'
import { MediaPlaceholder } from './MediaPlaceholder'

type Props = { item: CanvasItem; domOnly?: boolean }

export function YouTubeItem({ item, domOnly = false }: Props): React.ReactElement {
  const setSelection = useCanvasStore((s) => s.setSelection)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)
  const toolMode = useUIStore((s) => s.toolMode)

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
          if (toolMode === 'connect') {
            handleConnectRelicClick(activeBoardId, item.id)
            return
          }
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
