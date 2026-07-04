export const TEXT_SILHOUETTE_MIN_SCREEN_FONT_PX = 5

// Far-zoom text discipline: below a readable on-screen font size, text relics
// render a dim silhouette instead of laying out Konva glyphs. Selection and
// editing always wake the full text, matching previewPolicy's selection rule.
export function preferTextSilhouette(
  fontSize: number,
  viewportScale: number,
  isSelected: boolean,
  isEditing: boolean,
): boolean {
  if (isSelected || isEditing) return false
  return fontSize * viewportScale < TEXT_SILHOUETTE_MIN_SCREEN_FONT_PX
}
