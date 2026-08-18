/**
 * Parsing the data URLs the renderer hands to the main process.
 *
 * A data URL is `data:[<type>/<subtype>][;<param>=<value>]*[;base64],<data>`,
 * and the parameters are not optional in practice: MediaRecorder reports its
 * blobs as `audio/webm;codecs=opus`, so a recorded voice memo arrives as
 * `data:audio/webm;codecs=opus;base64,…`. A parser that expects `;base64,`
 * directly after the subtype rejects every recording ever made — which is
 * exactly what happened, and why the feature saved nothing while throwing in
 * the console.
 *
 * Everything here is pure so the grammar can be tested without touching disk.
 */

/**
 * Where the subtype makes a poor file extension. Anything not listed keeps its
 * subtype, which is right far more often than it is wrong.
 */
const EXTENSION_OVERRIDES: Record<string, string> = {
  jpeg: 'jpg',
  'svg+xml': 'svg',
  mpeg: 'mp3',
  'x-icon': 'ico',
  'vnd.microsoft.icon': 'ico',
  quicktime: 'mov',
  'x-wav': 'wav',
  wave: 'wav',
}

// Parameters are matched as "anything up to the first ;base64," rather than as
// name=value pairs, because their values legitimately contain commas —
// MediaRecorder reports video as `video/webm;codecs=vp8,opus`. The lazy
// quantifier makes the first `;base64,` the separator, which is the real one.
const DATA_URL = /^data:([a-z0-9!#$&^_.+-]+)\/([a-z0-9!#$&^_.+-]+)((?:;[^;]*)*?);base64,([A-Za-z0-9+/\s]*={0,2})$/i

export type ParsedDataUrl = {
  type: string
  subtype: string
  /** Filename extension, without a dot. */
  extension: string
  bytes: Buffer
}

export function parseDataUrl(value: unknown): ParsedDataUrl | null {
  if (typeof value !== 'string') return null
  const match = DATA_URL.exec(value)
  if (!match) return null

  const [, type, subtype, , payload] = match
  // Whitespace is legal inside a base64 body and Buffer ignores it, but it must
  // not be the only thing there.
  const base64 = payload.replace(/\s+/g, '')
  if (!base64) return null

  const bytes = Buffer.from(base64, 'base64')
  if (bytes.length === 0) return null

  const lowerSubtype = subtype.toLowerCase()
  return {
    type: type.toLowerCase(),
    subtype: lowerSubtype,
    extension: EXTENSION_OVERRIDES[lowerSubtype] ?? lowerSubtype,
    bytes,
  }
}
