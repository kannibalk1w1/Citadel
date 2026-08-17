/**
 * Cursor packs.
 *
 * A pack is data, never code: a small JSON file holding one image per cursor
 * slot as a data URI. That keeps art that cannot ship inside the app — anything
 * with someone else's trade dress on it — distributable on its own without
 * needing a plugin runtime, and without a pack ever being able to execute.
 *
 * Everything arriving here is untrusted. A pack is a file a user was handed by
 * someone else, and its values end up inside a CSS `url()`, so the checks below
 * are the whole security boundary:
 *
 *   - data: URIs only. `http(s):` would let a pack phone home every time the
 *     cursor changed; `file:` would read off the user's disk.
 *   - image types only, base64 only, so the payload cannot carry script.
 *   - no quotes, parens, backslashes or whitespace, which are what would break
 *     out of the `url("…")` the value is pasted into.
 *   - bounded, because a pack is persisted into settings.json.
 */
export const CURSOR_SLOTS = [
  'default', 'select', 'pan', 'connect', 'lasso',
  'text', 'code', 'sticky', 'swatch', 'comparison', 'link', 'tag', 'record',
] as const

export type CursorSlot = (typeof CURSOR_SLOTS)[number]

export type CursorPack = {
  format: 'citadel-cursors'
  version: 1
  name: string
  cursors: Partial<Record<CursorSlot, string>>
}

export const CURSOR_PACK_EXTENSION = 'citadel-cursors.json'

/** Chromium will not use a cursor bigger than 128×128 anyway. */
export const MAX_CURSOR_BYTES = 64 * 1024
export const MAX_PACK_BYTES = 512 * 1024
const MAX_NAME_LENGTH = 48

const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/gif',
  'image/webp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
])

// Deliberately strict: type, then `;base64,`, then base64's own alphabet and
// nothing else. Anything with a quote or a space in it never reaches CSS.
const DATA_URI = /^data:([a-z-]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/

/** Roughly how many bytes a base64 payload decodes to, without decoding it. */
function decodedBytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.floor((base64.length * 3) / 4) - padding
}

export function isUsableCursorImage(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = DATA_URI.exec(value)
  if (!match) return false
  if (!ALLOWED_IMAGE_TYPES.has(match[1].toLowerCase())) return false
  return decodedBytes(match[2]) <= MAX_CURSOR_BYTES
}

const isCursorSlot = (value: string): value is CursorSlot =>
  (CURSOR_SLOTS as readonly string[]).includes(value)

/**
 * Returns a pack only if every part of it is usable, and null otherwise. A
 * partly-valid pack is dropped rather than repaired: silently discarding half
 * of someone's cursors looks like a bug in the app rather than a bad file.
 */
export function normalizeCursorPack(value: unknown): CursorPack | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  if (record.format !== 'citadel-cursors' || record.version !== 1) return null

  const name = typeof record.name === 'string' ? record.name.trim().replace(/\s+/g, ' ') : ''
  if (!name || name.length > MAX_NAME_LENGTH) return null
  if (!record.cursors || typeof record.cursors !== 'object' || Array.isArray(record.cursors)) return null

  const cursors: Partial<Record<CursorSlot, string>> = {}
  let total = 0
  for (const [slot, image] of Object.entries(record.cursors as Record<string, unknown>)) {
    if (!isCursorSlot(slot)) return null
    if (!isUsableCursorImage(image)) return null
    total += image.length
    cursors[slot] = image
  }

  if (Object.keys(cursors).length === 0) return null
  if (total > MAX_PACK_BYTES) return null

  return { format: 'citadel-cursors', version: 1, name, cursors }
}

/**
 * The CSS cursor map for a pack, laid over the app's standard cursors.
 *
 * Every custom cursor keeps the standard one as its fallback keyword, so a
 * pack that omits a slot — or an image the platform refuses to decode — leaves
 * a working pointer rather than none at all.
 */
export function cursorPackCss(
  pack: CursorPack | null,
  standard: Record<string, string>,
): Record<string, string> {
  if (!pack) return standard
  const merged: Record<string, string> = { ...standard }
  for (const [slot, image] of Object.entries(pack.cursors)) {
    const fallback = standard[slot] ?? standard.default ?? 'default'
    merged[slot] = `url("${image}"), ${fallback}`
  }
  return merged
}
