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
  // IDs are persisted in existing projects; labels and colours are clean UI
  // presets rather than the former fantasy-themed names.
  { id: 'gothic', label: 'Neutral', accent: '#73a8db', accentDim: '#38546f', accentGlow: '#a8cdf0' },
  { id: 'ember', label: 'Coral', accent: '#d67878', accentDim: '#714142', accentGlow: '#efaaaa' },
  { id: 'verdant', label: 'Green', accent: '#78aa8b', accentDim: '#3f5e4b', accentGlow: '#a9d8b8' },
  { id: 'frost', label: 'Blue', accent: '#78a9d6', accentDim: '#405b75', accentGlow: '#a9d0f2' },
  { id: 'umbral', label: 'Violet', accent: '#9b88d5', accentDim: '#514574', accentGlow: '#c3b4ee' },
  { id: 'aurum', label: 'Amber', accent: '#d6aa72', accentDim: '#735839', accentGlow: '#efd09f' },
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
