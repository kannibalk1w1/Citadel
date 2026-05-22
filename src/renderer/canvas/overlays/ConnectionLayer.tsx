import React from 'react'
import type { CanvasItem, Connection, Viewport } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'

type Props = {
  viewport: Viewport
  items: CanvasItem[]
  rubberBand?: { x1: number; y1: number; x2: number; y2: number } | null
}

function closestSide(from: CanvasItem, to: CanvasItem): { fromSide: Connection['fromAnchor']; toSide: Connection['toAnchor'] } {
  const fc = { x: from.x + from.width / 2, y: from.y + from.height / 2 }
  const tc = { x: to.x + to.width / 2, y: to.y + to.height / 2 }
  const dx = tc.x - fc.x
  const dy = tc.y - fc.y

  let fromSide: Connection['fromAnchor']
  let toSide: Connection['toAnchor']

  if (Math.abs(dx) > Math.abs(dy)) {
    fromSide = dx > 0 ? 'right' : 'left'
    toSide = dx > 0 ? 'left' : 'right'
  } else {
    fromSide = dy > 0 ? 'bottom' : 'top'
    toSide = dy > 0 ? 'top' : 'bottom'
  }

  return { fromSide, toSide }
}

function getAnchorPoint(item: CanvasItem, side: Connection['fromAnchor'], fromItem?: CanvasItem): { x: number; y: number } {
  const cx = item.x + item.width / 2
  const cy = item.y + item.height / 2
  if (side === 'auto' && fromItem) {
    const { fromSide, toSide } = closestSide(fromItem, item)
    side = fromItem === item ? fromSide : toSide
  }
  switch (side) {
    case 'top':    return { x: cx, y: item.y }
    case 'bottom': return { x: cx, y: item.y + item.height }
    case 'left':   return { x: item.x, y: cy }
    case 'right':  return { x: item.x + item.width, y: cy }
    default:       return { x: cx, y: cy }
  }
}

function toScreen(pt: { x: number; y: number }, vp: Viewport): { x: number; y: number } {
  return { x: pt.x * vp.scale + vp.x, y: pt.y * vp.scale + vp.y }
}

function bezierPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dx = Math.abs(to.x - from.x) * 0.5
  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`
}

function elbowPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const mx = (from.x + to.x) / 2
  return `M ${from.x} ${from.y} L ${mx} ${from.y} L ${mx} ${to.y} L ${to.x} ${to.y}`
}

export function ConnectionLayer({ viewport, items, rubberBand }: Props): React.ReactElement {
  const connections = useCanvasStore((s) => s.connections())
  const activeConnectionId = useUIStore((s) => s.activeConnectionId)
  const setActiveConnectionId = useUIStore((s) => s.setActiveConnectionId)
  const openPanel = useUIStore((s) => s.openPanel)
  const closePanel = useUIStore((s) => s.closePanel)

  const itemMap = new Map(items.map((i) => [i.id, i]))

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'visible',
      }}
    >
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="currentColor" />
        </marker>
        <marker id="dot" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <circle cx="3" cy="3" r="3" fill="currentColor" />
        </marker>
        <marker id="diamond" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <polygon points="4,0 8,4 4,8 0,4" fill="currentColor" />
        </marker>
        <marker id="arrow-rubber" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#b99455" opacity="0.6" />
        </marker>
      </defs>

      {connections.map((conn) => {
        const fromItem = itemMap.get(conn.fromId)
        const toItem = itemMap.get(conn.toId)
        if (!fromItem || !toItem) return null

        const fromAnchor = conn.fromAnchor === 'auto'
          ? closestSide(fromItem, toItem).fromSide
          : conn.fromAnchor
        const toAnchor = conn.toAnchor === 'auto'
          ? closestSide(fromItem, toItem).toSide
          : conn.toAnchor

        const from = toScreen(getAnchorPoint(fromItem, fromAnchor), viewport)
        const to = toScreen(getAnchorPoint(toItem, toAnchor), viewport)

        let d: string
        if (conn.style === 'bezier') d = bezierPath(from, to)
        else if (conn.style === 'elbow') d = elbowPath(from, to)
        else d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`

        const markerEnd = conn.arrowHead !== 'none' ? `url(#${conn.arrowHead})` : undefined
        const isActive = conn.id === activeConnectionId

        return (
          <g key={conn.id} style={{ color: conn.color }}>
            {/* Wide invisible stroke for easier clicking */}
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onClick={() => {
                const next = isActive ? null : conn.id
                setActiveConnectionId(next)
                if (next) openPanel('connectionProperties')
                else closePanel('connectionProperties')
              }}
            />
            <path
              d={d}
              fill="none"
              stroke={conn.color}
              strokeWidth={isActive ? conn.width + 2 : conn.width}
              strokeDasharray={conn.dashed ? '8 4' : undefined}
              markerEnd={markerEnd}
              style={{ pointerEvents: 'none' }}
            />
            {conn.label && (
              <text
                x={(from.x + to.x) / 2}
                y={(from.y + to.y) / 2 - 6}
                textAnchor="middle"
                fill={conn.color}
                fontSize={11}
                fontFamily="var(--font-body)"
              >
                {conn.label}
              </text>
            )}
          </g>
        )
      })}

      {/* Connect tool rubber-band preview */}
      {rubberBand && (
        <line
          x1={rubberBand.x1} y1={rubberBand.y1}
          x2={rubberBand.x2} y2={rubberBand.y2}
          stroke="#b99455"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          opacity={0.6}
          markerEnd="url(#arrow-rubber)"
        />
      )}
    </svg>
  )
}
