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

export type CanvasEffectMotif =
  | 'blue-flame-ring'
  | 'blue-energy-ring'
  | 'gold-particle-ring'
  | 'red-collapse-flame'
  | 'cyan-reverse-ring'
  | 'white-surge-ring'
  | 'red-fracture-burst'
  | 'red-recording-eye'
  | 'magenta-sigil-slash'
  | 'reduced-pulse'

export type CanvasEffectDefinition = {
  kind: CanvasEffectKind
  motif: CanvasEffectMotif
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
    motif: 'blue-flame-ring',
    className: 'canvas-breach-save',
    color: '#0088ff',
    secondaryColor: '#52fff1',
    lifetimeMs: 1450,
    intensity: 1.15,
  },
  'autosave-blue-pulse': {
    kind: 'autosave-blue-pulse',
    motif: 'blue-energy-ring',
    className: 'canvas-breach-autosave',
    color: '#1a63ff',
    secondaryColor: '#34d6ff',
    lifetimeMs: 850,
    intensity: 0.62,
  },
  'delete-red-flame': {
    kind: 'delete-red-flame',
    motif: 'red-collapse-flame',
    className: 'canvas-breach-delete',
    color: '#ff1b23',
    secondaryColor: '#ff8a1d',
    lifetimeMs: 1250,
    intensity: 1.18,
  },
  'import-yellow-spark': {
    kind: 'import-yellow-spark',
    motif: 'gold-particle-ring',
    className: 'canvas-breach-import',
    color: '#ffb400',
    secondaryColor: '#fff46a',
    lifetimeMs: 1150,
    intensity: 1.08,
  },
  'export-white-ignition': {
    kind: 'export-white-ignition',
    motif: 'white-surge-ring',
    className: 'canvas-breach-export',
    color: '#d8f4ff',
    secondaryColor: '#39a8ff',
    lifetimeMs: 1450,
    intensity: 1.22,
  },
  'undo-ash-reverse': {
    kind: 'undo-ash-reverse',
    motif: 'cyan-reverse-ring',
    className: 'canvas-breach-undo',
    color: '#2fd7ff',
    secondaryColor: '#b7f8ff',
    lifetimeMs: 950,
    intensity: 0.82,
  },
  'redo-ember-surge': {
    kind: 'redo-ember-surge',
    motif: 'white-surge-ring',
    className: 'canvas-breach-redo',
    color: '#3bfff0',
    secondaryColor: '#ffffff',
    lifetimeMs: 950,
    intensity: 0.86,
  },
  'error-red-fracture': {
    kind: 'error-red-fracture',
    motif: 'red-fracture-burst',
    className: 'canvas-breach-error',
    color: '#8b0000',
    secondaryColor: '#ff1b23',
    lifetimeMs: 1100,
    intensity: 1.15,
  },
  'recording-red-eye': {
    kind: 'recording-red-eye',
    motif: 'red-recording-eye',
    className: 'canvas-breach-recording',
    color: '#8b0000',
    secondaryColor: '#300000',
    lifetimeMs: 1800,
    intensity: 0.7,
    persistent: true,
  },
  'sigil-grey-flare': {
    kind: 'sigil-grey-flare',
    motif: 'magenta-sigil-slash',
    className: 'canvas-breach-sigil',
    color: '#ff2bd6',
    secondaryColor: '#8f5bff',
    lifetimeMs: 1050,
    intensity: 0.95,
  },
  'reduced-pulse': {
    kind: 'reduced-pulse',
    motif: 'reduced-pulse',
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
