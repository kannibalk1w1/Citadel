import React, { useEffect, useRef } from 'react'
import { Image as KonvaImage, Text as KonvaText, Transformer } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { FILENAME_LABEL_FONT_PX, filenameInscription } from '../../assets/filenameLabel'
// gifler is a browserify bundle — it has no ESM default export.
// It does set window.gifler itself, so we use a side-effect import + window access.
import 'gifler'
import type { CanvasItem } from '../../../types'
import { useAssetMetadata } from '../../assets/assetMetadata'
import { preferThumbnail } from '../../assets/previewPolicy'
import { ensureThumbnail, generateGifFirstFrameThumbnail } from '../../assets/thumbnailPipeline'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { useUIStore } from '../../store/uiStore'
import { pathToUrl } from '../../utils/pathToUrl'
import { handleConnectRelicClick } from '../connections/connectInteraction'
import { snapItem } from '../snapping/snapEngine'
import { spatialIndex } from '../snapping/spatialIndex'
import { snapLines } from '../overlays/SnapGuides'
import { useStableImage } from './useStableImage'
import { canvasColor } from '../../theme/canvasColors'
import { selectionTransformerStyle } from './selectionTransformerStyle'

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
  const scale = useCanvasStore((s) => s.viewport().scale)
  const meta = useAssetMetadata(item.src)
  const useThumb = preferThumbnail(item.width * scale, item.height * scale, isSelected)
  const thumbImage = useStableImage(useThumb && meta?.thumbnailPath ? pathToUrl(meta.thumbnailPath) : '')
  const setSelection = useCanvasStore((s) => s.setSelection)
  const updateItem = useCanvasStore((s) => s.updateItem)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)!
  const toolMode = useUIStore((s) => s.toolMode)
  const openContextMenu = useUIStore((s) => s.openContextMenu)
  const filenameLabelsVisible = useUIStore((s) => s.filenameLabelsVisible)
  const filenameLabel = filenameInscription(item.src, filenameLabelsVisible, scale)
  const displayImage = useThumb && meta?.thumbnailPath && thumbImage ? thumbImage : canvasRef.current

  useEffect(() => {
    if (isSelected && trRef.current && imageRef.current) {
      trRef.current.nodes([imageRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  useEffect(() => {
    if (!item.src) return
    void ensureThumbnail(item.src, generateGifFirstFrameThumbnail)
  }, [item.src])

  useEffect(() => {
    if (!item.src || (useThumb && meta?.thumbnailPath)) return
    let awake = true
    const anim = getGifler()(pathToUrl(item.src))
    anim.frames(canvasRef.current, (ctx: CanvasRenderingContext2D, frame: { buffer: HTMLCanvasElement }) => {
      if (!awake) return
      canvasRef.current.width = frame.buffer.width
      canvasRef.current.height = frame.buffer.height
      ctx.drawImage(frame.buffer, 0, 0)
      imageRef.current?.getLayer()?.batchDraw()
    })
    return () => {
      awake = false
      anim.stop?.()
    }
  }, [item.src, meta?.thumbnailPath, useThumb])

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
        image={displayImage}
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        rotation={item.rotation}
        opacity={item.opacity}
        stroke={isSelected ? canvasColor("accent") : undefined}
        strokeWidth={isSelected ? 2 : 0}
        shadowEnabled={isSelected}
        shadowColor="rgba(185,148,85,0.7)"
        shadowBlur={20}
        shadowOpacity={0.8}
        draggable={toolMode === 'select' && !item.locked}
        onClick={(e: KonvaEventObject<MouseEvent>) => {
          e.cancelBubble = true
          if (toolMode === 'connect') {
            handleConnectRelicClick(activeBoardId, item.id)
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
          const snapped = snapItem(dragged, viewport, { invertSnap: e.evt.ctrlKey })
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
      {filenameLabel && (
        <KonvaText
          x={item.x}
          y={item.y + item.height + 4}
          width={item.width}
          text={filenameLabel}
          fontSize={FILENAME_LABEL_FONT_PX}
          fontFamily="JetBrains Mono, monospace"
          fill="#8a7a5c"
          ellipsis
          wrap="none"
          listening={false}
        />
      )}
      {isSelected && !item.locked && (
        <Transformer ref={trRef} keepRatio={false} rotateEnabled {...selectionTransformerStyle(scale)} />
      )}
    </>
  )
}
