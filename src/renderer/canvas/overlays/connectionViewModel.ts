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

const MIN_LABEL_WIDTH = 44
const MAX_LABEL_WIDTH = 180
const LABEL_HEIGHT = 22
const BADGE_LABEL_HEIGHT = 36
const LABEL_PAD_X = 14
const APPROX_CHAR_WIDTH = 7
const BINDING_PULSE_MS = 900

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

export function connectionBindingPulse(startedAt: number, now: number): { opacity: number; strokeBoost: number } | null {
  const elapsed = now - startedAt
  if (elapsed < 0 || elapsed > BINDING_PULSE_MS) return null
  const progress = elapsed / BINDING_PULSE_MS
  const fade = 1 - progress
  return {
    opacity: 0.72 * fade,
    strokeBoost: 6 * fade,
  }
}
