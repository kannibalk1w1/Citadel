import type { CanvasBoard, CanvasItem } from '../../types'
import { isLocalAssetSrc } from './assetMetadata'

export type AssetHealthStatus = 'available' | 'missing' | 'unchecked'

export type AssetHealthEntry = {
  src: string
  filename: string
  status: AssetHealthStatus
  itemIds: string[]
  boardIds: string[]
  types: CanvasItem['type'][]
}

export type AssetHealthIndex = {
  entries: AssetHealthEntry[]
  missingPaths: string[]
  summary: {
    total: number
    available: number
    missing: number
    unchecked: number
  }
}

function filenameFromSrc(src: string): string {
  const clean = src.split(/[?#]/)[0]
  return clean.split(/[\\/]/).pop() || src
}

export function buildAssetHealthIndex(
  boards: CanvasBoard[],
  availability: Record<string, boolean> = {},
): AssetHealthIndex {
  const bySrc = new Map<string, AssetHealthEntry>()

  for (const board of boards) {
    for (const item of board.items) {
      if (!isLocalAssetSrc(item.src)) continue
      const existing = bySrc.get(item.src)
      if (existing) {
        existing.itemIds.push(item.id)
        if (!existing.boardIds.includes(board.id)) existing.boardIds.push(board.id)
        if (!existing.types.includes(item.type)) existing.types.push(item.type)
        continue
      }

      const known = availability[item.src]
      bySrc.set(item.src, {
        src: item.src,
        filename: filenameFromSrc(item.src),
        status: known === true ? 'available' : known === false ? 'missing' : 'unchecked',
        itemIds: [item.id],
        boardIds: [board.id],
        types: [item.type],
      })
    }
  }

  const entries = Array.from(bySrc.values()).sort((a, b) => a.filename.localeCompare(b.filename))
  const summary = entries.reduce<AssetHealthIndex['summary']>((acc, entry) => {
    acc.total += 1
    acc[entry.status] += 1
    return acc
  }, { total: 0, available: 0, missing: 0, unchecked: 0 })

  return {
    entries,
    missingPaths: entries.filter((entry) => entry.status === 'missing').map((entry) => entry.src),
    summary,
  }
}
