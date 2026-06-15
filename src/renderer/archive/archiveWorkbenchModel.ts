import type { CanvasBoard, CanvasItem } from '../../types'
import { buildAssetHealthIndex, type AssetHealthEntry } from '../assets/assetHealth'
import { isLocalAssetSrc } from '../assets/assetMetadata'

export type ArchiveWorkbenchRelic = {
  itemId: string
  chamberId: string
  chamberName: string
  type: CanvasItem['type']
  src: string
  filename: string
  suggestedSigils: string[]
}

export type ArchiveWorkbenchMissingRelic = {
  src: string
  filename: string
  itemIds: string[]
  chamberIds: string[]
  types: CanvasItem['type'][]
}

export type ArchiveWorkbenchModel = {
  uncategorizedRelics: ArchiveWorkbenchRelic[]
  missingRelics: ArchiveWorkbenchMissingRelic[]
  summary: {
    uncategorized: number
    missingAssets: number
  }
}

function filenameFromSrc(src: string): string {
  const clean = src.split(/[?#]/)[0]
  return clean.split(/[\\/]/).pop() || src
}

function wordsFromFilename(filename: string): string[] {
  return filename
    .replace(/\.[^.]+$/, '')
    .split(/[^a-z0-9]+/i)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length >= 3)
}

function hasInscription(item: CanvasItem): boolean {
  return typeof item.meta?.content === 'string' && item.meta.content.trim().length > 0
}

function suggestedSigils(item: CanvasItem, filename: string): string[] {
  return Array.from(new Set([item.type, ...wordsFromFilename(filename)])).slice(0, 5)
}

function missingRelicFromHealth(entry: AssetHealthEntry): ArchiveWorkbenchMissingRelic {
  return {
    src: entry.src,
    filename: entry.filename,
    itemIds: entry.itemIds,
    chamberIds: entry.boardIds,
    types: entry.types,
  }
}

export function buildArchiveWorkbenchModel(
  boards: CanvasBoard[],
  availability: Record<string, boolean> = {},
): ArchiveWorkbenchModel {
  const uncategorizedRelics: ArchiveWorkbenchRelic[] = []

  boards.forEach((board) => {
    board.items.forEach((item) => {
      if (!isLocalAssetSrc(item.src) || item.tags.length > 0 || hasInscription(item)) return
      const filename = filenameFromSrc(item.src)
      uncategorizedRelics.push({
        itemId: item.id,
        chamberId: board.id,
        chamberName: board.name,
        type: item.type,
        src: item.src,
        filename,
        suggestedSigils: suggestedSigils(item, filename),
      })
    })
  })

  const health = buildAssetHealthIndex(boards, availability)
  const missingRelics = health.entries
    .filter((entry) => entry.status === 'missing')
    .map(missingRelicFromHealth)

  return {
    uncategorizedRelics,
    missingRelics,
    summary: {
      uncategorized: uncategorizedRelics.length,
      missingAssets: missingRelics.length,
    },
  }
}
