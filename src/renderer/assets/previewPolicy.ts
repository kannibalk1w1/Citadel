export const THUMBNAIL_MAX_SIDE = 256

// Resolution-aware: use the cached thumbnail when the relic's largest
// on-screen side fits within the thumbnail resolution, so far zoom and small
// mid-zoom relics stay cheap. Selection always wakes the full image.
export function preferThumbnail(screenWidth: number, screenHeight: number, isSelected: boolean): boolean {
  if (isSelected) return false
  return Math.max(screenWidth, screenHeight) <= THUMBNAIL_MAX_SIDE
}

export function thumbnailDimensions(width: number, height: number, maxSide = THUMBNAIL_MAX_SIDE): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxSide) {
    return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) }
  }
  const scale = maxSide / longest
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}
