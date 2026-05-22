import React, { useEffect, useRef } from 'react'
import { Image as KonvaImage, Transformer } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
// gifler is a browserify bundle — it has no ESM default export.
// It does set window.gifler itself, so we use a side-effect import + window access.
import 'gifler'
import { nanoid } from 'nanoid'
import type { CanvasItem, Connection } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { useUIStore } from '../../store/uiStore'
import { pathToUrl } from '../../utils/pathToUrl'
import { snapItem } from '../snapping/snapEngine'
import { spatialIndex } from '../snapping/spatialIndex'
import { snapLines } from '../overlays/SnapGuides'

type GiflerFn = (src: string) => {
  frames(canvas: HTMLCanvasElement, fn: (ctx: CanvasRenderingContext2D, frame: { buffer: HTMLCanvasElement }) => void): void
  stop(): void
}
const getGifler = (): GiflerFn => (window as unknown as { gifler: GiflerFn }).gifler

type Props = { item: CanvasItem }

export function GifItem({ item }: Props): React.ReactElement | null {
  const imageRef = useRef<Konva.Image>(null)
  const trRef = useRef<import('konva/lib/shapes/Transformer').Transformer>(null)
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'))
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const transformStart = useRef<{ x: number; y: number; width: number; height: number; rotation: number } | null>(null)
  const isSelected = useCanvasStore((s) => s.selectedIds.includes(item.id))
  const setSelection = useCanvasStore((s) => s.setSelection)
  const updateItem = useCanvasStore((s) => s.updateItem)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)!
  const toolMode = useUIStore((s) => s.toolMode)
  const openContextMenu = useUIStore((s) => s.openContextMenu)

  useEffect(() => {
    if (isSelected && trRef.current && imageRef.current) {
      trRef.current.nodes([imageRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  useEffect(() => {
    if (!item.src) return
    const anim = getGifler()(pathToUrl(item.src))
    anim.frames(canvasRef.current, (ctx: CanvasRenderingContext2D, frame: { buffer: HTMLCanvasElement }) => {
      canvasRef.current.width = frame.buffer.width
      canvasRef.current.height = frame.buffer.height
      ctx.drawImage(frame.buffer, 0, 0)
      imageRef.current?.getLayer()?.batchDraw()
    })
    return () => anim.stop?.()
  }, [item.src])

  const handleTransformStart = () => {
    transformStart.current = {
      x: item.x, y: item.y,
      width: item.width, height: item.height,
      rotation: item.rotation,
    }
  }

  const handleTransformEnd = () => {
    const node = imageRef.current
    if (!node) return
    const after = {
      x: node.x(),
      y: node.y(),
      width: Math.max(10, node.width() * node.scaleX()),
      height: Math.max(10, node.height() * node.scaleY()),
      rotation: node.rotation(),
    }
    node.scaleX(1)
    node.scaleY(1)
    updateItem(activeBoardId, item.id, after)
    if (transformStart.current) {
      useHistoryStore.getState().push('ITEM_STYLE', activeBoardId,
        { id: item.id, ...transformStart.current },
        { id: item.id, ...after }
      )
      transformStart.current = null
    }
  }

  return (
    <>
      <KonvaImage
        ref={imageRef}
        image={canvasRef.current}
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        rotation={item.rotation}
        opacity={item.opacity}
        stroke={isSelected ? '#b99455' : undefined}
        strokeWidth={isSelected ? 2 : 0}
        shadowEnabled={isSelected}
        shadowColor="rgba(185,148,85,0.7)"
        shadowBlur={20}
        shadowOpacity={0.8}
        draggable={toolMode === 'select' && !item.locked}
        onClick={(e: KonvaEventObject<MouseEvent>) => {
          e.cancelBubble = true
          if (toolMode === 'connect') {
            const ui = useUIStore.getState()
            const canvas = useCanvasStore.getState()
            if (!ui.connectFromId) {
              ui.setConnectFromId(item.id)
            } else if (ui.connectFromId !== item.id) {
              const conn: Connection = {
                id: nanoid(), fromId: ui.connectFromId, toId: item.id,
                fromAnchor: 'auto', toAnchor: 'auto', style: 'bezier',
                color: '#b99455', width: 1.5, arrowHead: 'arrow', dashed: false,
              }
              canvas.addConnection(activeBoardId, conn)
              useHistoryStore.getState().push('CONNECTION_ADD', activeBoardId, null, conn)
              ui.setConnectFromId(null)
              ui.setToolMode('select')
            }
            return
          }
          if (toolMode === 'select') {
            if (e.evt.shiftKey) {
              useCanvasStore.getState().addToSelection(item.id)
            } else {
              setSelection([item.id])
            }
          }
        }}
        onContextMenu={(e: KonvaEventObject<PointerEvent>) => {
          e.evt.preventDefault()
          e.cancelBubble = true
          if (!isSelected) setSelection([item.id])
          openContextMenu(e.evt.clientX, e.evt.clientY)
        }}
        onDragStart={() => {
          dragStart.current = { x: item.x, y: item.y }
          spatialIndex.rebuild(useCanvasStore.getState().items())
        }}
        onDragMove={(e) => {
          const node = e.target
          const dragged = { ...item, x: node.x(), y: node.y() }
          const viewport = useCanvasStore.getState().viewport()
          const snapped = snapItem(dragged, useCanvasStore.getState().items(), viewport, { invertSnap: e.evt.ctrlKey })
          node.x(snapped.x)
          node.y(snapped.y)
          useUIStore.getState().bumpSnap()
        }}
        onDragEnd={(e) => {
          snapLines.length = 0
          useUIStore.getState().bumpSnap()
          const newX = e.target.x(), newY = e.target.y()
          updateItem(activeBoardId, item.id, { x: newX, y: newY })
          if (dragStart.current) {
            useHistoryStore.getState().push('ITEM_MOVE', activeBoardId,
              { id: item.id, x: dragStart.current.x, y: dragStart.current.y },
              { id: item.id, x: newX, y: newY }
            )
            dragStart.current = null
          }
        }}
        onTransformStart={handleTransformStart}
        onTransformEnd={handleTransformEnd}
      />
      {isSelected && !item.locked && (
        <Transformer ref={trRef} keepRatio={false} rotateEnabled />
      )}
    </>
  )
}
