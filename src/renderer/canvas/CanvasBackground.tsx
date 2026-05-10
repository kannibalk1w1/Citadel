import React, { useMemo } from 'react'
import { useCanvasStore } from '../store/canvasStore'
import { useUIStore } from '../store/uiStore'

// Builds an SVG data-URI for the repeating tile.
// Each tile is gridSize × gridSize px. The cross is scaled to fill ~50% of the tile.
function buildPatternUrl(tileSize: number): string {
  const c = tileSize / 2           // centre
  const reach = tileSize * 0.27    // how far each petal tip extends from centre
  const spread = tileSize * 0.075  // lateral spread at petal base (controls fatness)

  // Four curved leaf-petals, each pointing to a cardinal direction.
  // Bezier control points give the organic curved sides.
  const top    = `M ${c},${c} C ${c - spread * 2.5},${c - spread * 2.5} ${c - spread},${c - reach * 0.6} ${c},${c - reach} C ${c + spread},${c - reach * 0.6} ${c + spread * 2.5},${c - spread * 2.5} ${c},${c} Z`
  const right  = `M ${c},${c} C ${c + spread * 2.5},${c - spread * 2.5} ${c + reach * 0.6},${c - spread} ${c + reach},${c} C ${c + reach * 0.6},${c + spread} ${c + spread * 2.5},${c + spread * 2.5} ${c},${c} Z`
  const bottom = `M ${c},${c} C ${c + spread * 2.5},${c + spread * 2.5} ${c + spread},${c + reach * 0.6} ${c},${c + reach} C ${c - spread},${c + reach * 0.6} ${c - spread * 2.5},${c + spread * 2.5} ${c},${c} Z`
  const left   = `M ${c},${c} C ${c - spread * 2.5},${c + spread * 2.5} ${c - reach * 0.6},${c + spread} ${c - reach},${c} C ${c - reach * 0.6},${c - spread} ${c - spread * 2.5},${c - spread * 2.5} ${c},${c} Z`

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tileSize}" height="${tileSize}">
    <g fill="#c8a96e" opacity="0.09">
      <path d="${top}"/>
      <path d="${right}"/>
      <path d="${bottom}"/>
      <path d="${left}"/>
      <circle cx="${c}" cy="${c}" r="${tileSize * 0.03}"/>
    </g>
  </svg>`

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

export function CanvasBackground(): React.ReactElement {
  const viewport = useCanvasStore((s) => s.viewport())
  const gridSize = useUIStore((s) => s.gridSize)

  const patternUrl = useMemo(() => buildPatternUrl(gridSize), [gridSize])

  const scaledTile = gridSize * viewport.scale

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: patternUrl,
        backgroundSize: `${scaledTile}px ${scaledTile}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        pointerEvents: 'none',
      }}
    />
  )
}
