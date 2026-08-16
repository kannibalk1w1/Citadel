import React from 'react'
import { COLOUR_BLIND_MATRICES, visionFilterId, type VisionMode } from './visionModes'

/**
 * The SVG colour matrices the colour-blindness checks reference by id.
 *
 * CSS has `grayscale()` and `blur()` but nothing for dichromacy, so those modes
 * need a real filter primitive. Rendered once, off-screen, and only while such
 * a mode is on — an always-present filter would sit in every layer's paint path
 * for a feature most sessions never turn on.
 */
export function VisionFilterDefs({ mode }: { mode: VisionMode }): React.ReactElement | null {
  const id = visionFilterId(mode)
  if (!id) return null

  const matrix = COLOUR_BLIND_MATRICES[mode]
  if (!matrix) return null

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={0}
      height={0}
      style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
    >
      <defs>
        <filter id={id} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={matrix} />
        </filter>
      </defs>
    </svg>
  )
}
