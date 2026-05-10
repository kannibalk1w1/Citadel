import React, { useRef, useEffect, useCallback } from 'react'
import { useCanvasStore } from '../store/canvasStore'

const MAP_W = 160
const MAP_H = 100
const SIDEBAR_W = 164

function itemColour(type: string, meta?: Record<string, unknown>): string {
  switch (type) {
    case 'image':
    case 'gif':
    case 'video':
    case 'youtube':   return '#2a3540'
    case 'sticky':    return (meta?.color as string) ?? '#2a2820'
    case 'text':      return '#1e2a1e'
    case 'swatch':    return '#3a2a1a'
    case 'comparison': return '#2e2420'
    case 'audio':
    case 'model3d':   return '#2a2035'
    default:          return '#2e2820'
  }
}

export function Minimap(): React.ReactElement | null {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mapTransformRef = useRef({ scale: 1, ox: 0, oy: 0 })
  const isDragging = useRef(false)
  const dragListenersRef = useRef<{ move: (e: MouseEvent) => void; up: (e: MouseEvent) => void } | null>(null)

  const items = useCanvasStore((s) => s.items())
  const viewport = useCanvasStore((s) => s.viewport())
  const updateViewport = useCanvasStore((s) => s.updateViewport)

  // ── Render minimap ──────────────────────────────────────────────────────────
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, MAP_W, MAP_H)
    ctx.fillStyle = '#221d18'
    ctx.fillRect(0, 0, MAP_W, MAP_H)

    if (items.length === 0) {
      ctx.fillStyle = '#5c5040'
      ctx.font = '9px JetBrains Mono, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('empty', MAP_W / 2, MAP_H / 2 + 3)
      mapTransformRef.current = { scale: 1, ox: 0, oy: 0 }
      return
    }

    const allX = items.flatMap((i) => [i.x, i.x + i.width])
    const allY = items.flatMap((i) => [i.y, i.y + i.height])
    const minX = Math.min(...allX), maxX = Math.max(...allX)
    const minY = Math.min(...allY), maxY = Math.max(...allY)
    const sceneW = maxX - minX || 1
    const sceneH = maxY - minY || 1
    const scale = Math.min(MAP_W / sceneW, MAP_H / sceneH) * 0.85
    const ox = (MAP_W - sceneW * scale) / 2 - minX * scale
    const oy = (MAP_H - sceneH * scale) / 2 - minY * scale

    mapTransformRef.current = { scale, ox, oy }

    for (const item of items) {
      const fill = itemColour(item.type, item.meta)
      ctx.fillStyle = fill
      ctx.fillRect(
        item.x * scale + ox,
        item.y * scale + oy,
        Math.max(1, item.width * scale),
        Math.max(1, item.height * scale),
      )
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 0.5
      ctx.strokeRect(
        item.x * scale + ox,
        item.y * scale + oy,
        Math.max(1, item.width * scale),
        Math.max(1, item.height * scale),
      )
    }

    const vx = (-viewport.x / viewport.scale) * scale + ox
    const vy = (-viewport.y / viewport.scale) * scale + oy
    const vw = ((window.innerWidth - SIDEBAR_W) / viewport.scale) * scale
    const vh = (window.innerHeight / viewport.scale) * scale
    ctx.strokeStyle = 'rgba(200,169,110,0.6)'
    ctx.lineWidth = 1
    ctx.strokeRect(vx, vy, vw, vh)
  }, [items, viewport])

  // ── Navigation helper ───────────────────────────────────────────────────────
  const navigateTo = useCallback((minimapX: number, minimapY: number) => {
    const { scale, ox, oy } = mapTransformRef.current
    const canvasX = (minimapX - ox) / scale
    const canvasY = (minimapY - oy) / scale
    const canvasW = window.innerWidth - SIDEBAR_W
    updateViewport({
      x: canvasW / 2 - canvasX * viewport.scale,
      y: window.innerHeight / 2 - canvasY * viewport.scale,
    })
  }, [updateViewport, viewport.scale])

  // ── Drag-to-pan ─────────────────────────────────────────────────────────────
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
    navigateTo(mx, my)
    isDragging.current = true

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const r = canvasRef.current?.getBoundingClientRect()
      if (!r) return
      navigateTo(ev.clientX - r.left, ev.clientY - r.top)
    }

    const onUp = () => {
      isDragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      dragListenersRef.current = null
    }

    dragListenersRef.current = { move: onMove, up: onUp }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [navigateTo])

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        right: 'calc(var(--sidebar-right-w) + 8px)',
        width: MAP_W,
        height: MAP_H,
        border: '1px solid rgba(200,169,110,0.25)',
        borderRadius: 4,
        overflow: 'hidden',
        zIndex: 30,
        background: '#221d18',
        boxShadow: '0 4px 16px rgba(0,0,0,0.8)',
      }}
    >
      <canvas
        ref={canvasRef}
        width={MAP_W}
        height={MAP_H}
        onMouseDown={handleMouseDown}
        style={{ cursor: 'crosshair', display: 'block' }}
      />
    </div>
  )
}
