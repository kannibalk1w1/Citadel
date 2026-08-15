import React, { useMemo } from 'react'
import defaultCanvasTextureUrl from '../assets/arcane-stone-canvas-tile.png'
import { useCanvasStore } from '../store/canvasStore'
import { useUIStore } from '../store/uiStore'
import { pathToUrl } from '../utils/pathToUrl'
import { resolveChamberIdentity, type ChamberTexture } from './chamberIdentity'

export { defaultCanvasTextureUrl }

export const DEFAULT_CANVAS_TEXTURE_TILE_SIZE = 720

// Below this the dots stop reading as a grid and start reading as noise.
export const MIN_DOT_SPACING_PX = 12

// Dots sit on the snap grid, so what you see is what you snap to. Spacing
// doubles as you zoom out, which keeps the field legible instead of letting it
// collapse into a smear.
export function dotGridSpacing(gridSize: number, viewportScale: number): number {
  const base = Math.max(1, gridSize) * viewportScale
  if (!Number.isFinite(base) || base <= 0) return MIN_DOT_SPACING_PX
  let spacing = base
  while (spacing < MIN_DOT_SPACING_PX) spacing *= 2
  return spacing
}

type DotGridStyleInput = {
  gridSize: number
  viewportScale: number
  viewportX: number
  viewportY: number
}

export function buildDotGridStyle(input: DotGridStyleInput): React.CSSProperties {
  const spacing = dotGridSpacing(input.gridSize, input.viewportScale)

  return {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'var(--canvas-flat)',
    backgroundImage: 'radial-gradient(circle at 1px 1px, var(--canvas-dot) 1px, transparent 0)',
    backgroundSize: `${spacing}px ${spacing}px`,
    // Anchored to the canvas origin, so the grid pans and zooms with the board
    // rather than sliding underneath it.
    backgroundPosition: `${input.viewportX}px ${input.viewportY}px`,
    pointerEvents: 'none',
  }
}

type DefaultCanvasBackgroundStyleInput = {
  opacity: number
  scale: number
  viewportScale: number
  viewportX: number
  viewportY: number
}

function clampTextureViewportScale(scale: number): number {
  return Math.max(0.75, Math.min(1.35, scale))
}

export function buildDefaultCanvasBackgroundStyle(input: DefaultCanvasBackgroundStyleInput): React.CSSProperties {
  const tileSize = DEFAULT_CANVAS_TEXTURE_TILE_SIZE * input.scale * clampTextureViewportScale(input.viewportScale)

  return {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'var(--canvas-flat)',
    backgroundImage: `url("${defaultCanvasTextureUrl}")`,
    backgroundRepeat: 'repeat',
    backgroundSize: `${tileSize}px auto`,
    backgroundPosition: `${input.viewportX}px ${input.viewportY}px`,
    opacity: input.opacity,
    pointerEvents: 'none',
  }
}

type EffectiveBackground = {
  mode: 'dots' | 'flat' | 'stone' | 'custom' | 'none'
  assetPath: string | null
  opacity: number
  scale: number
  repeat: boolean
}

// A chamber's own floor texture wins over the global background setting.
export function resolveEffectiveBackground(
  chamberTexture: ChamberTexture | undefined,
  global: EffectiveBackground,
): EffectiveBackground {
  if (chamberTexture) {
    return {
      mode: 'custom',
      assetPath: chamberTexture.assetPath,
      opacity: chamberTexture.opacity,
      scale: chamberTexture.scale,
      repeat: chamberTexture.repeat,
    }
  }
  return global
}

export function CanvasBackground(): React.ReactElement {
  const viewport = useCanvasStore((s) => s.viewport())
  const globalBackground = useUIStore((s) => s.canvasBackground)
  const gridSize = useUIStore((s) => s.gridSize)
  const activeBoard = useCanvasStore((s) => s.boards.find((b) => b.id === s.activeBoardId) ?? null)
  const chamberTexture = activeBoard ? resolveChamberIdentity(activeBoard).texture : undefined
  const canvasBackground = resolveEffectiveBackground(chamberTexture, globalBackground)

  const defaultBackgroundStyle = useMemo(() => buildDefaultCanvasBackgroundStyle({
    opacity: canvasBackground.opacity,
    scale: canvasBackground.scale,
    viewportScale: viewport.scale,
    viewportX: viewport.x,
    viewportY: viewport.y,
  }), [canvasBackground.opacity, canvasBackground.scale, viewport.scale, viewport.x, viewport.y])

  const dotGridStyle = useMemo(() => buildDotGridStyle({
    gridSize,
    viewportScale: viewport.scale,
    viewportX: viewport.x,
    viewportY: viewport.y,
  }), [gridSize, viewport.scale, viewport.x, viewport.y])

  if (canvasBackground.mode === 'none') return <></>

  if (canvasBackground.mode === 'dots') {
    return <div style={dotGridStyle} />
  }

  // Flat: a plain neutral ground, the way reference tools present a canvas.
  if (canvasBackground.mode === 'flat') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'var(--canvas-flat)',
          pointerEvents: 'none',
        }}
      />
    )
  }

  if (canvasBackground.mode === 'custom' && canvasBackground.assetPath) {
    const customTileSize = DEFAULT_CANVAS_TEXTURE_TILE_SIZE * canvasBackground.scale * clampTextureViewportScale(viewport.scale)
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'var(--canvas-flat)',
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
      style={defaultBackgroundStyle}
    />
  )
}
