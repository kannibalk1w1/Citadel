import React, { useMemo } from 'react'
import { useCanvasStore } from '../store/canvasStore'
import { useUIStore } from '../store/uiStore'
import { pathToUrl } from '../utils/pathToUrl'

const STONE_TILE = 320

export function buildBrokenCobblestoneSvg(snapToGrid: boolean): string {
  const mortar = snapToGrid ? '#171d1b' : '#0d1110'
  const edge = snapToGrid ? '#33423f' : '#1d2926'
  const highlight = snapToGrid ? '#586866' : '#34413f'
  const seamClass = snapToGrid ? 'snap-mortar' : 'dark-mortar'
  const stones = [
    'M-10,10 L70,-5 L111,37 L92,104 L16,113 L-13,66 Z',
    'M113,2 L214,-10 L244,48 L211,122 L117,108 L91,48 Z',
    'M244,3 L334,18 L330,104 L278,129 L220,101 L229,39 Z',
    'M-16,116 L82,103 L119,166 L91,236 L6,245 L-18,184 Z',
    'M121,124 L218,112 L254,178 L220,252 L118,258 L88,184 Z',
    'M257,132 L336,105 L335,229 L282,262 L224,214 Z',
    'M-12,250 L92,236 L126,296 L92,334 L-14,329 Z',
    'M128,262 L224,252 L260,306 L231,337 L102,334 Z',
    'M263,268 L336,236 L333,337 L235,338 L225,305 Z',
  ]

  const stonePaths = stones.map((d, i) => {
    const tone = ['#262d2c', '#1e2524', '#2b3332', '#202928', '#303938'][i % 5]
    return `<path class="${seamClass}" d="${d}" fill="${tone}" stroke="${edge}" stroke-width="${snapToGrid ? '4.4' : '3.4'}"/>`
  }).join('')

  const chips = [
    [32, 42, 22], [144, 30, 28], [267, 58, 19],
    [48, 154, 26], [167, 180, 21], [286, 186, 24],
    [38, 286, 22], [174, 294, 18], [279, 302, 27],
  ].map(([x, y, w], i) => (
    `<path data-chip="${i}" d="M${x},${y} l${w},-${5 + (i % 3)} l${Math.round(w / 2)},${4 + (i % 2)} l-${w + 7},${7 + (i % 3)} z" fill="${highlight}" opacity="${i % 3 === 0 ? 0.20 : 0.12}"/>`
  )).join('')

  const cracks = [
    'M76 14 L69 42 L82 68 L72 101',
    'M222 39 L204 62 L211 96 L194 120',
    'M45 142 L66 159 L58 192 L75 219',
    'M150 128 L176 150 L163 179 L190 211 L178 250',
    'M275 147 L290 178 L274 206 L298 235',
    'M88 266 L112 281 L101 309',
    'M230 268 L250 287 L239 319',
  ].map((d, i) => (
    `<path data-crack="${i}" d="${d}" fill="none" stroke="${i % 2 === 0 ? '#090c0c' : '#111817'}" stroke-width="${i % 2 === 0 ? '3.2' : '2.2'}" stroke-linecap="round" opacity="${snapToGrid ? '0.74' : '0.58'}"/>`
  )).join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${STONE_TILE}" height="${STONE_TILE}" viewBox="0 0 ${STONE_TILE} ${STONE_TILE}">
    <rect width="${STONE_TILE}" height="${STONE_TILE}" fill="${mortar}"/>
    <g opacity="${snapToGrid ? '0.94' : '0.84'}">${stonePaths}</g>
    <g>${cracks}</g>
    <g>${chips}</g>
    <path d="M0,0 H320 V320 H0 Z" fill="none" stroke="#050707" stroke-width="8" opacity="0.55"/>
  </svg>`

  return svg
}

function buildStonePatternUrl(snapToGrid: boolean): string {
  const svg = buildBrokenCobblestoneSvg(snapToGrid)

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

export function CanvasBackground(): React.ReactElement {
  const viewport = useCanvasStore((s) => s.viewport())
  const snapToGrid = useUIStore((s) => s.snapToGrid)
  const canvasBackground = useUIStore((s) => s.canvasBackground)

  const stonePatternUrl = useMemo(() => buildStonePatternUrl(snapToGrid), [snapToGrid])
  const stoneTileSize = STONE_TILE * canvasBackground.scale * Math.max(0.65, Math.min(1.6, viewport.scale))

  if (canvasBackground.mode === 'none') return <></>

  if (canvasBackground.mode === 'custom' && canvasBackground.assetPath) {
    const customTileSize = STONE_TILE * canvasBackground.scale * Math.max(0.65, Math.min(1.6, viewport.scale))
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#050606',
          backgroundImage: `url("${pathToUrl(canvasBackground.assetPath)}")`,
          backgroundRepeat: canvasBackground.repeat ? 'repeat' : 'no-repeat',
          backgroundSize: canvasBackground.repeat ? `${customTileSize}px auto` : 'cover',
          backgroundPosition: canvasBackground.repeat ? `${viewport.x}px ${viewport.y}px` : 'center',
          opacity: canvasBackground.opacity,
          pointerEvents: 'none',
        }}
      />
    )
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: '#050606',
        backgroundImage: stonePatternUrl,
        backgroundSize: `${stoneTileSize}px ${stoneTileSize}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        opacity: canvasBackground.opacity,
        pointerEvents: 'none',
      }}
    />
  )
}
