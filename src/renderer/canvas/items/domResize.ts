export const resizeHandles = [
  'top-left', 'top', 'top-right',
  'left', 'right',
  'bottom-left', 'bottom', 'bottom-right',
] as const

export type ResizeHandle = typeof resizeHandles[number]

export type ResizeRect = {
  x: number
  y: number
  width: number
  height: number
}

export const resizeCursor: Record<ResizeHandle, string> = {
  'top-left': 'nwse-resize',
  top: 'ns-resize',
  'top-right': 'nesw-resize',
  left: 'ew-resize',
  right: 'ew-resize',
  'bottom-left': 'nesw-resize',
  bottom: 'ns-resize',
  'bottom-right': 'nwse-resize',
}

export function resizeFromHandle(start: ResizeRect, handle: ResizeHandle, dx: number, dy: number, minimumSize: number): ResizeRect {
  let left = start.x
  let top = start.y
  let right = start.x + start.width
  let bottom = start.y + start.height

  if (handle.includes('left')) left = Math.min(right - minimumSize, left + dx)
  if (handle.includes('right')) right = Math.max(left + minimumSize, right + dx)
  if (handle.includes('top')) top = Math.min(bottom - minimumSize, top + dy)
  if (handle.includes('bottom')) bottom = Math.max(top + minimumSize, bottom + dy)

  return { x: left, y: top, width: right - left, height: bottom - top }
}
