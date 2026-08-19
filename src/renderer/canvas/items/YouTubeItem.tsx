import React from 'react'
import { Rect } from 'react-konva'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { adoptSelectTool, handleRelicToolPress } from './relicPointer'
import { DOMItem } from './DOMItem'
import { MediaPlaceholder } from './MediaPlaceholder'
import { isBrowserDemo } from '../../platform/runtime'

type Props = { item: CanvasItem; domOnly?: boolean }

function browserEmbedUrl(source: string): string {
  try {
    const url = new URL(source)
    const videoId = url.hostname === 'youtu.be'
      ? url.pathname.slice(1)
      : url.searchParams.get('v')
    return videoId ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}` : source
  } catch {
    return source
  }
}

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
        editableFrame
        onClick={(e) => {
          e.stopPropagation()
          if (handleRelicToolPress(toolMode, activeBoardId, item)) return
          adoptSelectTool(toolMode)
          setSelection([item.id])
        }}
      >
        {item.src ? (isBrowserDemo ? (
          <iframe
            src={browserEmbedUrl(item.src)}
            title="YouTube video"
            style={{ width: '100%', height: '100%', border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <webview
            src={item.src}
            style={{ width: '100%', height: '100%' }}
            // @ts-expect-error webview is an Electron-specific element
            allowpopups="false"
          />
        )) : <MediaPlaceholder item={item} />}
      </DOMItem>
    </>
  )
}
