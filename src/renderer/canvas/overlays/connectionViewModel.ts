export type ScreenPoint = { x: number; y: number }

export type LabelPlaque = {
  x: number
  y: number
  width: number
  height: number
  textX: number
  textY: number
}

const MIN_LABEL_WIDTH = 44
const MAX_LABEL_WIDTH = 180
const LABEL_HEIGHT = 22
const LABEL_PAD_X = 14
const APPROX_CHAR_WIDTH = 7

export function connectionLabelPlaque(from: ScreenPoint, to: ScreenPoint, label: string): LabelPlaque {
  const width = Math.max(
    MIN_LABEL_WIDTH,
    Math.min(MAX_LABEL_WIDTH, label.trim().length * APPROX_CHAR_WIDTH + LABEL_PAD_X * 2)
  )
  const x = (from.x + to.x) / 2
  const y = (from.y + to.y) / 2
  return {
    x,
    y,
    width,
    height: LABEL_HEIGHT,
    textX: x,
    textY: y + 4,
  }
}

export function connectorStrokeWidth(width: number, isActive: boolean): number {
  return isActive ? width + 2 : width
}
