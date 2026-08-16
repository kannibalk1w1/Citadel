import React, { useEffect, useRef } from 'react'
import { Text, Rect, Transformer } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { useUIStore } from '../../store/uiStore'
import { preferTextSilhouette } from '../../assets/textDetailPolicy'
import { handleConnectRelicClick } from '../connections/connectInteraction'
import { snapItem } from '../snapping/snapEngine'
import { spatialIndex } from '../snapping/spatialIndex'
import { snapLines } from '../overlays/SnapGuides'
import { canvasColor, canvasFont, resolveCanvasColor, resolveCanvasFontSize } from '../../theme/canvasColors'
import { selectionTransformerStyle } from './selectionTransformerStyle'

type Props = { item: CanvasItem }

export function TextItem({ item }: Props): React.ReactElement {
  const isSelected = useCanvasStore((s) => s.selectedIds.includes(item.id))
  const setSelection = useCanvasStore((s) => s.setSelection)
  const updateItem = useCanvasStore((s) => s.updateItem)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)!
  const toolMode = useUIStore((s) => s.toolMode)
  const setEditingItemId = useUIStore((s) => s.setEditingItemId)
  const openContextMenu = useUIStore((s) => s.openContextMenu)
  const scale = useCanvasStore((s) => s.viewport().scale)
  const isEditing = useUIStore((s) => s.editingItemId === item.id)

  const textRef = useRef<import('konva/lib/shapes/Text').Text>(null)
  const trRef = useRef<import('konva/lib/shapes/Transformer').Transformer>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const transformStart = useRef<{ x: number; y: number; width: number; height: number; rotation: number } | null>(null)

  useEffect(() => {
    if (isSelected && trRef.current && textRef.current) {
      trRef.current.nodes([textRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  const content = (item.meta?.content as string) ?? ''
  // Konva paints to a 2D context, which cannot read CSS variables — see
  // theme/canvasColors.ts. Everything below is resolved before it gets there.
  const fontSize = resolveCanvasFontSize(item.meta?.fontSize, 16)
  const fontStyle = (item.meta?.fontStyle as string) ?? 'normal'
  const align = (item.meta?.align as string) ?? 'left'
  const color = resolveCanvasColor(item.meta?.color, 'textPrimary')

  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    if (toolMode === 'connect') {
      handleConnectRelicClick(activeBoardId, item.id)
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
    const snapped = snapItem(dragged, viewport, { invertSnap: e.evt.ctrlKey })
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
    transformStart.current = {
      x: item.x, y: item.y,
      width: item.width, height: item.height,
      rotation: item.rotation,
    }
  }

  const handleTransformEnd = () => {
    const node = textRef.current
    if (!node) return
    const after = {
      x: node.x(),
      y: node.y(),
      width: Math.max(60, node.width() * node.scaleX()),
      height: Math.max(20, node.height() * node.scaleY()),
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

  if (preferTextSilhouette(fontSize, scale, isSelected, isEditing)) {
    return (
      <Rect
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        rotation={item.rotation}
        opacity={item.opacity * 0.6}
        fill="#675f54"
        cornerRadius={2}
        draggable={toolMode === 'select' && !item.locked}
        onClick={handleClick}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      />
    )
  }

  return (
    <>
      {isSelected && (
        <Rect
          x={item.x - 4} y={item.y - 4}
          width={item.width + 8} height={item.height + 8}
          fill={undefined}
          stroke={canvasColor("accent")}
          strokeWidth={1.5}
          shadowEnabled
          shadowColor="rgba(185,148,85,0.7)"
          shadowBlur={16}
          cornerRadius={2}
          listening={false}
        />
      )}
      <Text
        ref={textRef}
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        rotation={item.rotation}
        opacity={item.opacity}
        text={content || 'Double-click to edit…'}
        fontSize={fontSize}
        fontFamily={canvasFont('body')}
        fontStyle={content ? fontStyle : 'normal'}
        align={align}
        fill={content ? color : '#675f54'}
        wrap="word"
        draggable={toolMode === 'select' && !item.locked}
        onClick={handleClick}
        onDblClick={(e) => {
          e.cancelBubble = true
          if (item.locked) return
          setSelection([item.id])
          setEditingItemId(item.id)
        }}
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
      {isSelected && !item.locked && (
        <Transformer
          ref={trRef}
          keepRatio={false}
          rotateEnabled
          {...selectionTransformerStyle(scale)}
        />
      )}
    </>
  )
}
