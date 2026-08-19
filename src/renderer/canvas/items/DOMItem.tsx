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
import { filenameInscription } from '../../assets/filenameLabel'
import { snapItem } from '../snapping/snapEngine'
import { ToolIcon } from '../../ui/icons/ToolIcon'
import { spatialIndex } from '../snapping/spatialIndex'
import { snapLines } from '../overlays/SnapGuides'
import { canvasColor } from '../../theme/canvasColors'
import { resizeCursor, resizeFromHandle, resizeHandles, type ResizeHandle } from './domResize'

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
  // The vision checks style this layer as well as the canvas container.
  layer.dataset.visionSurface = 'dom'
  layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2;'
  document.getElementById('root')?.appendChild(layer)
  return layer
}

type PointerStart = {
  pointerId: number
  mode: 'move' | ResizeHandle
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
  const filenameLabelsVisible = useUIStore((s) => s.filenameLabelsVisible)
  const filenameLabel = filenameInscription(item.src, filenameLabelsVisible, viewport.scale)

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
    if (mode === 'move' && ref.current) ref.current.dataset.dragging = 'true'
    // Same contract as the Konva drag handlers: the snap engine reads nearby
    // items from the spatial index, so it has to be current before the move.
    if (mode === 'move') spatialIndex.rebuild(useCanvasStore.getState().items())
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current
    if (!start || !activeBoardId || event.pointerId !== start.pointerId) return
    event.preventDefault()
    const dx = (event.clientX - start.clientX) / viewport.scale
    const dy = (event.clientY - start.clientY) / viewport.scale
    if (start.mode === 'move') {
      const canvas = useCanvasStore.getState()
      const dragged = { ...item, ...start.item, x: start.item.x + dx, y: start.item.y + dy }
      // Ctrl inverts the snap setting mid-drag, exactly as it does on the Konva layer.
      const snapped = snapItem(dragged, canvas.viewport(), { invertSnap: event.ctrlKey })
      canvas.updateItem(activeBoardId, item.id, { x: snapped.x, y: snapped.y })
      useUIStore.getState().bumpSnap()
      return
    }
    useCanvasStore.getState().updateItem(
      activeBoardId,
      item.id,
      resizeFromHandle(start.item, start.mode, dx, dy, MIN_SIZE),
    )
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
    if (ref.current) delete ref.current.dataset.dragging
    if (start.mode === 'move') {
      snapLines.length = 0
      useUIStore.getState().bumpSnap()
    }
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
      className="citadel-dom-item"
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
      {toolMode === 'connect' && (
        // While a thread is being drawn the whole card is one target for it.
        // Without this the content underneath takes the press instead: a
        // YouTube <webview> is a separate frame and swallows every click inside
        // it outright, and video and audio would start playing on the way past.
        // No handler of its own: the press lands here rather than on the
        // content, then bubbles to this card's own onClick above. Giving it a
        // second copy of that handler fired the whole thing twice, which turned
        // landing a thread into landing it and immediately arming a new one.
        <div
          data-connect-target="true"
          style={{ position: 'absolute', inset: 0, cursor: 'crosshair' }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: -2,
          border: `${frame.strokeWidth}px ${frame.dash ? 'dashed' : 'solid'} ${isConnectSource ? 'var(--text-primary)' : frame.stroke}`,
          borderRadius: 'var(--radius-sm)',
          boxShadow: isRelated && !isSelected
            ? '0 0 18px rgba(189,150,82,0.18)'
            : isConnectSource ? '0 0 22px rgba(232,221,208,0.28)' : frame.glowOpacity > 0 ? `0 0 18px rgba(189,150,82,${frame.glowOpacity})` : 'none',
          opacity: isRelated && !isSelected ? 0.86 : 1,
          pointerEvents: 'none',
        }}
      />
      {canEdit ? (
        // Selected and editable: the badge grows into a title bar that is the
        // drag target. It sits above the frame so it never covers the item's
        // own controls — native video/audio transport, the YouTube webview, or
        // VideoItem's capture buttons at top: 6.
        <div
          onPointerDown={(event) => beginPointerAction(event, 'move')}
          title="Move"
          style={{
            position: 'absolute',
            left: -2,
            right: -2,
            top: -17,
            height: 15,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 5px',
            border: `1px solid ${frame.stroke}`,
            borderBottom: 'none',
            borderRadius: '3px 3px 0 0',
            background: variant.badgeFill,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            lineHeight: '13px',
            opacity: 0.94,
            cursor: 'move',
            pointerEvents: 'auto',
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          <span>{badge}</span>
          <span aria-hidden="true" style={{ letterSpacing: 1, opacity: 0.5 }}>⋮⋮</span>
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            left: 6,
            top: -13,
            minWidth: 26,
            height: 14,
            padding: '1px 5px',
            border: `1px solid ${frame.stroke}`,
            borderRadius: 'var(--radius-sm)',
            background: variant.badgeFill,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            lineHeight: '11px',
            opacity: 0.94,
            pointerEvents: 'none',
          }}
        >
          {badge}
        </div>
      )}
      {filenameLabel && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '100%',
            marginTop: 4,
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: '#8a7a5c',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-sm)',
            pointerEvents: 'none',
          }}
        >
          {filenameLabel}
        </div>
      )}
      <div style={{ position: 'absolute', inset: -3, pointerEvents: 'none', opacity: variant.lineOpacity }}>
        {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const).map((corner) => {
          const horizontal: React.CSSProperties = {
            position: 'absolute',
            width: variant.cornerSize,
            height: variant.cornerThickness,
            background: frame.stroke,
            [corner.includes('Right') ? 'right' : 'left']: 0,
            [corner.includes('bottom') ? 'bottom' : 'top']: 0,
          }
          const vertical: React.CSSProperties = {
            position: 'absolute',
            width: variant.cornerThickness,
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
          {/* Moving is the title bar's job — see above. The resize grips sit on
              the frame, leaving video/audio controls and webviews clickable. */}
          {resizeHandles.map((handle) => {
            const horizontal = handle.includes('left') ? 'left' : handle.includes('right') ? 'right' : 'center'
            const vertical = handle.includes('top') ? 'top' : handle.includes('bottom') ? 'bottom' : 'center'
            return (
              <div
                key={handle}
                data-testid={`resize-${handle}`}
                onPointerDown={(event) => beginPointerAction(event, handle)}
                title="Resize"
                style={{
                  position: 'absolute',
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: 'var(--bg-panel)',
                  border: '1.5px solid var(--accent)',
                  boxShadow: '0 1px 5px rgba(0,0,0,0.6)',
                  cursor: resizeCursor[handle],
                  pointerEvents: 'auto',
                  zIndex: 2,
                  [horizontal === 'left' ? 'left' : horizontal === 'right' ? 'right' : 'left']: horizontal === 'center' ? '50%' : -5,
                  [vertical === 'top' ? 'top' : vertical === 'bottom' ? 'bottom' : 'top']: vertical === 'center' ? '50%' : -5,
                  transform: `translate(${horizontal === 'center' ? '-50%' : '0'}, ${vertical === 'center' ? '-50%' : '0'})`,
                }}
              />
            )
          })}
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
          title="Locked"
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            color: canvasColor("accent"),
            lineHeight: 0,
            filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.85))',
            pointerEvents: 'none',
          }}
        >
          <ToolIcon name="lock" size={14} />
        </div>
      )}
    </div>,
    domLayerTarget()
  )
}
