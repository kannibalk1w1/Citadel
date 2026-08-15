import React, { useEffect, useRef } from 'react'
import { useUIStore } from '../store/uiStore'
import { useQuillStore } from './quillStore'

// Screen-space presenter annotations: an SVG sheet over the canvas, only
// interactive while the quill is raised. Strokes never touch the canvas
// stores — they vanish when presentation mode ends.
export function PresentationQuill(): React.ReactElement | null {
  const presentationMode = useUIStore((s) => s.presentationMode)
  const active = useQuillStore((s) => s.active)
  const strokes = useQuillStore((s) => s.strokes)
  const drawing = useQuillStore((s) => s.drawing)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!presentationMode) useQuillStore.getState().reset()
  }, [presentationMode])

  if (!presentationMode) return null
  const visible = [...strokes, ...(drawing ? [drawing] : [])]
  if (!active && visible.length === 0) return null

  const localPoint = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  return (
    <svg
      ref={svgRef}
      aria-label="Presentation pen"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 'var(--z-ui)' as React.CSSProperties['zIndex'],
        pointerEvents: active ? 'auto' : 'none',
        cursor: active ? 'crosshair' : 'default',
        touchAction: 'none',
      }}
      onPointerDown={(e) => {
        if (!active || e.button !== 0) return
        e.currentTarget.setPointerCapture(e.pointerId)
        const { x, y } = localPoint(e)
        useQuillStore.getState().beginStroke(x, y)
      }}
      onPointerMove={(e) => {
        if (!useQuillStore.getState().drawing) return
        const { x, y } = localPoint(e)
        useQuillStore.getState().extendStroke(x, y)
      }}
      onPointerUp={() => useQuillStore.getState().endStroke()}
      onPointerLeave={() => useQuillStore.getState().endStroke()}
    >
      {visible.map((stroke) => (
        <polyline
          key={stroke.id}
          points={stroke.points.join(' ')}
          fill="none"
          stroke={stroke.color}
          strokeWidth={stroke.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.92}
        />
      ))}
    </svg>
  )
}
