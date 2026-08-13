import React, { useRef, useEffect, useCallback } from 'react'
import type { Viewport } from '../../types'
import { useCanvasStore } from '../store/canvasStore'
import {
  buildMinimapModel,
  containsRectPoint,
  viewportForMinimapCenter,
  viewportForMinimapDrag,
  type MinimapModel,
} from './minimapModel'

const MAP_W = 176
const MAP_H = 112
const SIDEBAR_W = 164

function itemColour(type: string, selected: boolean, meta?: Record<string, unknown>): string {
  if (selected) return '#b8c2bd'
  switch (type) {
    case 'image':
    case 'gif':        return '#4a5260'
    case 'video':
    case 'youtube':    return '#35475a'
    case 'sticky':     return (meta?.color as string) ?? '#1e1b18'
    case 'text':       return '#34402f'
    case 'swatch':     return '#5b4422'
    case 'comparison': return '#40322b'
    case 'audio':      return '#3b3047'
    case 'model3d':    return '#3d4b58'
    default:           return '#2a2722'
  }
}

export function Minimap(): React.ReactElement | null {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modelRef = useRef<MinimapModel | null>(null)
  const dragRef = useRef<{
    mode: 'viewport' | 'center'
    startX: number
    startY: number
    startViewport: Viewport
  } | null>(null)
  const dragListenersRef = useRef<{ move: (e: MouseEvent) => void; up: (e: MouseEvent) => void } | null>(null)

  const items = useCanvasStore((s) => s.items())
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const viewport = useCanvasStore((s) => s.viewport())
  const updateViewport = useCanvasStore((s) => s.updateViewport)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, MAP_W, MAP_H)
    ctx.fillStyle = '#161514'
    ctx.fillRect(0, 0, MAP_W, MAP_H)

    const canvasW = window.innerWidth - SIDEBAR_W
    const canvasH = window.innerHeight
    const model = buildMinimapModel(items, viewport, selectedIds, MAP_W, MAP_H, canvasW, canvasH)
    modelRef.current = model

    if (items.length === 0) {
      ctx.fillStyle = '#675f54'
      ctx.font = '9px JetBrains Mono, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('empty', MAP_W / 2, MAP_H / 2 + 3)
      return
    }

    for (const rect of model.items) {
      const source = items.find((item) => item.id === rect.id)
      ctx.fillStyle = itemColour(rect.type, rect.selected, source?.meta)
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
      ctx.strokeStyle = rect.selected ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.08)'
      ctx.lineWidth = rect.selected ? 1 : 0.5
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
    }

    ctx.fillStyle = 'rgba(185,148,85,0.08)'
    ctx.fillRect(model.viewport.x, model.viewport.y, model.viewport.width, model.viewport.height)
    ctx.strokeStyle = 'rgba(185,148,85,0.85)'
    ctx.lineWidth = 1.2
    ctx.strokeRect(model.viewport.x, model.viewport.y, model.viewport.width, model.viewport.height)
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'
    ctx.lineWidth = 0.5
    ctx.strokeRect(
      model.viewport.x + 2,
      model.viewport.y + 2,
      Math.max(0, model.viewport.width - 4),
      Math.max(0, model.viewport.height - 4),
    )
  }, [items, selectedIds, viewport])

  const navigateTo = useCallback((minimapX: number, minimapY: number) => {
    updateViewport(viewportForMinimapCenter(
      minimapX,
      minimapY,
      modelRef.current?.transform ?? { scale: 1, ox: 0, oy: 0 },
      viewport.scale,
      window.innerWidth - SIDEBAR_W,
      window.innerHeight,
    ))
  }, [updateViewport, viewport.scale])

  useEffect(() => {
    return () => {
      if (dragListenersRef.current) {
        window.removeEventListener('mousemove', dragListenersRef.current.move)
        window.removeEventListener('mouseup', dragListenersRef.current.up)
        dragListenersRef.current = null
      }
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const model = modelRef.current
    const inViewport = model ? containsRectPoint(model.viewport, mx, my) : false
    dragRef.current = {
      mode: inViewport ? 'viewport' : 'center',
      startX: mx,
      startY: my,
      startViewport: viewport,
    }
    if (!inViewport) navigateTo(mx, my)

    const onMove = (ev: MouseEvent) => {
      const drag = dragRef.current
      const bounds = canvasRef.current?.getBoundingClientRect()
      const currentModel = modelRef.current
      if (!drag || !bounds || !currentModel) return

      const x = ev.clientX - bounds.left
      const y = ev.clientY - bounds.top
      if (drag.mode === 'viewport') {
        updateViewport(viewportForMinimapDrag(
          drag.startViewport,
          x - drag.startX,
          y - drag.startY,
          currentModel.transform,
        ))
      } else {
        navigateTo(x, y)
      }
    }

    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      dragListenersRef.current = null
    }

    dragListenersRef.current = { move: onMove, up: onUp }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [navigateTo, updateViewport, viewport])

  return (
    <div
      className="citadel-minimap"
      style={{
        position: 'absolute',
        bottom: 12,
        right: 'calc(var(--context-rail-w) + 8px)',
        width: MAP_W,
        height: MAP_H,
        border: '1px solid rgba(185,148,85,0.25)',
        borderRadius: 4,
        overflow: 'hidden',
        zIndex: 30,
        background: '#161514',
        boxShadow: '0 4px 16px rgba(0,0,0,0.8)',
      }}
    >
      <canvas
        ref={canvasRef}
        width={MAP_W}
        height={MAP_H}
        onMouseDown={handleMouseDown}
        style={{ cursor: 'grab', display: 'block' }}
      />
    </div>
  )
}
