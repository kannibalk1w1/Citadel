// Shared wrapper for DOM-layer items (video, youtube, audio, model3d).
// Renders children as an absolutely-positioned div synced to canvas coordinates.
import React, { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { useUIStore } from '../../store/uiStore'
import { canvasToScreen } from '../../../types'
import { chromeFrameStyle, connectedItemIds, frameVariant, frameVariantStyle, itemTypeBadge } from '../overlays/boardChromeViewModel'

type Props = {
  item: CanvasItem
  children: React.ReactNode
  style?: React.CSSProperties
  onClick?: React.MouseEventHandler<HTMLDivElement>
  editableFrame?: boolean
}

function domLayerTarget(): HTMLElement {
  const existing = document.getElementById('dom-items-layer')
  if (existing) return existing

  const layer = document.createElement('div')
  layer.id = 'dom-items-layer'
  layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2;'
  document.getElementById('root')?.appendChild(layer)
  return layer
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
  const connections = useCanvasStore((s) => s.connections())
  const toolMode = useUIStore((s) => s.toolMode)
  const connectFromId = useUIStore((s) => s.connectFromId)
  const ref = useRef<HTMLDivElement>(null)
  const pointerStart = useRef<PointerStart | null>(null)
  const isSelected = selectedIds.includes(item.id)
  const isConnectSource = toolMode === 'connect' && connectFromId === item.id
  const relatedIds = selectedIds.length === 1 ? connectedItemIds(selectedIds[0], connections) : new Set<string>()
  const isRelated = relatedIds.has(item.id)
  const canEdit = editableFrame && isSelected && !item.locked && toolMode === 'select' && !!activeBoardId
  const frame = chromeFrameStyle({ selected: isSelected || isConnectSource, locked: item.locked })
  const variant = frameVariantStyle(frameVariant(item))
  const badge = itemTypeBadge(item)

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
    if (ref.current?.isConnected) {
      try {
        ref.current.setPointerCapture(event.pointerId)
      } catch {
        // Pointer capture can fail if the target is replaced during a React update.
      }
    }
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
    if (ref.current?.hasPointerCapture(event.pointerId)) {
      try {
        ref.current.releasePointerCapture(event.pointerId)
      } catch {
        // If the pointer was already released, keep the item update and history write.
      }
    }
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
        overflow: 'visible',
        ...style,
      }}
      onClick={onClick}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {children}
      <div
        style={{
          position: 'absolute',
          inset: -2,
          border: `${frame.strokeWidth}px ${frame.dash ? 'dashed' : 'solid'} ${isConnectSource ? 'var(--text-primary)' : frame.stroke}`,
          borderRadius: 3,
          boxShadow: isRelated && !isSelected
            ? '0 0 18px rgba(189,150,82,0.18)'
            : isConnectSource ? '0 0 22px rgba(232,221,208,0.28)' : frame.glowOpacity > 0 ? `0 0 18px rgba(189,150,82,${frame.glowOpacity})` : 'none',
          opacity: isRelated && !isSelected ? 0.86 : 1,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 6,
          top: -13,
          minWidth: 26,
          height: 14,
          padding: '1px 5px',
          border: `1px solid ${frame.stroke}`,
          borderRadius: 2,
          background: variant.badgeFill,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 8,
          lineHeight: '11px',
          opacity: 0.94,
          pointerEvents: 'none',
        }}
      >
        {badge}
      </div>
      <div style={{ position: 'absolute', inset: -3, pointerEvents: 'none', opacity: variant.lineOpacity }}>
        {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const).map((corner) => {
          const horizontal: React.CSSProperties = {
            position: 'absolute',
            width: variant.cornerSize,
            height: 1,
            background: frame.stroke,
            [corner.includes('Right') ? 'right' : 'left']: 0,
            [corner.includes('bottom') ? 'bottom' : 'top']: 0,
          }
          const vertical: React.CSSProperties = {
            position: 'absolute',
            width: 1,
            height: variant.cornerSize,
            background: frame.stroke,
            [corner.includes('Right') ? 'right' : 'left']: 0,
            [corner.includes('bottom') ? 'bottom' : 'top']: 0,
          }
          return <React.Fragment key={corner}><div style={horizontal} /><div style={vertical} /></React.Fragment>
        })}
      </div>
      {canEdit && (
        <>
          <div
            onPointerDown={(event) => beginPointerAction(event, 'move')}
            title="Move"
            style={{
              position: 'absolute',
              inset: 0,
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
    domLayerTarget()
  )
}
