import React from 'react'
import towerUrl from '../../assets/CitadelTower.png'

/**
 * The original Citadel mascot: the pixel-art tower that shipped in the first
 * build and was dropped, along with everything else in `assets/`, during the
 * clean-interface pass.
 *
 * It is black line art on transparency, so on a near-black panel it would be a
 * hole rather than a tower. Inverting it for dark themes turns the structure
 * white and the highlights dark, which is how it read against the pale mockups
 * it was drawn for. The light theme takes it as it is.
 *
 * State is carried by a glow rather than by touching the art: nothing here
 * recolours the image, so what a person sees is the file they can replace.
 */
type Props = { size?: number; state?: 'rest' | 'unsaved' | 'saved' | 'recording' }

export function MascotCitadel({ size = 26, state = 'rest' }: Props): React.ReactElement {
  const glow = state === 'saved'
    ? 'drop-shadow(0 0 4px var(--accent))'
    : state === 'recording'
      ? 'drop-shadow(0 0 4px var(--accent-danger))'
      : 'none'

  return (
    <img
      className="citadel-mascot-tower"
      src={towerUrl}
      alt=""
      aria-hidden="true"
      style={{
        width: size,
        height: size * (638 / 464),
        objectFit: 'contain',
        display: 'block',
        // The invert lives in CSS, keyed off the theme; only the glow is per-state.
        filter: glow === 'none' ? undefined : glow,
      }}
    />
  )
}
