import React, { useEffect, useRef, useState } from 'react'
import { Group, Rect, Image as KonvaImage, Line, Circle, Text, Transformer } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import useImage from 'use-image'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { useUIStore } from '../../store/uiStore'
import { pathToUrl } from '../../utils/pathToUrl'
import { snapItem } from '../snapping/snapEngine'
import { spatialIndex } from '../snapping/spatialIndex'
import { snapLines } from '../overlays/SnapGuides'

type Props = { item: CanvasItem }

const HANDLE_HIT_W = 24

export function ComparisonItem({ item }: Props): React.ReactElement {
  const [splitX, setSplitX] = useState<number>((item.meta?.splitX as number) ?? 0.5)
  const dividerDragging = useRef(false)
  const splitXRef = useRef(splitX)

  const groupRef = useRef<import('konva/lib/shapes/Group').Group>(null)
  const trRef = useRef<import('konva/lib/shapes/Transformer').Transformer>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const transformStart = useRef<{ x: number; y: number; width: number; height: number; rotation: number } | null>(null)
  const dividerContainerRef = useRef<HTMLElement | null>(null)
  const dividerOnMoveRef = useRef<((e: MouseEvent) => void) | null>(null)
  const dividerOnUpRef = useRef<(() => void) | null>(null)

  const isSelected = useCanvasStore((s) => s.selectedIds.includes(item.id))
  const setSelection = useCanvasStore((s) => s.setSelection)
  const updateItem = useCanvasStore((s) => s.updateItem)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)!
  const toolMode = useUIStore((s) => s.toolMode)
  const openContextMenu = useUIStore((s) => s.openContextMenu)

  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  useEffect(() => {
    return () => {
      if (dividerContainerRef.current && dividerOnMoveRef.current) {
        dividerContainerRef.current.removeEventListener('mousemove', dividerOnMoveRef.current)
      }
      if (dividerOnUpRef.current) {
        window.removeEventListener('mouseup', dividerOnUpRef.current)
      }
    }
  }, [])

  const srcA = (item.meta?.srcA as string) ?? ''
  const srcB = (item.meta?.srcB as string) ?? ''
  const [imageA] = useImage(pathToUrl(srcA))
  const [imageB] = useImage(pathToUrl(srcB))

  const splitPx = item.width * splitX

  // ── Divider drag ────────────────────────────────────────────────────────────

  const startDividerDrag = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    dividerDragging.current = true
    const stage = e.target.getStage()
    const container = stage?.container()
    if (!container || !stage) return

    const savedCursor = container.style.cursor
    container.style.cursor = 'ew-resize'

    const onMove = (ev: MouseEvent) => {
      if (!dividerDragging.current) return
      const stageBox = container.getBoundingClientRect()
      const stageX = ev.clientX - stageBox.left
      const stagePos = stage.position()
      const stageScale = stage.scaleX()
      const canvasX = (stageX - stagePos.x) / stageScale - item.x
      const next = Math.max(0, Math.min(1, canvasX / item.width))
      splitXRef.current = next
      setSplitX(next)
    }

    const onUp = () => {
      dividerDragging.current = false
      container.style.cursor = savedCursor
      container.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const boardId = useCanvasStore.getState().activeBoardId
      if (!boardId) return
      const currentItem = useCanvasStore.getState().items().find((it) => it.id === item.id)
      if (!currentItem) return
      const newMeta = { ...currentItem.meta, splitX: splitXRef.current }
      useCanvasStore.getState().updateItem(boardId, item.id, { meta: newMeta })
      useHistoryStore.getState().push(
        'ITEM_STYLE',
        boardId,
        { id: item.id, meta: currentItem.meta },
        { id: item.id, meta: newMeta }
      )
    }

    dividerContainerRef.current = container
    dividerOnMoveRef.current = onMove
    dividerOnUpRef.current = onUp
    container.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Drag handlers ───────────────────────────────────────────────────────────

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
    transformStart.current = {
      x: item.x, y: item.y,
      width: item.width, height: item.height,
      rotation: item.rotation,
    }
  }

  const handleTransformEnd = () => {
    const node = groupRef.current
    if (!node) return
    const after = {
      x: node.x(),
      y: node.y(),
      width: Math.max(100, Math.abs(node.width() * node.scaleX())),
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
      <Group
        ref={groupRef}
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        rotation={item.rotation}
        draggable={toolMode === 'select' && !item.locked}
        onClick={(e: KonvaEventObject<MouseEvent>) => {
          e.cancelBubble = true
          if (toolMode !== 'select') return
          if (e.evt.shiftKey) {
            useCanvasStore.getState().addToSelection(item.id)
          } else {
            setSelection([item.id])
          }
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
        {/* Full-area hit target — allows selection by clicking anywhere on the item */}
        <Rect x={0} y={0} width={item.width} height={item.height} fill="rgba(0,0,0,0.001)" />

        {/* ── Slot B — right / background ── */}
        {imageB ? (
          <KonvaImage
            image={imageB}
            x={0} y={0}
            width={item.width} height={item.height}
            opacity={item.opacity}
            listening={false}
          />
        ) : (
          <>
            <Rect
              x={0} y={0}
              width={item.width} height={item.height}
              fill="#1a1612"
              listening={false}
            />
            <Text
              x={item.width * 0.75}
              y={item.height / 2 - 8}
              offsetX={60}
              width={120}
              align="center"
              text="B — set image"
              fontSize={11}
              fill="#5c5040"
              fontFamily="Inter, DM Sans, sans-serif"
              listening={false}
            />
          </>
        )}

        {/* ── Slot A — left / clipped foreground ── */}
        {imageA ? (
          <Group
            clipX={0} clipY={0}
            clipWidth={splitPx} clipHeight={item.height}
            listening={false}
          >
            <KonvaImage
              image={imageA}
              x={0} y={0}
              width={item.width} height={item.height}
              opacity={item.opacity}
              listening={false}
            />
          </Group>
        ) : (
          <>
            <Rect
              x={0} y={0}
              width={splitPx} height={item.height}
              fill="#221d18"
              listening={false}
            />
            <Text
              x={splitPx * 0.5}
              y={item.height / 2 - 8}
              offsetX={60}
              width={120}
              align="center"
              text="A — set image"
              fontSize={11}
              fill="#5c5040"
              fontFamily="Inter, DM Sans, sans-serif"
              listening={false}
            />
          </>
        )}

        {/* ── Divider line ── */}
        <Line
          points={[splitPx, 0, splitPx, item.height]}
          stroke="#c8a96e"
          strokeWidth={2}
          listening={false}
        />

        {/* ── Grab handle widget ── */}
        <Circle
          x={splitPx}
          y={item.height / 2}
          radius={10}
          fill="#c8a96e"
          listening={false}
        />
        <Text
          x={splitPx - 8}
          y={item.height / 2 - 6}
          text="‹ ›"
          fontSize={10}
          fill="#ffffff"
          fontFamily="JetBrains Mono, monospace"
          listening={false}
        />

        {/* ── Hit rect — transparent, catches divider drag ── */}
        <Rect
          x={splitPx}
          y={0}
          offsetX={HANDLE_HIT_W / 2}
          width={HANDLE_HIT_W}
          height={item.height}
          fill="rgba(0,0,0,0)"
          onMouseDown={startDividerDrag}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container()
            if (container) container.style.cursor = 'ew-resize'
          }}
          onMouseLeave={(e) => {
            const container = e.target.getStage()?.container()
            if (container && !dividerDragging.current) container.style.cursor = ''
          }}
        />

        {/* ── Selection glow ── */}
        {isSelected && (
          <Rect
            x={0} y={0}
            width={item.width} height={item.height}
            fill={undefined}
            stroke="#c8a96e"
            strokeWidth={2}
            shadowEnabled
            shadowColor="rgba(200,169,110,0.7)"
            shadowBlur={20}
            shadowOpacity={0.8}
            listening={false}
          />
        )}
      </Group>

      {isSelected && (
        <Transformer
          ref={trRef}
          keepRatio={false}
          rotateEnabled
        />
      )}
    </>
  )
}
