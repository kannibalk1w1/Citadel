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

/**
 * The inline styles each layer had before any check touched it.
 *
 * These two layers do not rest in the same state — the canvas container has no
 * inline `pointer-events`, while the DOM-item layer is created with
 * `pointer-events: none` so clicks fall through it to the stage. Clearing that
 * to `''` on the way out left the layer swallowing every click on the board.
 * Restoring what was actually there is the only version of this that is safe
 * for both.
 */
type LayerBaseline = { filter: string; transform: string; transformOrigin: string; pointerEvents: string }

const baselines = new WeakMap<HTMLElement, LayerBaseline>()

function baselineFor(element: HTMLElement): LayerBaseline {
  const existing = baselines.get(element)
  if (existing) return existing
  const baseline: LayerBaseline = {
    filter: element.style.filter,
    transform: element.style.transform,
    transformOrigin: element.style.transformOrigin,
    pointerEvents: element.style.pointerEvents,
  }
  baselines.set(element, baseline)
  return baseline
}

function applyVision(element: HTMLElement | null, mode: VisionMode, mirrored: boolean): void {
  if (!element) return
  const baseline = baselineFor(element)

  const filter = visionFilter(mode)
  element.style.filter = filter || baseline.filter
  const transform = visionTransform(mirrored)
  element.style.transform = transform || baseline.transform
  element.style.transformOrigin = mirrored ? 'center center' : baseline.transformOrigin
  // Only ever *added* while mirrored; otherwise the layer keeps whatever it had.
  element.style.pointerEvents = visionInteractive(mirrored) ? baseline.pointerEvents : 'none'
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
