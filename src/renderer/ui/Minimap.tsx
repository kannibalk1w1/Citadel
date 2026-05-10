import React, { useRef, useEffect } from 'react'
import { useCanvasStore } from '../store/canvasStore'

const MAP_W = 160
const MAP_H = 100

export function Minimap(): React.ReactElement | null {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const items = useCanvasStore((s) => s.items())
  const viewport = useCanvasStore((s) => s.viewport())
  const updateViewport = useCanvasStore((s) => s.updateViewport)

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

    for (const item of items) {
      ctx.fillStyle = '#2e2820'
      ctx.fillRect(item.x * scale + ox, item.y * scale + oy, item.width * scale, item.height * scale)
    }

    // Viewport rect
    const sidebarW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-right-w') || '164')
    const vx = (-viewport.x / viewport.scale) * scale + ox
    const vy = (-viewport.y / viewport.scale) * scale + oy
    const vw = ((window.innerWidth - sidebarW) / viewport.scale) * scale
    const vh = (window.innerHeight / viewport.scale) * scale
    ctx.strokeStyle = 'rgba(200,169,110,0.6)'
    ctx.lineWidth = 1
    ctx.strokeRect(vx, vy, vw, vh)
  }, [items, viewport])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = (e.clientX - rect.left) / MAP_W
    const my = (e.clientY - rect.top) / MAP_H
    updateViewport({
      x: -(mx * window.innerWidth / viewport.scale - window.innerWidth / 2),
      y: -(my * window.innerHeight / viewport.scale - window.innerHeight / 2),
    })
  }

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
      <canvas ref={canvasRef} width={MAP_W} height={MAP_H} onClick={handleClick} style={{ cursor: 'crosshair', display: 'block' }} />
    </div>
  )
}
