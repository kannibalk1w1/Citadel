import { useLayoutEffect } from 'react'
import { useUIStore } from '../store/uiStore'
import { visionFilter, visionInteractive, visionTransform, type VisionMode } from './visionModes'

/**
 * A board is drawn across two layers that are not in the same subtree: the
 * Konva stage with its SVG connection overlay, inside the canvas container, and
 * the DOM-item layer (video, YouTube, audio, 3D), which `DOMItem` portals to a
 * sibling of `#root`. A check has to reach both or a mirrored board would leave
 * its videos facing the other way.
 *
 * The DOM layer is created imperatively on first use and may not exist yet, so
 * it is looked up each time rather than held.
 */
const DOM_LAYER_ID = 'dom-items-layer'

function applyVision(element: HTMLElement | null, mode: VisionMode, mirrored: boolean): void {
  if (!element) return
  element.style.filter = visionFilter(mode)
  element.style.transform = visionTransform(mirrored)
  // `transform` on the canvas container would otherwise move the origin the
  // absolutely-positioned layers are measured from.
  element.style.transformOrigin = 'center center'
  element.style.pointerEvents = visionInteractive(mirrored) ? '' : 'none'
}

export function useVisionLayers(canvasContainer: HTMLElement | null): void {
  const visionMode = useUIStore((s) => s.visionMode)
  const mirrorView = useUIStore((s) => s.mirrorView)

  useLayoutEffect(() => {
    applyVision(canvasContainer, visionMode, mirrorView)
    applyVision(document.getElementById(DOM_LAYER_ID), visionMode, mirrorView)

    return () => {
      applyVision(canvasContainer, 'none', false)
      applyVision(document.getElementById(DOM_LAYER_ID), 'none', false)
    }
  }, [canvasContainer, visionMode, mirrorView])
}
