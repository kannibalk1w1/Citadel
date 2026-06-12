import { useSyncExternalStore } from 'react'

// Derived, renderer-memory metadata about local asset files, keyed by item
// src. First slice of the archive index: later phases add dimensions, hash,
// and worker-backed population.
export type AssetMetadataRecord = {
  src: string
  exists: boolean
  size?: number
  mtimeMs?: number
  thumbnailPath?: string | null // undefined = not yet checked, null = checked and absent
}

const URL_LIKE_RE = /^(https?|data:|blob:|local:|file:)/i

export function isLocalAssetSrc(src: string | undefined): src is string {
  return Boolean(src) && !URL_LIKE_RE.test(src as string)
}

const records = new Map<string, AssetMetadataRecord>()
const listeners = new Set<() => void>()

export function recordAssetMetadata(record: AssetMetadataRecord): void {
  if (!isLocalAssetSrc(record.src)) return
  const previous = records.get(record.src)
  records.set(record.src, { ...previous, ...record })
  listeners.forEach((listener) => listener())
}

export function getAssetMetadata(src: string | undefined): AssetMetadataRecord | undefined {
  return src ? records.get(src) : undefined
}

export function subscribeAssetMetadata(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function useAssetMetadata(src: string | undefined): AssetMetadataRecord | undefined {
  return useSyncExternalStore(subscribeAssetMetadata, () => getAssetMetadata(src))
}

export function clearAssetMetadataForTest(): void {
  records.clear()
}
