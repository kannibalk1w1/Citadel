import React, { useEffect, useRef } from 'react'
import { Group, Line, Rect, Text, Transformer } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { useUIStore } from '../../store/uiStore'
import { preferTextSilhouette } from '../../assets/textDetailPolicy'
import { adoptSelectTool, handleRelicToolPress, relicPressMoves } from './relicPointer'
import { snapItem } from '../snapping/snapEngine'
import { spatialIndex } from '../snapping/spatialIndex'
import { snapLines } from '../overlays/SnapGuides'
import { canvasColor, canvasFont, resolveCanvasFontSize } from '../../theme/canvasColors'
import { selectionTransformerStyle } from './selectionTransformerStyle'

type Props = { item: CanvasItem }

export function StickyItem({ item }: Props): React.ReactElement {
  const isSelected = useCanvasStore((s) => s.selectedIds.includes(item.id))
  const attachedTarget = useCanvasStore((s) => {
    const targetId = item.meta?.kind === 'comment' ? item.meta?.attachedTo : undefined
    return typeof targetId === 'string' ? s.items().find((candidate) => candidate.id === targetId) : undefined
  })
  const setSelection = useCanvasStore((s) => s.setSelection)
  const updateItem = useCanvasStore((s) => s.updateItem)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)!
  const toolMode = useUIStore((s) => s.toolMode)
  const setEditingItemId = useUIStore((s) => s.setEditingItemId)
  const openContextMenu = useUIStore((s) => s.openContextMenu)
  const commentPinsVisible = useUIStore((s) => s.commentPinsVisible)
  const scale = useCanvasStore((s) => s.viewport().scale)
  const isEditing = useUIStore((s) => s.editingItemId === item.id)

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

  const bg = (item.meta?.color as string) ?? '#1e1b18'
  const content = (item.meta?.content as string) ?? ''
  // Resolved, not cast: a stored `var(--text-*)` string would otherwise reach
  // both Konva and the silhouette threshold's arithmetic.
  const fontSize = resolveCanvasFontSize(item.meta?.fontSize, 14)
  const align = (item.meta?.align as string) ?? 'left'
  const fontStyle = (item.meta?.fontStyle as string) ?? 'normal'
  const isComment = item.meta?.kind === 'comment'
  const isAttachedComment = isComment && typeof item.meta?.attachedTo === 'string'
  const strokeColor = isSelected ? canvasColor("accent") : isComment ? '#5a4730' : undefined
  const textY = isComment ? 25 : 8
  const textHeight = item.height - (isComment ? 33 : 16)
  const silhouette = preferTextSilhouette(fontSize, scale, isSelected, isEditing)

  if (isComment && !commentPinsVisible) return <></>

  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    if (handleRelicToolPress(toolMode, activeBoardId, item)) return
    adoptSelectTool(toolMode)
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
      width: Math.max(80, Math.abs(node.width() * node.scaleX())),
      height: Math.max(60, Math.abs(node.height() * node.scaleY())),
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
      {isAttachedComment && attachedTarget && (
        <Line
          points={[
            attachedTarget.x + attachedTarget.width,
            attachedTarget.y + attachedTarget.height / 2,
            item.x,
            item.y + item.height / 2,
          ]}
          stroke={isSelected ? canvasColor("accent") : '#5a4730'}
          strokeWidth={isSelected ? 1.4 : 1}
          opacity={0.85}
          listening={false}
          dash={[5, 5]}
        />
      )}
      <Group
        ref={groupRef}
        x={item.x} y={item.y}
        width={item.width} height={item.height}
        rotation={item.rotation}
        draggable={relicPressMoves(toolMode) && !item.locked}
        onClick={handleClick}
        onDblClick={(e) => {
          e.cancelBubble = true
          setSelection([item.id])
          if (!item.locked) setEditingItemId(item.id)
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
      >
        <Rect
          width={item.width}
          height={item.height}
          fill={bg}
          cornerRadius={isComment ? 8 : 4}
          opacity={item.opacity}
          stroke={strokeColor}
          strokeWidth={isSelected ? 2 : isComment ? 1 : 0}
          shadowEnabled={isSelected}
          shadowColor="rgba(185,148,85,0.7)"
          shadowBlur={20}
          shadowOpacity={0.8}
        />
        {isComment && (
          <>
            <Rect
              x={0}
              y={0}
              width={item.width}
              height={18}
              fill="#10100f"
              opacity={item.opacity}
              cornerRadius={[8, 8, 0, 0]}
            />
            <Rect
              x={8}
              y={7}
              width={6}
              height={6}
              fill={isAttachedComment ? canvasColor("accent") : '#505050'}
              opacity={item.opacity}
              cornerRadius={3}
            />
            {!silhouette && (
              <Text
                x={20}
                y={4}
                width={item.width - 28}
                height={12}
                text={isAttachedComment ? 'ATTACHED COMMENT' : 'COMMENT'}
                fill={canvasColor("accent")}
                fontSize={8}
                fontFamily={canvasFont('mono')}
                wrap="none"
              />
            )}
          </>
        )}
        {!silhouette && (
          <Text
            x={8} y={textY}
            width={item.width - 16}
            height={textHeight}
            text={content || 'Double-click to edit…'}
            fill={content ? canvasColor('textPrimary') : '#675f54'}
            fontSize={fontSize}
            fontStyle={fontStyle}
            fontFamily={canvasFont('body')}
            align={align}
            wrap="word"
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
            width: Math.max(80, newBox.width),
            height: Math.max(60, newBox.height),
          })}
          {...selectionTransformerStyle(scale)}
        />
      )}
    </>
  )
}
