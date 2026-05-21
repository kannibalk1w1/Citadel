// VideoItem renders as a DOM element synced to canvas coordinates.
// The actual Konva layer renders a placeholder rect; the <video> is absolutely positioned.
import React, { useRef, useState } from 'react'
import { Rect } from 'react-konva'
import { nanoid } from 'nanoid'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { DOMItem } from './DOMItem'
import { pathToUrl } from '../../utils/pathToUrl'

type Props = { item: CanvasItem }

export function VideoItem({ item }: Props): React.ReactElement {
  const setSelection = useCanvasStore((s) => s.setSelection)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [message, setMessage] = useState('')

  const captureFrame = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    const video = videoRef.current
    const boardId = useCanvasStore.getState().activeBoardId
    if (!video || !boardId || video.videoWidth === 0 || video.videoHeight === 0) {
      setMessage('frame unavailable')
      return
    }

    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 2D context unavailable')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = canvas.toDataURL('image/png')
      const ipc = (window as unknown as { ipc: { invoke: (ch: string, args: unknown) => Promise<unknown> } }).ipc
      const result = await ipc.invoke('assets:saveDataUrl', {
        imageData,
        filename: `video-frame-${Date.now()}.png`,
      }) as { path?: string }
      if (!result.path) throw new Error('No frame path returned')

      const frameItem: CanvasItem = {
        id: nanoid(),
        type: 'image',
        x: item.x + item.width + 24,
        y: item.y,
        width: Math.min(item.width, video.videoWidth),
        height: Math.min(item.height, video.videoHeight),
        rotation: 0,
        zIndex: Date.now(),
        locked: false,
        visible: true,
        opacity: 1,
        tags: [...item.tags],
        src: result.path,
        meta: { capturedFrom: item.id, capturedAt: video.currentTime },
      }
      useCanvasStore.getState().addItem(boardId, frameItem)
      useHistoryStore.getState().push('ITEM_ADD', boardId, null, frameItem)
      setSelection([frameItem.id])
      setMessage('captured')
      setTimeout(() => setMessage(''), 1200)
    } catch (error) {
      console.error('Failed to capture video frame:', error)
      setMessage('capture failed')
    }
  }

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
      <DOMItem item={item} style={{ background: 'var(--bg-canvas)' }}>
        <video
          ref={videoRef}
          src={pathToUrl(item.src ?? '')}
          style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
          controls
          loop
        />
        <button
          type="button"
          onClick={(e) => { captureFrame(e).catch(console.error) }}
          title="Capture current frame"
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 26,
            height: 24,
            border: '1px solid var(--border)',
            borderRadius: 3,
            background: 'var(--bg-panel)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.88,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M2 5H4L5 3.5H10L11 5H13V12H2Z" />
            <circle cx="7.5" cy="8.5" r="2.2" />
          </svg>
        </button>
        {message ? (
          <div style={{
            position: 'absolute',
            left: 8,
            bottom: 8,
            padding: '3px 6px',
            borderRadius: 3,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            pointerEvents: 'none',
          }}>
            {message}
          </div>
        ) : null}
      </DOMItem>
    </>
  )
}
