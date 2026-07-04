// Konva mirror transform for flipped media relics. scale -1 with an offset of
// the node's rendered size mirrors content inside its original rect.
export type FlipProps = { scaleX: number; scaleY: number; offsetX: number; offsetY: number }

export function flipProps(flipX: boolean, flipY: boolean, width: number, height: number): FlipProps {
  return {
    scaleX: flipX ? -1 : 1,
    scaleY: flipY ? -1 : 1,
    offsetX: flipX ? width : 0,
    offsetY: flipY ? height : 0,
  }
}

export function itemFlip(meta: Record<string, unknown> | undefined): { flipX: boolean; flipY: boolean } {
  return {
    flipX: meta?.flipX === true,
    flipY: meta?.flipY === true,
  }
}
