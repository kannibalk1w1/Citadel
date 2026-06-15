import React, { useMemo } from 'react'
import { useCanvasStore } from '../store/canvasStore'
import { useUIStore } from '../store/uiStore'
import { pathToUrl } from '../utils/pathToUrl'

const FLOOR_TILE = 640

export function buildVoidFloorSvg(snapToGrid: boolean): string {
  const seamOpacity = snapToGrid ? '0.32' : '0.18'
  const glintOpacity = snapToGrid ? '0.34' : '0.24'
  const lattice = snapToGrid
    ? `<g class="snap-lattice" opacity="0.18" stroke="#18345a" stroke-width="1">
        <path d="M0 160 H640 M0 320 H640 M0 480 H640 M160 0 V640 M320 0 V640 M480 0 V640"/>
      </g>`
    : ''

  const seams = [
    'M-30 544 C120 500 246 498 360 532 S570 586 690 530',
    'M-20 430 C116 388 232 406 342 438 S548 490 668 426',
    'M-10 318 C126 292 260 304 374 330 S558 356 650 314',
    'M20 218 C160 188 254 212 360 216 S548 216 636 174',
    'M90 -20 C80 132 104 274 82 404 S58 548 96 674',
    'M248 -18 C226 126 252 252 232 390 S218 534 258 666',
    'M418 -12 C396 136 430 258 402 396 S386 542 426 662',
    'M574 -18 C542 120 566 278 548 410 S534 536 590 660',
  ].map((d, i) => (
    `<path data-seam="${i}" d="${d}" fill="none" stroke="${i % 2 === 0 ? '#182426' : '#10202b'}" stroke-width="${i % 3 === 0 ? '2.6' : '1.4'}" stroke-linecap="round" opacity="${seamOpacity}"/>`
  )).join('')

  const glints = [
    [92, 504, 68, '#4bdcff'],
    [208, 397, 42, '#7d4dff'],
    [362, 530, 74, '#16d6c8'],
    [482, 346, 54, '#a735ff'],
    [560, 232, 46, '#308bff'],
  ].map(([x, y, w, color], i) => (
    `<path data-glint="${i}" d="M${x} ${y} C${Number(x) + Number(w) * 0.35} ${Number(y) - 8} ${Number(x) + Number(w) * 0.7} ${Number(y) + 8} ${Number(x) + Number(w)} ${Number(y)}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" opacity="${glintOpacity}"/>`
  )).join('')

  const svg = `<svg class="void-floor" xmlns="http://www.w3.org/2000/svg" width="${FLOOR_TILE}" height="${FLOOR_TILE}" viewBox="0 0 ${FLOOR_TILE} ${FLOOR_TILE}">
    <rect width="${FLOOR_TILE}" height="${FLOOR_TILE}" fill="#030506"/>
    <rect width="${FLOOR_TILE}" height="${FLOOR_TILE}" fill="url(#floor-depth)"/>
    <defs>
      <radialGradient id="floor-depth" cx="52%" cy="64%" r="74%">
        <stop offset="0%" stop-color="#0b161a"/>
        <stop offset="42%" stop-color="#071014"/>
        <stop offset="100%" stop-color="#020303"/>
      </radialGradient>
    </defs>
    ${lattice}
    <g>${seams}</g>
    <g>${glints}</g>
    <path d="M0 0 H640 V640 H0 Z" fill="none" stroke="#010202" stroke-width="18" opacity="0.55"/>
  </svg>`

  return svg
}

function buildStonePatternUrl(snapToGrid: boolean): string {
  const svg = buildVoidFloorSvg(snapToGrid)

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

export function CanvasBackground(): React.ReactElement {
  const viewport = useCanvasStore((s) => s.viewport())
  const snapToGrid = useUIStore((s) => s.snapToGrid)
  const canvasBackground = useUIStore((s) => s.canvasBackground)

  const stonePatternUrl = useMemo(() => buildStonePatternUrl(snapToGrid), [snapToGrid])
  const stoneTileSize = FLOOR_TILE * canvasBackground.scale * Math.max(0.75, Math.min(1.35, viewport.scale))

  if (canvasBackground.mode === 'none') return <></>

  if (canvasBackground.mode === 'custom' && canvasBackground.assetPath) {
    const customTileSize = FLOOR_TILE * canvasBackground.scale * Math.max(0.75, Math.min(1.35, viewport.scale))
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#030506',
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
        backgroundColor: '#030506',
        backgroundImage: stonePatternUrl,
        backgroundSize: `${stoneTileSize}px ${stoneTileSize}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        opacity: canvasBackground.opacity,
        pointerEvents: 'none',
      }}
    />
  )
}
