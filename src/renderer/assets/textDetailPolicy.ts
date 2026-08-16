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

/** The code card's `<pre>` font, in CSS pixels. */
export const CODE_CARD_FONT_PX = 12

/**
 * Far-zoom discipline for the code snippet card.
 *
 * The card is a DOM overlay, not a Konva node, and `DOMItem` sizes it in screen
 * pixels without a CSS scale transform. Its glyphs therefore never shrink: at
 * far zoom the box collapses around text that is still 12px, so the user sees a
 * handful of clipped characters rather than small ones. Different mechanism,
 * same outcome — the content stops being readable — so the card silhouettes at
 * the zoom where a 12px Konva text item would, and every item type keeps one
 * threshold.
 *
 * Selection and editing always wake the full card, which is also what keeps the
 * Copy button and double-click editing reachable: acting on a card selects it.
 */
export function preferCodeSilhouette(
  viewportScale: number,
  isSelected: boolean,
  isEditing: boolean,
): boolean {
  return preferTextSilhouette(CODE_CARD_FONT_PX, viewportScale, isSelected, isEditing)
}
