import React, { useMemo } from 'react'
import { useCanvasStore } from '../store/canvasStore'
import { useUIStore } from '../store/uiStore'

const STONE_TILE = 320

function buildStonePatternUrl(snapToGrid: boolean): string {
  const mortar = snapToGrid ? '#191a18' : '#111210'
  const edge = snapToGrid ? '#3b362b' : '#252720'
  const highlight = snapToGrid ? '#586066' : '#3d4548'
  const stones = [
    'M2,7 L58,0 L83,24 L74,69 L18,78 L0,50 Z',
    'M85,4 L152,1 L166,40 L143,85 L89,75 L76,31 Z',
    'M169,8 L237,0 L259,37 L246,76 L180,82 L160,45 Z',
    'M260,3 L319,10 L320,68 L286,86 L249,65 L255,27 Z',
    'M4,82 L68,72 L88,112 L72,151 L17,158 L0,127 Z',
    'M89,88 L149,85 L173,122 L155,163 L98,168 L76,132 Z',
    'M177,88 L244,80 L265,121 L248,163 L181,170 L159,128 Z',
    'M267,89 L319,72 L320,151 L277,169 L251,139 Z',
    'M0,163 L65,154 L88,200 L72,238 L12,246 L0,213 Z',
    'M91,171 L153,165 L175,203 L158,246 L92,249 L70,210 Z',
    'M180,174 L247,166 L270,207 L248,250 L184,255 L161,212 Z',
    'M273,172 L320,154 L320,235 L281,256 L252,219 Z',
    'M5,250 L73,240 L94,285 L73,320 L10,318 L0,285 Z',
    'M96,253 L160,246 L181,287 L165,320 L91,320 L75,288 Z',
    'M184,259 L248,252 L271,289 L256,320 L183,320 L165,291 Z',
    'M275,260 L320,239 L320,320 L260,320 L251,291 Z',
  ]

  const stonePaths = stones.map((d, i) => {
    const tone = ['#2b2f2f', '#242827', '#303535', '#252a2b'][i % 4]
    return `<path d="${d}" fill="${tone}" stroke="${edge}" stroke-width="3.5"/>`
  }).join('')

  const chips = [
    [35, 35, 14], [115, 24, 18], [205, 48, 16], [291, 39, 13],
    [44, 116, 18], [132, 133, 14], [215, 112, 20], [296, 134, 16],
    [32, 198, 16], [127, 219, 19], [216, 201, 14], [290, 218, 18],
    [38, 288, 15], [134, 284, 13], [218, 297, 17], [292, 289, 14],
  ].map(([x, y, w], i) => (
    `<path d="M${x},${y} l${w},-4 l${Math.round(w / 2)},4 l-${w + 5},5 z" fill="${highlight}" opacity="${i % 3 === 0 ? 0.24 : 0.16}"/>`
  )).join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${STONE_TILE}" height="${STONE_TILE}" viewBox="0 0 ${STONE_TILE} ${STONE_TILE}">
    <rect width="${STONE_TILE}" height="${STONE_TILE}" fill="${mortar}"/>
    <g opacity="${snapToGrid ? '0.92' : '0.82'}">${stonePaths}</g>
    <g>${chips}</g>
    <path d="M0,0 H320 V320 H0 Z" fill="none" stroke="#050606" stroke-width="8" opacity="0.55"/>
  </svg>`

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

export function CanvasBackground(): React.ReactElement {
  const viewport = useCanvasStore((s) => s.viewport())
  const snapToGrid = useUIStore((s) => s.snapToGrid)

  const stonePatternUrl = useMemo(() => buildStonePatternUrl(snapToGrid), [snapToGrid])
  const tileSize = STONE_TILE * Math.max(0.65, Math.min(1.6, viewport.scale))

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: '#050606',
        backgroundImage: stonePatternUrl,
        backgroundSize: `${tileSize}px ${tileSize}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        opacity: snapToGrid ? 0.72 : 0.62,
        pointerEvents: 'none',
      }}
    />
  )
}
