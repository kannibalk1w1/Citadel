/**
 * Returns the screen-space pixel position of the text insertion caret.
 *
 * textarea/input: mirror-div technique (browser has no native API for this).
 * contentEditable: Selection API gives DOMRect directly.
 *
 * Returns null when position cannot be determined (no selection, collapsed
 * to element origin, etc.).
 */

const MIRROR_COPY_PROPS = [
  'fontFamily', 'fontSize', 'fontStyle', 'fontWeight', 'letterSpacing',
  'lineHeight', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'boxSizing', 'whiteSpace', 'wordBreak', 'overflowWrap', 'tabSize',
] as const

export function getCaretScreenPos(el: HTMLElement): { x: number; y: number } | null {
  if (el.isContentEditable) return getCaretFromSelection()

  const input = el as HTMLInputElement | HTMLTextAreaElement
  const selStart = input.selectionStart
  if (selStart === null) return null

  const computed = window.getComputedStyle(input)
  const rect = input.getBoundingClientRect()

  const mirror = document.createElement('div')
  mirror.setAttribute('aria-hidden', 'true')
  for (const p of MIRROR_COPY_PROPS) {
    mirror.style[p] = computed[p]
  }
  mirror.style.position = 'fixed'
  mirror.style.visibility = 'hidden'
  mirror.style.pointerEvents = 'none'
  mirror.style.width = rect.width + 'px'
  mirror.style.height = rect.height + 'px'
  mirror.style.left = rect.left + 'px'
  mirror.style.top = rect.top + 'px'
  mirror.style.overflow = 'hidden'

  mirror.appendChild(document.createTextNode(input.value.substring(0, selStart)))
  const marker = document.createElement('span')
  marker.textContent = '​'
  mirror.appendChild(marker)

  document.body.appendChild(mirror)
  mirror.scrollTop = input.scrollTop
  mirror.scrollLeft = input.scrollLeft
  const markerRect = marker.getBoundingClientRect()
  document.body.removeChild(mirror)

  // If the marker collapsed onto the element's origin, the position is
  // unreliable (e.g. selectionStart=0 with no text).
  if (markerRect.left < rect.left + 1 && markerRect.top < rect.top + 1 && selStart === 0) {
    return { x: rect.left + 2, y: rect.top + 2 }
  }

  return { x: markerRect.left, y: markerRect.top }
}

function getCaretFromSelection(): { x: number; y: number } | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const rects = sel.getRangeAt(0).getClientRects()
  if (rects.length === 0) return null
  return { x: rects[0].left, y: rects[0].top }
}
