import React from 'react'
import type { CanvasItem, Connection, Viewport } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { useUIStore } from '../../store/uiStore'
import { connectionLabelPlaque, connectorStrokeWidth } from './connectionViewModel'

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
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)
  const updateConnection = useCanvasStore((s) => s.updateConnection)
  const activeConnectionId = useUIStore((s) => s.activeConnectionId)
  const setActiveConnectionId = useUIStore((s) => s.setActiveConnectionId)
  const openPanel = useUIStore((s) => s.openPanel)
  const closePanel = useUIStore((s) => s.closePanel)

  const itemMap = new Map(items.map((i) => [i.id, i]))
  const activateConnection = (id: string, isActive: boolean) => {
    const next = isActive ? null : id
    setActiveConnectionId(next)
    if (next) openPanel('connectionProperties')
    else closePanel('connectionProperties')
  }

  const editLabel = (conn: Connection) => {
    if (!activeBoardId) return
    const label = window.prompt('Connector label', conn.label ?? '')
    if (label === null) return
    const nextLabel = label.trim() || undefined
    updateConnection(activeBoardId, conn.id, { label: nextLabel })
    useHistoryStore.getState().push(
      'CONNECTION_STYLE',
      activeBoardId,
      { id: conn.id, label: conn.label },
      { id: conn.id, label: nextLabel },
    )
  }

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
        <filter id="connector-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#c8a96e" floodOpacity="0.72" />
        </filter>
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
        const labelText = conn.label?.trim()
        const plaqueText = labelText || (conn.meaning ? 'Thread' : '')
        const plaque = plaqueText ? connectionLabelPlaque(from, to, plaqueText, conn.meaning) : null

        return (
          <g key={conn.id} style={{ color: conn.color }}>
            {/* Wide invisible stroke for easier clicking */}
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onClick={() => activateConnection(conn.id, isActive)}
              onDoubleClick={() => editLabel(conn)}
            />
            {isActive && (
              <path
                d={d}
                fill="none"
                stroke="#c8a96e"
                strokeWidth={conn.width + 8}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.12}
                style={{ pointerEvents: 'none' }}
              />
            )}
            <path
              d={d}
              fill="none"
              stroke="#050403"
              strokeWidth={connectorStrokeWidth(conn.width, isActive) + 3}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.42}
              style={{ pointerEvents: 'none' }}
            />
            <path
              d={d}
              fill="none"
              stroke={conn.color}
              strokeWidth={connectorStrokeWidth(conn.width, isActive)}
              strokeDasharray={conn.dashed ? '8 4' : undefined}
              markerEnd={markerEnd}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={isActive ? 'url(#connector-glow)' : undefined}
              style={{ pointerEvents: 'none' }}
            />
            {plaque && plaqueText && (
              <g
                style={{ pointerEvents: 'all', cursor: 'text' }}
                onClick={() => activateConnection(conn.id, false)}
                onDoubleClick={() => editLabel(conn)}
              >
                <rect
                  x={plaque.x - plaque.width / 2}
                  y={plaque.y - plaque.height / 2}
                  width={plaque.width}
                  height={plaque.height}
                  rx={3}
                  fill="#120f0b"
                  stroke={isActive ? '#c8a96e' : '#4b3b22'}
                  strokeWidth={1}
                  opacity={0.96}
                />
                <line
                  x1={plaque.x - plaque.width / 2 + 5}
                  y1={plaque.y - plaque.height / 2 + 4}
                  x2={plaque.x + plaque.width / 2 - 5}
                  y2={plaque.y - plaque.height / 2 + 4}
                  stroke="#c8a96e"
                  strokeWidth={0.75}
                  opacity={0.28}
                />
                <text
                  x={plaque.textX}
                  y={plaque.textY}
                  textAnchor="middle"
                  fill="#e8ddd0"
                  fontSize={11}
                  fontFamily="var(--font-body)"
                  fontWeight={600}
                  style={{ userSelect: 'none' }}
                >
                  {plaqueText.length > 24 ? `${plaqueText.slice(0, 23)}...` : plaqueText}
                </text>
                {plaque.badgeText && (
                  <>
                    <rect
                      x={plaque.badgeX - Math.min(plaque.width - 18, plaque.badgeText.length * 6 + 14) / 2}
                      y={plaque.badgeY - 9}
                      width={Math.min(plaque.width - 18, plaque.badgeText.length * 6 + 14)}
                      height={12}
                      rx={2}
                      fill="#1d1710"
                      stroke="#c8a96e"
                      strokeWidth={0.75}
                      opacity={0.88}
                    />
                    <text
                      x={plaque.badgeX}
                      y={plaque.badgeY}
                      textAnchor="middle"
                      fill="#c8a96e"
                      fontSize={8}
                      fontFamily="var(--font-mono)"
                      fontWeight={700}
                      style={{ userSelect: 'none' }}
                    >
                      {plaque.badgeText}
                    </text>
                  </>
                )}
              </g>
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
