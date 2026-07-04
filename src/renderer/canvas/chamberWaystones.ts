import type { CanvasBoard } from '../../types'

export const WAYSTONE_MAX = 12

export type Waystone = {
  id: string
  name: string
  x: number
  y: number
  scale: number
}

type WaystoneEvent = {
  before: { waystones: Waystone[] }
  after: { waystones: Waystone[] }
}

function normalizeWaystone(value: unknown): Waystone | null {
  if (!value || typeof value !== 'object') return null
  const stone = value as Partial<Waystone>
  if (typeof stone.id !== 'string' || !stone.id) return null
  if (typeof stone.x !== 'number' || typeof stone.y !== 'number') return null
  return {
    id: stone.id,
    name: typeof stone.name === 'string' && stone.name ? stone.name : 'Waystone',
    x: stone.x,
    y: stone.y,
    scale: Math.max(0.05, Math.min(8, typeof stone.scale === 'number' ? stone.scale : 1)),
  }
}

export function resolveWaystones(board: CanvasBoard): Waystone[] {
  const raw = board.meta?.waystones
  if (!Array.isArray(raw)) return []
  return raw
    .map(normalizeWaystone)
    .filter((stone): stone is Waystone => stone !== null)
    .slice(0, WAYSTONE_MAX)
}

// BOARD_STYLE before/after builders — same undo discipline as chamber identity.
export function plantWaystoneEvent(board: CanvasBoard, stone: Waystone): WaystoneEvent | null {
  const current = resolveWaystones(board)
  if (current.length >= WAYSTONE_MAX) return null
  return { before: { waystones: current }, after: { waystones: [...current, stone] } }
}

export function removeWaystoneEvent(board: CanvasBoard, id: string): WaystoneEvent | null {
  const current = resolveWaystones(board)
  if (!current.some((stone) => stone.id === id)) return null
  return { before: { waystones: current }, after: { waystones: current.filter((stone) => stone.id !== id) } }
}

export function renameWaystoneEvent(board: CanvasBoard, id: string, name: string): WaystoneEvent | null {
  const current = resolveWaystones(board)
  if (!current.some((stone) => stone.id === id)) return null
  return {
    before: { waystones: current },
    after: { waystones: current.map((stone) => (stone.id === id ? { ...stone, name } : stone)) },
  }
}
