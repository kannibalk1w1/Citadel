// Shared wrapper for DOM-layer items (video, youtube, audio, model3d).
// Renders children as an absolutely-positioned div synced to canvas coordinates.
import React, { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { useUIStore } from '../../store/uiStore'
import { canvasToScreen } from '../../../types'

type Props = {
  item: CanvasItem
  children: React.ReactNode
  style?: React.CSSProperties
  onClick?: React.MouseEventHandler<HTMLDivElement>
  editableFrame?: boolean
}

// Mount point for all DOM items
let domLayer = document.getElementById('dom-items-layer')
if (!domLayer) {
  domLayer = document.createElement('div')
  domLayer.id = 'dom-items-layer'
  domLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:var(--z-dom-items,10);'
  document.getElementById('root')?.appendChild(domLayer)
}

type PointerStart = {
  pointerId: number
  mode: 'move' | 'resize-se'
  clientX: number
  clientY: number
  item: Pick<CanvasItem, 'x' | 'y' | 'width' | 'height'>
}

const MIN_SIZE = 32

export function DOMItem({ item, children, style, onClick, editableFrame = false }: Props): React.ReactElement {
  const viewport = useCanvasStore((s) => s.viewport())
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)
  const toolMode = useUIStore((s) => s.toolMode)
  const ref = useRef<HTMLDivElement>(null)
  const pointerStart = useRef<PointerStart | null>(null)
  const isSelected = selectedIds.includes(item.id)
  const canEdit = editableFrame && isSelected && !item.locked && toolMode === 'select' && !!activeBoardId

  useLayoutEffect(() => {
    if (!ref.current) return
    const rect = canvasToScreen(item, viewport)
    ref.current.style.left = `${rect.left}px`
    ref.current.style.top = `${rect.top}px`
    ref.current.style.width = `${rect.width}px`
    ref.current.style.height = `${rect.height}px`
    ref.current.style.transform = `rotate(${item.rotation}deg)`
  })

  const beginPointerAction = (event: React.PointerEvent<HTMLDivElement>, mode: PointerStart['mode']) => {
    if (!canEdit || !activeBoardId) return
    event.preventDefault()
    event.stopPropagation()
    ref.current?.setPointerCapture(event.pointerId)
    pointerStart.current = {
      pointerId: event.pointerId,
      mode,
      clientX: event.clientX,
      clientY: event.clientY,
      item: { x: item.x, y: item.y, width: item.width, height: item.height },
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current
    if (!start || !activeBoardId || event.pointerId !== start.pointerId) return
    event.preventDefault()
    const dx = (event.clientX - start.clientX) / viewport.scale
    const dy = (event.clientY - start.clientY) / viewport.scale
    if (start.mode === 'move') {
      useCanvasStore.getState().updateItem(activeBoardId, item.id, {
        x: start.item.x + dx,
        y: start.item.y + dy,
      })
      return
    }
    useCanvasStore.getState().updateItem(activeBoardId, item.id, {
      width: Math.max(MIN_SIZE, start.item.width + dx),
      height: Math.max(MIN_SIZE, start.item.height + dy),
    })
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current
    if (!start || !activeBoardId || event.pointerId !== start.pointerId) return
    ref.current?.releasePointerCapture(event.pointerId)
    pointerStart.current = null
    const after = useCanvasStore.getState().items().find((candidate) => candidate.id === item.id)
    if (!after) return
    const before = { id: item.id, ...start.item }
    const next = { id: item.id, x: after.x, y: after.y, width: after.width, height: after.height }
    const changed = before.x !== next.x || before.y !== next.y || before.width !== next.width || before.height !== next.height
    if (changed) {
      useHistoryStore.getState().push(start.mode === 'move' ? 'ITEM_MOVE' : 'ITEM_STYLE', activeBoardId, before, next)
    }
  }

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'absolute',
        transformOrigin: 'top left',
        opacity: item.opacity,
        pointerEvents: 'auto',
        overflow: 'hidden',
        ...style,
      }}
      onClick={onClick}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {children}
      {canEdit && (
        <>
          <div
            onPointerDown={(event) => beginPointerAction(event, 'move')}
            title="Move"
            style={{
              position: 'absolute',
              inset: 0,
              border: '2px solid var(--accent)',
              boxShadow: '0 0 18px rgba(200,169,110,0.35)',
              cursor: 'move',
              pointerEvents: 'auto',
            }}
          />
          <div
            onPointerDown={(event) => beginPointerAction(event, 'resize-se')}
            title="Resize"
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: 14,
              height: 14,
              background: 'var(--accent)',
              border: '1px solid var(--bg-canvas)',
              cursor: 'nwse-resize',
              pointerEvents: 'auto',
            }}
          />
        </>
      )}
      {item.tint && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: item.tint.color,
          opacity: item.tint.opacity,
          mixBlendMode: 'multiply',
        }} />
      )}
      {item.locked && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            color: '#b99455',
            fontSize: 14,
            lineHeight: 1,
            textShadow: '0 1px 4px rgba(0,0,0,0.85)',
            pointerEvents: 'none',
          }}
        >
          🔒
        </div>
      )}
    </div>,
    domLayer!
  )
}
