import type { MascotEffect } from '../../store/mascotStore'

export type CanvasPoint = {
  x: number
  y: number
}

export type ViewportLike = {
  x: number
  y: number
  scale: number
}

export type CanvasEffectKind =
  | 'save-blue-flame'
  | 'autosave-blue-pulse'
  | 'delete-red-flame'
  | 'import-yellow-spark'
  | 'export-white-ignition'
  | 'undo-ash-reverse'
  | 'redo-ember-surge'
  | 'error-red-fracture'
  | 'recording-red-eye'
  | 'sigil-grey-flare'
  | 'reduced-pulse'

export type CanvasEffectDefinition = {
  kind: CanvasEffectKind
  className: string
  color: string
  secondaryColor: string
  lifetimeMs: number
  intensity: number
  persistent?: boolean
}

export const CANVAS_EFFECTS: Record<CanvasEffectKind, CanvasEffectDefinition> = {
  'save-blue-flame': {
    kind: 'save-blue-flame',
    className: 'canvas-breach-save',
    color: '#3aa7ff',
    secondaryColor: '#95d7ff',
    lifetimeMs: 1200,
    intensity: 0.9,
  },
  'autosave-blue-pulse': {
    kind: 'autosave-blue-pulse',
    className: 'canvas-breach-autosave',
    color: '#2f6f91',
    secondaryColor: '#79b9d0',
    lifetimeMs: 900,
    intensity: 0.45,
  },
  'delete-red-flame': {
    kind: 'delete-red-flame',
    className: 'canvas-breach-delete',
    color: '#b31318',
    secondaryColor: '#ff4a37',
    lifetimeMs: 1150,
    intensity: 1,
  },
  'import-yellow-spark': {
    kind: 'import-yellow-spark',
    className: 'canvas-breach-import',
    color: '#f3c64b',
    secondaryColor: '#fff1a6',
    lifetimeMs: 950,
    intensity: 0.85,
  },
  'export-white-ignition': {
    kind: 'export-white-ignition',
    className: 'canvas-breach-export',
    color: '#d8f4ff',
    secondaryColor: '#76cfff',
    lifetimeMs: 1300,
    intensity: 1,
  },
  'undo-ash-reverse': {
    kind: 'undo-ash-reverse',
    className: 'canvas-breach-undo',
    color: '#91a9b4',
    secondaryColor: '#c6d2d7',
    lifetimeMs: 850,
    intensity: 0.65,
  },
  'redo-ember-surge': {
    kind: 'redo-ember-surge',
    className: 'canvas-breach-redo',
    color: '#c0d4d2',
    secondaryColor: '#ffffff',
    lifetimeMs: 850,
    intensity: 0.7,
  },
  'error-red-fracture': {
    kind: 'error-red-fracture',
    className: 'canvas-breach-error',
    color: '#5a0000',
    secondaryColor: '#d91f1f',
    lifetimeMs: 1000,
    intensity: 1,
  },
  'recording-red-eye': {
    kind: 'recording-red-eye',
    className: 'canvas-breach-recording',
    color: '#8b0000',
    secondaryColor: '#300000',
    lifetimeMs: 1800,
    intensity: 0.7,
    persistent: true,
  },
  'sigil-grey-flare': {
    kind: 'sigil-grey-flare',
    className: 'canvas-breach-sigil',
    color: '#c8c8c8',
    secondaryColor: '#ffffff',
    lifetimeMs: 900,
    intensity: 0.6,
  },
  'reduced-pulse': {
    kind: 'reduced-pulse',
    className: 'canvas-breach-reduced',
    color: '#c8c8c8',
    secondaryColor: '#ffffff',
    lifetimeMs: 520,
    intensity: 0.45,
  },
}

const MASCOT_TO_CANVAS: Partial<Record<MascotEffect, CanvasEffectKind>> = {
  'lightning-out': 'export-white-ignition',
  'lightning-in': 'import-yellow-spark',
  'rune-seal': 'save-blue-flame',
  'base-pulse': 'autosave-blue-pulse',
  'rewind-swirl': 'undo-ash-reverse',
  'forward-surge': 'redo-ember-surge',
  crumble: 'delete-red-flame',
  'eye-open': 'recording-red-eye',
  'eye-close': 'recording-red-eye',
  'lighthouse-beam': 'export-white-ignition',
  'progress-fill': 'sigil-grey-flare',
  fracture: 'error-red-fracture',
  'banner-raise': 'sigil-grey-flare',
  'brightness-pulse': 'reduced-pulse',
}

export function canvasEffectForMascotEffect(effect: MascotEffect): CanvasEffectDefinition | null {
  const kind = MASCOT_TO_CANVAS[effect]
  return kind ? CANVAS_EFFECTS[kind] : null
}

export function reducedCanvasEffect(effect: CanvasEffectKind): CanvasEffectKind {
  return effect === 'recording-red-eye' ? effect : 'reduced-pulse'
}

export function resolveCanvasEffectSource({
  target,
  lastPointer,
  viewport,
  size,
}: {
  target?: CanvasPoint | null
  lastPointer?: CanvasPoint | null
  viewport: ViewportLike
  size: { width: number; height: number }
}): CanvasPoint {
  if (target) return target
  if (lastPointer) return lastPointer

  return {
    x: (size.width / 2 - viewport.x) / viewport.scale,
    y: (size.height / 2 - viewport.y) / viewport.scale,
  }
}
