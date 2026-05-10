import { nanoid } from 'nanoid'
import type { DragEvent } from 'react'
import type { CanvasItem, ItemType } from '../../types'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { useMascotStore } from '../store/mascotStore'
import { pathToUrl } from '../utils/pathToUrl'

// Electron exposes file.path on File objects dropped from the OS
type ElectronFile = File & { path: string }

type FileTypeInfo = {
  type: ItemType
  defaultWidth: number
  defaultHeight: number
}

const EXT_MAP: Record<string, FileTypeInfo> = {
  // Images
  jpg:  { type: 'image',   defaultWidth: 400, defaultHeight: 300 },
  jpeg: { type: 'image',   defaultWidth: 400, defaultHeight: 300 },
  png:  { type: 'image',   defaultWidth: 400, defaultHeight: 300 },
  webp: { type: 'image',   defaultWidth: 400, defaultHeight: 300 },
  bmp:  { type: 'image',   defaultWidth: 400, defaultHeight: 300 },
  tiff: { type: 'image',   defaultWidth: 400, defaultHeight: 300 },
  tif:  { type: 'image',   defaultWidth: 400, defaultHeight: 300 },
  svg:  { type: 'image',   defaultWidth: 400, defaultHeight: 300 },
  // GIF
  gif:  { type: 'gif',     defaultWidth: 400, defaultHeight: 300 },
  // Video
  mp4:  { type: 'video',   defaultWidth: 480, defaultHeight: 270 },
  webm: { type: 'video',   defaultWidth: 480, defaultHeight: 270 },
  mov:  { type: 'video',   defaultWidth: 480, defaultHeight: 270 },
  mkv:  { type: 'video',   defaultWidth: 480, defaultHeight: 270 },
  avi:  { type: 'video',   defaultWidth: 480, defaultHeight: 270 },
  // Audio
  mp3:  { type: 'audio',   defaultWidth: 320, defaultHeight: 80  },
  wav:  { type: 'audio',   defaultWidth: 320, defaultHeight: 80  },
  ogg:  { type: 'audio',   defaultWidth: 320, defaultHeight: 80  },
  flac: { type: 'audio',   defaultWidth: 320, defaultHeight: 80  },
  aac:  { type: 'audio',   defaultWidth: 320, defaultHeight: 80  },
  m4a:  { type: 'audio',   defaultWidth: 320, defaultHeight: 80  },
  // 3D
  glb:  { type: 'model3d', defaultWidth: 320, defaultHeight: 320 },
  gltf: { type: 'model3d', defaultWidth: 320, defaultHeight: 320 },
  obj:  { type: 'model3d', defaultWidth: 320, defaultHeight: 320 },
  fbx:  { type: 'model3d', defaultWidth: 320, defaultHeight: 320 },
}

// Load actual pixel dimensions from an image file path (async)
function loadImageDimensions(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve({ w: 400, h: 300 })
    img.src = src
  })
}

// Clamp image dimensions so the longest side ≤ maxPx, preserving aspect ratio
function clampDimensions(w: number, h: number, maxPx = 800): { w: number; h: number } {
  const longest = Math.max(w, h)
  if (longest <= maxPx) return { w, h }
  const scale = maxPx / longest
  return { w: Math.round(w * scale), h: Math.round(h * scale) }
}

export function useFileDrop() {
  const addItem = useCanvasStore((s) => s.addItem)
  const setSelection = useCanvasStore((s) => s.setSelection)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)
  const viewport = useCanvasStore((s) => s.viewport())
  const pushEvent = useHistoryStore((s) => s.push)
  const triggerEffect = useMascotStore((s) => s.triggerEffect)

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (!activeBoardId) return

    const files = Array.from(e.dataTransfer.files) as ElectronFile[]
    if (files.length === 0) return

    // Convert screen drop position to canvas coordinates
    const dropX = (e.clientX - viewport.x) / viewport.scale
    const dropY = (e.clientY - viewport.y) / viewport.scale

    // ── Comparison drop intercept ─────────────────────────────────────────────
    const allItems = useCanvasStore.getState().items()
    const hitComparison = allItems.find(
      (it) =>
        it.type === 'comparison' &&
        dropX >= it.x &&
        dropX <= it.x + it.width &&
        dropY >= it.y &&
        dropY <= it.y + it.height
    )

    if (hitComparison) {
      const firstFile = files[0]
      if (!firstFile) return
      const ext = firstFile?.name.split('.').pop()?.toLowerCase() ?? ''
      const isImage = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'tif', 'svg'].includes(ext)
      if (isImage) {
        const slot = dropX < hitComparison.x + hitComparison.width / 2 ? 'srcA' : 'srcB'
        const newMeta = { ...hitComparison.meta, [slot]: firstFile.path }
        useCanvasStore.getState().updateItem(activeBoardId, hitComparison.id, { meta: newMeta })
        pushEvent(
          'ITEM_STYLE',
          activeBoardId,
          { id: hitComparison.id, meta: hitComparison.meta },
          { id: hitComparison.id, meta: newMeta }
        )
        triggerEffect('lightning-in')
        return
      }
    }
    // ── End comparison intercept ──────────────────────────────────────────────

    // Offset successive items so they don't all stack exactly
    let offsetIndex = 0
    const added: CanvasItem[] = []

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      const typeInfo = EXT_MAP[ext]
      if (!typeInfo) continue

      const src = file.path   // Electron provides full local path

      let width = typeInfo.defaultWidth
      let height = typeInfo.defaultHeight

      // For images and gifs, read actual dimensions
      if (typeInfo.type === 'image' || typeInfo.type === 'gif') {
        const dims = await loadImageDimensions(pathToUrl(src))
        const clamped = clampDimensions(dims.w, dims.h)
        width = clamped.w
        height = clamped.h
      }

      const STACK_OFFSET = 20
      const item: CanvasItem = {
        id: nanoid(),
        type: typeInfo.type,
        x: dropX - width / 2 + offsetIndex * STACK_OFFSET,
        y: dropY - height / 2 + offsetIndex * STACK_OFFSET,
        width,
        height,
        rotation: 0,
        zIndex: Date.now() + offsetIndex,
        locked: false,
        visible: true,
        opacity: 1,
        tags: [],
        src,
      }

      addItem(activeBoardId, item)
      pushEvent('ITEM_ADD', activeBoardId, null, item)
      added.push(item)
      offsetIndex++
    }

    setSelection(added.map((i) => i.id))
    triggerEffect('lightning-in')
  }

  return { handleDragOver, handleDrop }
}
