import React, { useEffect, useRef } from 'react'
import { Image as KonvaImage, Transformer } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import useImage from 'use-image'
import { nanoid } from 'nanoid'
import type { CanvasItem, Connection } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { useUIStore } from '../../store/uiStore'
import { pathToUrl } from '../../utils/pathToUrl'
import { snapItem } from '../snapping/snapEngine'
import { spatialIndex } from '../snapping/spatialIndex'
import { snapLines } from '../overlays/SnapGuides'

type Props = { item: CanvasItem }

export function ImageItem({ item }: Props): React.ReactElement | null {
  const [image] = useImage(pathToUrl(item.src ?? ''))
  const isSelected = useCanvasStore((s) => s.selectedIds.includes(item.id))
  const setSelection = useCanvasStore((s) => s.setSelection)
  const updateItem = useCanvasStore((s) => s.updateItem)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)!
  const toolMode = useUIStore((s) => s.toolMode)
  const openContextMenu = useUIStore((s) => s.openContextMenu)
  const imageRef = useRef<import('konva/lib/shapes/Image').Image>(null)
  const trRef = useRef<import('konva/lib/shapes/Transformer').Transformer>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const transformStart = useRef<{ x: number; y: number; width: number; height: number; rotation: number } | null>(null)

  useEffect(() => {
    if (isSelected && trRef.current && imageRef.current) {
      trRef.current.nodes([imageRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true

    if (toolMode === 'connect') {
      const ui = useUIStore.getState()
      const canvas = useCanvasStore.getState()
      if (!ui.connectFromId) {
        ui.setConnectFromId(item.id)
      } else if (ui.connectFromId !== item.id) {
        const conn: Connection = {
          id: nanoid(),
          fromId: ui.connectFromId,
          toId: item.id,
          fromAnchor: 'auto',
          toAnchor: 'auto',
          style: 'bezier',
          color: '#c8a96e',
          width: 1.5,
          arrowHead: 'arrow',
          dashed: false,
        }
        canvas.addConnection(activeBoardId, conn)
        useHistoryStore.getState().push('CONNECTION_ADD', activeBoardId, null, conn)
        ui.setConnectFromId(null)
        ui.setToolMode('select')
      }
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
    const snapped = snapItem(dragged, useCanvasStore.getState().items(), viewport)
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
    const node = imageRef.current
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

  if (!image) return null

  // Highlight border when this item is the connect source
  const isConnectSource = useUIStore.getState().connectFromId === item.id

  return (
    <>
      <KonvaImage
        ref={imageRef}
        image={image}
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        rotation={item.rotation}
        opacity={item.opacity}
        draggable={toolMode === 'select' && !item.locked}
        stroke={isConnectSource || isSelected ? '#c8a96e' : undefined}
        strokeWidth={isConnectSource || isSelected ? 2 : 0}
        shadowEnabled={isSelected}
        shadowColor="rgba(200,169,110,0.7)"
        shadowBlur={20}
        shadowOpacity={0.8}
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
      />
      {isSelected && !item.locked && <Transformer ref={trRef} rotateEnabled keepRatio={false} />}
    </>
  )
}
