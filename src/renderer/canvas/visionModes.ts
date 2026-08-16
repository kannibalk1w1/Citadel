/**
 * Vision checks — ways of looking at a board rather than changes to it.
 *
 * Artists check their work by removing information: drop the colour and see
 * whether the values still read, blur it down and see whether the composition
 * survives at thumbnail size, mirror it and see the drawing errors the eye had
 * stopped noticing. Citadel could not do any of that without exporting the
 * board and opening it somewhere else.
 *
 * Every mode here is a view transform. Nothing touches an item, nothing is
 * written to the project, and nothing pushes a `CanvasEvent` — there is no
 * state to undo, which is exactly why these are not item filters.
 *
 * Applied as CSS on the two layers a board is drawn across: the Konva stage
 * with its SVG connection overlay, and the portalled DOM-item layer. Doing it
 * in CSS rather than with Konva filters matters — `node.cache()` allocates a
 * bitmap per item, which is the last thing a large board needs.
 */

export type VisionMode =
  | 'none'
  /** Greyscale: does the picture hold together without hue? */
  | 'value'
  /** Heavy blur, the squint test: does the composition read at thumbnail size? */
  | 'squint'
  | 'deuteranopia'
  | 'protanopia'
  | 'tritanopia'

export type VisionModeDef = {
  id: VisionMode
  label: string
  hint: string
}

export const VISION_MODES: VisionModeDef[] = [
  { id: 'none', label: 'Normal', hint: 'The board as it is' },
  { id: 'value', label: 'Value', hint: 'Greyscale, to check values without colour' },
  { id: 'squint', label: 'Squint', hint: 'Blurred, to check the composition at a glance' },
  { id: 'deuteranopia', label: 'Deuteranopia', hint: 'Red-green colour blindness, the most common form' },
  { id: 'protanopia', label: 'Protanopia', hint: 'Red-green colour blindness, reduced red' },
  { id: 'tritanopia', label: 'Tritanopia', hint: 'Blue-yellow colour blindness' },
]

/** Screen-space, because the squint test is about the picture you end up looking at. */
export const SQUINT_BLUR_PX = 7

const COLOUR_BLIND_MODES = new Set<VisionMode>(['deuteranopia', 'protanopia', 'tritanopia'])

export function isColourBlindMode(mode: VisionMode): boolean {
  return COLOUR_BLIND_MODES.has(mode)
}

/** The id of the SVG filter this mode needs, or null if plain CSS covers it. */
export function visionFilterId(mode: VisionMode): string | null {
  return isColourBlindMode(mode) ? `citadel-vision-${mode}` : null
}

/** The CSS `filter` value for a mode. Empty string means "leave it alone". */
export function visionFilter(mode: VisionMode): string {
  if (mode === 'value') return 'grayscale(1)'
  if (mode === 'squint') return `blur(${SQUINT_BLUR_PX}px)`
  const id = visionFilterId(mode)
  return id ? `url(#${id})` : ''
}

/**
 * Mirroring is a transform rather than a filter, and it is the one check that
 * cannot stay interactive: Konva reads pointer positions from the container's
 * bounding box, which a CSS flip does not tell it about, so a drag would run
 * away from the cursor. The board is held still while it is flipped.
 */
export function visionTransform(mirrored: boolean): string {
  return mirrored ? 'scaleX(-1)' : ''
}

export function visionInteractive(mirrored: boolean): boolean {
  return !mirrored
}

export function isVisionActive(mode: VisionMode, mirrored: boolean): boolean {
  return mode !== 'none' || mirrored
}

export function visionModeLabel(mode: VisionMode): string {
  return VISION_MODES.find((entry) => entry.id === mode)?.label ?? 'Normal'
}

/**
 * What the status chip says while a check is on. It has to be unmissable:
 * someone who forgets they are in Value mode will think their board lost its
 * colour, and someone who forgets they are mirrored cannot click anything.
 */
export function visionStatusLabel(mode: VisionMode, mirrored: boolean): string | null {
  if (!isVisionActive(mode, mirrored)) return null
  const parts: string[] = []
  if (mode !== 'none') parts.push(`${visionModeLabel(mode)} check`)
  if (mirrored) parts.push('Mirrored — board held still')
  return parts.join(' · ')
}

/** Step through the modes for a single repeatable shortcut. */
export function nextVisionMode(mode: VisionMode): VisionMode {
  const index = VISION_MODES.findIndex((entry) => entry.id === mode)
  return VISION_MODES[(index + 1) % VISION_MODES.length].id
}

/**
 * Colour-blindness matrices from the Wickline simulation, the set most widely
 * used for this. They are an approximation of how a dichromat sees, good enough
 * to answer "does this board still read", not a clinical instrument.
 */
export const COLOUR_BLIND_MATRICES: Record<string, string> = {
  protanopia: [
    '0.567 0.433 0     0 0',
    '0.558 0.442 0     0 0',
    '0     0.242 0.758 0 0',
    '0     0     0     1 0',
  ].join(' '),
  deuteranopia: [
    '0.625 0.375 0    0 0',
    '0.700 0.300 0    0 0',
    '0     0.300 0.700 0 0',
    '0     0     0    1 0',
  ].join(' '),
  tritanopia: [
    '0.950 0.050 0     0 0',
    '0     0.433 0.567 0 0',
    '0     0.475 0.525 0 0',
    '0     0     0     1 0',
  ].join(' '),
}
