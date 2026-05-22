import React, { useMemo } from 'react'
import { useCanvasStore } from '../store/canvasStore'
import { useUIStore } from '../store/uiStore'

function buildPatternUrl(tileSize: number, snapToGrid: boolean): string {
  const s = tileSize
  const line = snapToGrid ? '#b99455' : '#23231f'
  const edgeOpacity = snapToGrid ? '0.18' : '0.34'
  const goldOpacity = snapToGrid ? '0.12' : '0.035'
  const chipOpacity = snapToGrid ? '0.09' : '0.06'

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
    <rect width="${s}" height="${s}" fill="#070808"/>
    <path d="M ${s * 0.04},${s * 0.17} C ${s * 0.22},${s * 0.05} ${s * 0.45},${s * 0.08} ${s * 0.61},${s * 0.18} C ${s * 0.8},${s * 0.3} ${s * 0.94},${s * 0.28} ${s * 0.98},${s * 0.46}
      M ${s * 0.03},${s * 0.55} C ${s * 0.2},${s * 0.44} ${s * 0.42},${s * 0.48} ${s * 0.58},${s * 0.59} C ${s * 0.73},${s * 0.7} ${s * 0.87},${s * 0.66} ${s},${s * 0.77}
      M ${s * 0.19},0 C ${s * 0.14},${s * 0.22} ${s * 0.16},${s * 0.42} ${s * 0.23},${s * 0.63} C ${s * 0.29},${s * 0.8} ${s * 0.28},${s * 0.91} ${s * 0.23},${s}
      M ${s * 0.64},0 C ${s * 0.59},${s * 0.17} ${s * 0.61},${s * 0.35} ${s * 0.69},${s * 0.52} C ${s * 0.77},${s * 0.68} ${s * 0.75},${s * 0.84} ${s * 0.68},${s}"
      fill="none" stroke="${line}" stroke-width="${Math.max(1, s * 0.028)}" stroke-linecap="round" opacity="${edgeOpacity}"/>
    <path d="M ${s * 0.5},${s * 0.11} l ${s * 0.035},${s * 0.06} l ${s * 0.065},${s * 0.02} l -${s * 0.065},${s * 0.02} l -${s * 0.035},${s * 0.06} l -${s * 0.035},-${s * 0.06} l -${s * 0.065},-${s * 0.02} l ${s * 0.065},-${s * 0.02} z"
      fill="#b99455" opacity="${goldOpacity}"/>
    <g fill="#e3ded4" opacity="${chipOpacity}">
      <rect x="${s * 0.1}" y="${s * 0.38}" width="${s * 0.045}" height="${s * 0.012}" rx="1"/>
      <rect x="${s * 0.78}" y="${s * 0.18}" width="${s * 0.05}" height="${s * 0.012}" rx="1"/>
      <rect x="${s * 0.47}" y="${s * 0.82}" width="${s * 0.04}" height="${s * 0.012}" rx="1"/>
    </g>
  </svg>`

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

export function CanvasBackground(): React.ReactElement {
  const viewport = useCanvasStore((s) => s.viewport())
  const gridSize = useUIStore((s) => s.gridSize)
  const snapToGrid = useUIStore((s) => s.snapToGrid)

  const patternUrl = useMemo(() => buildPatternUrl(gridSize, snapToGrid), [gridSize, snapToGrid])
  const scaledTile = gridSize * viewport.scale

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: patternUrl,
        backgroundSize: `${scaledTile}px ${scaledTile}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        opacity: snapToGrid ? 1 : 0.7,
        pointerEvents: 'none',
      }}
    />
  )
}
