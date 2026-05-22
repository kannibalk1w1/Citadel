import React, { useCallback, useRef, useState } from 'react'
import { Line, Rect } from 'react-konva'
import type Konva from 'konva'
import { useUIStore } from '../../store/uiStore'
import { useCanvasStore } from '../../store/canvasStore'

type Point = [number, number]

function pointsInPolygon(polygon: Point[], items: ReturnType<typeof useCanvasStore.getState>['items']): string[] {
  const selected: string[] = []
  for (const item of items()) {
    const cx = item.x + item.width / 2
    const cy = item.y + item.height / 2
    if (pointInPolygon([cx, cy], polygon)) selected.push(item.id)
  }
  return selected
}

function pointInPolygon([px, py]: Point, polygon: Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

export function LassoOverlay(): React.ReactElement | null {
  const toolMode = useUIStore((s) => s.toolMode)
  const viewport = useCanvasStore((s) => s.viewport())
  const setSelection = useCanvasStore((s) => s.setSelection)
  const items = useCanvasStore((s) => s.items)
  // Store points in canvas space so they render correctly in the scaled Layer
  const [points, setPoints] = useState<number[]>([])
  const drawing = useRef(false)
  const vpRef = useRef(viewport)
  vpRef.current = viewport

  const toCanvas = (sx: number, sy: number): [number, number] => [
    (sx - vpRef.current.x) / vpRef.current.scale,
    (sy - vpRef.current.y) / vpRef.current.scale,
  ]

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (toolMode !== 'lasso') return
    drawing.current = true
    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) return
    const [cx, cy] = toCanvas(pos.x, pos.y)
    setPoints([cx, cy])
  }, [toolMode])

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!drawing.current || toolMode !== 'lasso') return
    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) return
    const [cx, cy] = toCanvas(pos.x, pos.y)
    setPoints((p) => [...p, cx, cy])
  }, [toolMode])

  const handleMouseUp = useCallback(() => {
    if (!drawing.current) return
    drawing.current = false
    const polygon: Point[] = []
    for (let i = 0; i < points.length; i += 2) {
      polygon.push([points[i], points[i + 1]])
    }
    const ids = pointsInPolygon(polygon, items)
    setSelection(ids)
    setPoints([])
  }, [points, items, setSelection])

  if (toolMode !== 'lasso') return null

  // A transparent Rect in canvas-space covering the visible screen area catches all events
  const rx = -viewport.x / viewport.scale
  const ry = -viewport.y / viewport.scale
  const rw = window.innerWidth / viewport.scale
  const rh = window.innerHeight / viewport.scale
  const strokeW = 1.5 / viewport.scale
  const dashLen = 4 / viewport.scale

  return (
    <>
      <Rect
        x={rx} y={ry} width={rw} height={rh}
        fill="transparent"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
      {points.length > 2 && (
        <Line
          points={points}
          stroke="#b99455"
          strokeWidth={strokeW}
          closed
          dash={[dashLen, dashLen]}
          listening={false}
          fill="rgba(185,148,85,0.08)"
        />
      )}
    </>
  )
}
