import React, { useMemo } from 'react'
import defaultCanvasTextureUrl from '../assets/arcane-stone-canvas-tile.png'
import { useCanvasStore } from '../store/canvasStore'
import { useUIStore } from '../store/uiStore'
import { pathToUrl } from '../utils/pathToUrl'
import { resolveChamberIdentity, type ChamberTexture } from './chamberIdentity'

export { defaultCanvasTextureUrl }

export const DEFAULT_CANVAS_TEXTURE_TILE_SIZE = 720

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
    backgroundColor: '#030506',
    backgroundImage: `url("${defaultCanvasTextureUrl}")`,
    backgroundRepeat: 'repeat',
    backgroundSize: `${tileSize}px auto`,
    backgroundPosition: `${input.viewportX}px ${input.viewportY}px`,
    opacity: input.opacity,
    pointerEvents: 'none',
  }
}

type EffectiveBackground = {
  mode: 'stone' | 'custom' | 'none'
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

  if (canvasBackground.mode === 'none') return <></>

  if (canvasBackground.mode === 'custom' && canvasBackground.assetPath) {
    const customTileSize = DEFAULT_CANVAS_TEXTURE_TILE_SIZE * canvasBackground.scale * clampTextureViewportScale(viewport.scale)
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
      style={defaultBackgroundStyle}
    />
  )
}
