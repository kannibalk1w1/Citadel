import type { ThreadMeaning } from '../../../types'

export type ScreenPoint = { x: number; y: number }

export type LabelPlaque = {
  x: number
  y: number
  width: number
  height: number
  textX: number
  textY: number
  badgeText: string | null
  badgeX: number
  badgeY: number
}

export type BindingPulse = {
  opacity: number
  strokeBoost: number
  pathProgress: number
}

export type BindingEndpointMark = {
  x: number
  y: number
  radius: number
  opacity: number
  strokeWidth: number
}

const MIN_LABEL_WIDTH = 44
const MAX_LABEL_WIDTH = 180
const LABEL_HEIGHT = 22
const BADGE_LABEL_HEIGHT = 36
const LABEL_PAD_X = 14
const APPROX_CHAR_WIDTH = 7
const BINDING_PULSE_MS = 900
const REDUCED_MOTION_PULSE_MS = 450

export function threadMeaningBadgeLabel(meaning?: ThreadMeaning): string | null {
  return meaning ? meaning.toUpperCase() : null
}

export function connectionLabelPlaque(from: ScreenPoint, to: ScreenPoint, label: string, meaning?: ThreadMeaning): LabelPlaque {
  const badgeText = threadMeaningBadgeLabel(meaning)
  const width = Math.max(
    MIN_LABEL_WIDTH,
    Math.min(MAX_LABEL_WIDTH, Math.max(label.trim().length, badgeText?.length ?? 0) * APPROX_CHAR_WIDTH + LABEL_PAD_X * 2)
  )
  const x = (from.x + to.x) / 2
  const y = (from.y + to.y) / 2
  const height = badgeText ? BADGE_LABEL_HEIGHT : LABEL_HEIGHT
  return {
    x,
    y,
    width,
    height,
    textX: x,
    textY: badgeText ? y - 2 : y + 4,
    badgeText,
    badgeX: x,
    badgeY: y + 12,
  }
}

export function connectorStrokeWidth(width: number, isActive: boolean): number {
  return isActive ? width + 2 : width
}

export function connectionBindingPulse(
  startedAt: number,
  now: number,
  options: { reducedMotion?: boolean } = {},
): BindingPulse | null {
  const elapsed = now - startedAt
  const duration = options.reducedMotion ? REDUCED_MOTION_PULSE_MS : BINDING_PULSE_MS
  if (elapsed < 0 || elapsed > duration) return null
  const progress = elapsed / duration
  const fade = 1 - progress

  if (options.reducedMotion) {
    return {
      opacity: 0.42,
      strokeBoost: 3,
      pathProgress: 1,
    }
  }

  return {
    opacity: 0.72 * fade,
    strokeBoost: 6 * fade,
    pathProgress: progress,
  }
}

export function bindingEndpointMarks(
  from: ScreenPoint,
  to: ScreenPoint,
  state: { isActive: boolean; pulse: BindingPulse | null },
): BindingEndpointMark[] {
  if (!state.isActive && !state.pulse) return []

  const pulseRadius = state.pulse ? state.pulse.strokeBoost * 1.15 : 0
  const radius = state.isActive ? Math.max(5.5, 5.5 + pulseRadius) : 5.5 + pulseRadius
  const opacity = state.pulse?.opacity ?? 0.68
  const strokeWidth = state.isActive ? 1.25 : 1
  return [
    { x: from.x, y: from.y, radius, opacity, strokeWidth },
    { x: to.x, y: to.y, radius, opacity, strokeWidth },
  ]
}
