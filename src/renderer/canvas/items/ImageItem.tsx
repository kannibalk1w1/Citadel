import React, { useEffect, useRef } from 'react'
import { Group, Image as KonvaImage, Rect, Text, Transformer } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { CanvasItem } from '../../../types'
import { useAssetMetadata } from '../../assets/assetMetadata'
import { preferThumbnail } from '../../assets/previewPolicy'
import { ensureThumbnail } from '../../assets/thumbnailPipeline'
import { useStableImage } from './useStableImage'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { useUIStore } from '../../store/uiStore'
import { pathToUrl } from '../../utils/pathToUrl'
import { handleConnectRelicClick } from '../connections/connectInteraction'
import { snapItem } from '../snapping/snapEngine'
import { spatialIndex } from '../snapping/spatialIndex'
import { snapLines } from '../overlays/SnapGuides'
import { imageCoverCrop, imageFitRect, type ImageFitMode } from './imageFit'

type Props = { item: CanvasItem }

export function ImageItem({ item }: Props): React.ReactElement | null {
  const isSelected = useCanvasStore((s) => s.selectedIds.includes(item.id))
  const scale = useCanvasStore((s) => s.viewport().scale)
  const meta = useAssetMetadata(item.src)
  const useThumb = preferThumbnail(item.width * scale, item.height * scale, isSelected)
  const displaySrc = useThumb && meta?.thumbnailPath ? meta.thumbnailPath : item.src ?? ''
  const image = useStableImage(pathToUrl(displaySrc))
  const isMissing = meta?.exists === false
  const setSelection = useCanvasStore((s) => s.setSelection)
  const updateItem = useCanvasStore((s) => s.updateItem)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)!
  const toolMode = useUIStore((s) => s.toolMode)
  const openContextMenu = useUIStore((s) => s.openContextMenu)
  const isConnectSource = useUIStore((s) => s.connectFromId === item.id)
  const groupRef = useRef<import('konva/lib/shapes/Group').Group>(null)
  const trRef = useRef<import('konva/lib/shapes/Transformer').Transformer>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const transformStart = useRef<{ x: number; y: number; width: number; height: number; rotation: number } | null>(null)

  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  useEffect(() => { void ensureThumbnail(item.src) }, [item.src])

  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true

    if (toolMode === 'connect') {
      handleConnectRelicClick(activeBoardId, item.id)
      return
    }

    if (toolMode === 'link') {
      if (item.link) {
        const ipc = (window as unknown as { ipc: { invoke: (ch: string, args: unknown) => Promise<unknown> } }).ipc
        ipc.invoke('shell:openURL', { url: item.link })
      }
      return
    }

    if (toolMode === 'tag') {
      setSelection([item.id])
      useUIStore.getState().openPanel('tagSearch')
      return
    }

    if (toolMode !== 'select') return
    if (e.evt.shiftKey) {
      useCanvasStore.getState().addToSelection(item.id)
    } else {
      setSelection([item.id])
    }
  }

  const handleDragStart = () => {
    dragStart.current = { x: item.x, y: item.y }
    spatialIndex.rebuild(useCanvasStore.getState().items())
  }

  const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
    const node = e.target
    const dragged = { ...item, x: node.x(), y: node.y() }
    const viewport = useCanvasStore.getState().viewport()
    const snapped = snapItem(dragged, useCanvasStore.getState().items(), viewport, { invertSnap: e.evt.ctrlKey })
    node.x(snapped.x)
    node.y(snapped.y)
    useUIStore.getState().bumpSnap()
  }

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    snapLines.length = 0
    useUIStore.getState().bumpSnap()
    const newX = e.target.x()
    const newY = e.target.y()
    updateItem(activeBoardId, item.id, { x: newX, y: newY })
    if (dragStart.current) {
      useHistoryStore.getState().push('ITEM_MOVE', activeBoardId,
        { id: item.id, x: dragStart.current.x, y: dragStart.current.y },
        { id: item.id, x: newX, y: newY }
      )
      dragStart.current = null
    }
  }

  const handleTransformStart = () => {
    transformStart.current = { x: item.x, y: item.y, width: item.width, height: item.height, rotation: item.rotation }
  }

  const handleTransformEnd = () => {
    const node = groupRef.current
    if (!node) return
    const after = {
      x: node.x(),
      y: node.y(),
      width: Math.max(10, node.width() * node.scaleX()),
      height: Math.max(10, node.height() * node.scaleY()),
      rotation: node.rotation(),
    }
    updateItem(activeBoardId, item.id, after)
    node.scaleX(1)
    node.scaleY(1)
    if (transformStart.current) {
      useHistoryStore.getState().push('ITEM_STYLE', activeBoardId,
        { id: item.id, ...transformStart.current },
        { id: item.id, ...after }
      )
      transformStart.current = null
    }
  }

  if (!image && !isMissing) return null

  const fitMode = ((item.meta?.fitMode as ImageFitMode | undefined) ?? 'stretch')
  const imageWidth = image ? (image.naturalWidth || image.width) : item.width
  const imageHeight = image ? (image.naturalHeight || image.height) : item.height
  const fitRect = fitMode === 'fit' ? imageFitRect(imageWidth, imageHeight, item.width, item.height) : null
  const cropRect = fitMode === 'fill' ? imageCoverCrop(imageWidth, imageHeight, item.width, item.height) : undefined
  const missingLabel = item.src?.split(/[\\/]/).pop() ?? 'missing relic'

  return (
    <>
      <Group
        ref={groupRef}
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        rotation={item.rotation}
        draggable={toolMode === 'select' && !item.locked}
        onClick={handleClick}
        onContextMenu={(e) => {
          e.evt.preventDefault()
          e.cancelBubble = true
          if (!isSelected) setSelection([item.id])
          openContextMenu(e.evt.clientX, e.evt.clientY)
        }}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransformStart={handleTransformStart}
        onTransformEnd={handleTransformEnd}
      >
        <Rect
          x={0}
          y={0}
          width={item.width}
          height={item.height}
          fill={fitMode === 'fit' ? 'var(--bg-canvas)' : 'rgba(0,0,0,0.001)'}
          opacity={fitMode === 'fit' ? 0.75 : 1}
        />
        {isMissing || !image ? (
          <>
            <Rect
              x={0}
              y={0}
              width={item.width}
              height={item.height}
              fill="#221d18"
              stroke="#2e2820"
              strokeWidth={1}
              dash={[6, 4]}
              listening={false}
            />
            <Text
              x={8}
              y={item.height / 2 - 8}
              width={Math.max(16, item.width - 16)}
              text={missingLabel}
              fontSize={12}
              fontFamily="JetBrains Mono, monospace"
              fill="#8a7a5c"
              ellipsis
              wrap="none"
              listening={false}
            />
          </>
        ) : (
          <KonvaImage
            image={image}
            x={fitRect?.x ?? 0}
            y={fitRect?.y ?? 0}
            width={fitRect?.width ?? item.width}
            height={fitRect?.height ?? item.height}
            crop={cropRect}
            opacity={item.opacity}
            listening={false}
          />
        )}
        <Rect
          x={0}
          y={0}
          width={item.width}
          height={item.height}
          fill={undefined}
          stroke={isConnectSource || isSelected ? '#b99455' : undefined}
          strokeWidth={isConnectSource || isSelected ? 2 : 0}
          shadowEnabled={isSelected}
          shadowColor="rgba(185,148,85,0.7)"
          shadowBlur={20}
          shadowOpacity={0.8}
          listening={false}
        />
      </Group>
      {isSelected && !item.locked && <Transformer ref={trRef} rotateEnabled keepRatio={false} />}
    </>
  )
}
