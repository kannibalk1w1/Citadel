import { nanoid } from 'nanoid'
import type { CanvasItem, ItemType } from '../../types'

// Folder ingestion for the Archive Workbench: media files become relics laid
// out in a grid at the viewport centre, ready for sigil assignment.

const EXTENSION_TYPES: Record<string, ItemType> = {
  png: 'image', jpg: 'image', jpeg: 'image', webp: 'image', bmp: 'image', svg: 'image',
  gif: 'gif',
  mp4: 'video', webm: 'video', mov: 'video', mkv: 'video',
  mp3: 'audio', wav: 'audio', ogg: 'audio', flac: 'audio',
  glb: 'model3d', gltf: 'model3d', obj: 'model3d',
}

export const INGEST_COLUMNS = 5
export const INGEST_CELL = { width: 220, height: 220, gap: 24 }

export function relicTypeForExtension(extension: string): ItemType | null {
  return EXTENSION_TYPES[extension.toLowerCase()] ?? null
}

export function buildIngestItems(
  paths: string[],
  origin: { x: number; y: number },
  idFactory: () => string = nanoid,
): CanvasItem[] {
  const items: CanvasItem[] = []
  for (const path of paths) {
    const extension = path.split('.').pop() ?? ''
    const type = relicTypeForExtension(extension)
    if (!type) continue
    const index = items.length
    const column = index % INGEST_COLUMNS
    const row = Math.floor(index / INGEST_COLUMNS)
    items.push({
      id: idFactory(),
      type,
      x: origin.x + column * (INGEST_CELL.width + INGEST_CELL.gap),
      y: origin.y + row * (INGEST_CELL.height + INGEST_CELL.gap),
      width: INGEST_CELL.width,
      height: type === 'audio' ? 80 : INGEST_CELL.height,
      rotation: 0,
      zIndex: 0,
      locked: false,
      visible: true,
      opacity: 1,
      tags: [],
      src: path,
    })
  }
  return items
}
