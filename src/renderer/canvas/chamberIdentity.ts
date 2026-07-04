import type { CanvasBoard } from '../../types'

export type ChamberMoodId = 'gothic' | 'ember' | 'verdant' | 'frost' | 'umbral' | 'aurum'

export type ChamberAmbienceKind = 'none' | 'motes' | 'fog'

export type ChamberTexture = {
  assetPath: string
  opacity: number
  scale: number
  repeat: boolean
}

export type ChamberIdentity = {
  mood: ChamberMoodId
  accent: string
  ambience: ChamberAmbienceKind
  ambienceIntensity: number
  vignette: number
  glow: number
  texture?: ChamberTexture
}

export type ChamberMoodPreset = {
  id: ChamberMoodId
  label: string
  accent: string
  accentDim: string
  accentGlow: string
}

// The first four ids shipped with BoardNavigator's original mood row and are
// persisted in real projects — they must never be renamed.
export const CHAMBER_MOOD_PRESETS: readonly ChamberMoodPreset[] = [
  { id: 'gothic', label: 'Gothic', accent: '#bd9652', accentDim: '#5d4c2e', accentGlow: '#e8c684' },
  { id: 'ember', label: 'Ember', accent: '#8a3d3d', accentDim: '#4a2424', accentGlow: '#c46a5a' },
  { id: 'verdant', label: 'Verdant', accent: '#6f8a5f', accentDim: '#3a4a33', accentGlow: '#9dc084' },
  { id: 'frost', label: 'Frost', accent: '#65798a', accentDim: '#37424c', accentGlow: '#94b4cc' },
  { id: 'umbral', label: 'Umbral', accent: '#6b5a80', accentDim: '#3a3146', accentGlow: '#a08cc0' },
  { id: 'aurum', label: 'Aurum', accent: '#c0a468', accentDim: '#63552f', accentGlow: '#f0d494' },
] as const

const DEFAULT_IDENTITY = {
  mood: 'gothic' as ChamberMoodId,
  ambience: 'none' as ChamberAmbienceKind,
  ambienceIntensity: 0.5,
  vignette: 0,
  glow: 0,
}

function clamp01(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback
}

function presetFor(mood: ChamberMoodId): ChamberMoodPreset {
  return CHAMBER_MOOD_PRESETS.find((p) => p.id === mood) ?? CHAMBER_MOOD_PRESETS[0]
}

function normalizeMood(value: unknown): ChamberMoodId {
  return CHAMBER_MOOD_PRESETS.some((p) => p.id === value) ? (value as ChamberMoodId) : DEFAULT_IDENTITY.mood
}

function normalizeAmbience(value: unknown): ChamberAmbienceKind {
  return value === 'motes' || value === 'fog' ? value : DEFAULT_IDENTITY.ambience
}

function normalizeTexture(value: unknown): ChamberTexture | undefined {
  if (!value || typeof value !== 'object') return undefined
  const texture = value as Partial<ChamberTexture>
  if (typeof texture.assetPath !== 'string' || !texture.assetPath) return undefined
  return {
    assetPath: texture.assetPath,
    opacity: clamp01(texture.opacity, 0.62),
    scale: Math.max(0.25, Math.min(4, typeof texture.scale === 'number' ? texture.scale : 1)),
    repeat: typeof texture.repeat === 'boolean' ? texture.repeat : true,
  }
}

export function resolveChamberIdentity(board: CanvasBoard): ChamberIdentity {
  const meta = board.meta ?? {}
  const mood = normalizeMood(meta.mood)
  return {
    mood,
    accent: typeof meta.accent === 'string' && meta.accent ? meta.accent : presetFor(mood).accent,
    ambience: normalizeAmbience(meta.ambience),
    ambienceIntensity: clamp01(meta.ambienceIntensity, DEFAULT_IDENTITY.ambienceIntensity),
    vignette: clamp01(meta.vignette, DEFAULT_IDENTITY.vignette),
    glow: clamp01(meta.glow, DEFAULT_IDENTITY.glow),
    texture: normalizeTexture(meta.texture),
  }
}

export function chamberAccentVariables(identity: ChamberIdentity): Record<string, string> {
  const preset = presetFor(identity.mood)
  return {
    '--chamber-accent': identity.accent,
    '--chamber-accent-dim': preset.accentDim,
    '--chamber-accent-glow': preset.accentGlow,
  }
}

// Meta keys the chamber identity owns; used to snapshot before-values for undo.
export type ChamberIdentityPatch = Partial<{
  mood: ChamberMoodId
  accent: string
  ambience: ChamberAmbienceKind
  ambienceIntensity: number
  vignette: number
  glow: number
  texture: ChamberTexture | null
}>

const PATCH_DEFAULTS: Record<keyof ChamberIdentityPatch, unknown> = {
  mood: DEFAULT_IDENTITY.mood,
  accent: null,
  ambience: DEFAULT_IDENTITY.ambience,
  ambienceIntensity: DEFAULT_IDENTITY.ambienceIntensity,
  vignette: DEFAULT_IDENTITY.vignette,
  glow: DEFAULT_IDENTITY.glow,
  texture: null,
}

// Builds a BOARD_STYLE before/after pair covering only the touched keys, so
// undo restores exactly the pre-edit look (missing keys snapshot as defaults).
export function chamberIdentityEvent(
  board: CanvasBoard,
  patch: ChamberIdentityPatch,
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const meta = board.meta ?? {}
  const before: Record<string, unknown> = {}
  const after: Record<string, unknown> = {}
  for (const key of Object.keys(patch) as (keyof ChamberIdentityPatch)[]) {
    before[key] = key in meta ? meta[key] : PATCH_DEFAULTS[key]
    after[key] = patch[key]
  }
  return { before, after }
}
