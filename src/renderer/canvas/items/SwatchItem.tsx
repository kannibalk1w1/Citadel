import React, { useEffect, useRef } from 'react'
import { Group, Rect, Text, Transformer } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { useUIStore } from '../../store/uiStore'
import { handleConnectRelicClick } from '../connections/connectInteraction'
import { snapItem } from '../snapping/snapEngine'
import { spatialIndex } from '../snapping/spatialIndex'
import { snapLines } from '../overlays/SnapGuides'

type Props = { item: CanvasItem }

export function SwatchItem({ item }: Props): React.ReactElement {
  const isSelected = useCanvasStore((s) => s.selectedIds.includes(item.id))
  const setSelection = useCanvasStore((s) => s.setSelection)
  const updateItem = useCanvasStore((s) => s.updateItem)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)!
  const toolMode = useUIStore((s) => s.toolMode)
  const openContextMenu = useUIStore((s) => s.openContextMenu)

  const groupRef = useRef<import('konva/lib/Group').Group>(null)
  const trRef = useRef<import('konva/lib/shapes/Transformer').Transformer>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const transformStart = useRef<{ x: number; y: number; width: number; height: number } | null>(null)

  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  const colors = (item.meta?.colors as string[]) ?? ['#b8c2bd']
  // Compute pixel-perfect tile boundaries to avoid sub-pixel gaps
  const n = Math.max(1, colors.length)
  const swatchX = (i: number) => Math.round((item.width * i) / n)
  const swatchW = (i: number) => Math.max(1, swatchX(i + 1) - swatchX(i))

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
    transformStart.current = { x: item.x, y: item.y, width: item.width, height: item.height }
  }

  const handleTransformEnd = () => {
    const node = groupRef.current
    if (!node) return
    const after = {
      x: node.x(),
      y: node.y(),
      width: Math.max(60, Math.abs(node.width() * node.scaleX())),
      height: Math.max(30, Math.abs(node.height() * node.scaleY())),
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
      <Group
        ref={groupRef}
        x={item.x} y={item.y}
        width={item.width} height={item.height}
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
        {colors.map((color, i) => (
          <React.Fragment key={i}>
            <Rect
              x={swatchX(i)} y={0}
              width={swatchW(i)} height={item.height - 20}
              fill={color} opacity={item.opacity}
            />
            {/* Semi-transparent backdrop for hex label */}
            <Rect
              x={swatchX(i)} y={item.height - 20}
              width={swatchW(i)} height={20}
              fill="rgba(0,0,0,0.45)"
              listening={false}
            />
            <Text
              x={swatchX(i) + 2}
              y={item.height - 16}
              width={swatchW(i) - 4}
              text={color.toUpperCase()}
              fontSize={9}
              fontFamily="var(--font-mono)"
              fill={color}
              align="center"
              listening={false}
            />
          </React.Fragment>
        ))}
        {/* Selection glow overlay */}
        {isSelected && (
          <Rect
            x={0} y={0}
            width={item.width} height={item.height}
            fill={undefined}
            stroke="#b8c2bd"
            strokeWidth={1.5}
            shadowEnabled
            shadowColor="rgba(185,148,85,0.7)"
            shadowBlur={16}
            shadowOpacity={0.8}
            listening={false}
          />
        )}
      </Group>
      {isSelected && !item.locked && (
        <Transformer
          ref={trRef}
          rotateEnabled
          keepRatio={false}
          boundBoxFunc={(_, newBox) => ({
            ...newBox,
            width: Math.max(60, newBox.width),
            height: Math.max(30, newBox.height),
          })}
        />
      )}
    </>
  )
}
