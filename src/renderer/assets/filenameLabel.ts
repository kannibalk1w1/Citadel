import { TEXT_SILHOUETTE_MIN_SCREEN_FONT_PX } from './textDetailPolicy'

export const FILENAME_LABEL_FONT_PX = 10

// Source basename shown under media relics when the filename toggle is on.
// Follows the far-zoom text discipline: below readable size, no label at all.
export function filenameInscription(
  src: string | undefined,
  visible: boolean,
  viewportScale: number,
): string | null {
  if (!visible || !src) return null
  if (FILENAME_LABEL_FONT_PX * viewportScale < TEXT_SILHOUETTE_MIN_SCREEN_FONT_PX) return null
  return src.split(/[\\/]/).pop() || null
}
