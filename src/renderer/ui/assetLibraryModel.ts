import type { CanvasBoard, CanvasItem } from '../../types'

export type AssetLibraryEntry = {
  src: string
  filename: string
  type: CanvasItem['type']
  count: number
  firstItemId: string
  firstBoardId: string
}

function filenameFromSrc(src: string): string {
  const clean = src.split(/[?#]/)[0]
  return clean.split(/[\\/]/).pop() || src
}

export function buildAssetLibrary(boards: CanvasBoard[]): AssetLibraryEntry[] {
  const bySrc = new Map<string, AssetLibraryEntry>()

  for (const board of boards) {
    for (const item of board.items) {
      if (!item.src) continue
      const existing = bySrc.get(item.src)
      if (existing) {
        existing.count += 1
        continue
      }
      bySrc.set(item.src, {
        src: item.src,
        filename: filenameFromSrc(item.src),
        type: item.type,
        count: 1,
        firstItemId: item.id,
        firstBoardId: board.id,
      })
    }
  }

  return Array.from(bySrc.values()).sort((a, b) => a.filename.localeCompare(b.filename))
}
