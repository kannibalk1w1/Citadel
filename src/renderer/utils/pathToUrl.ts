/**
 * Converts a stored asset path (raw Windows/Unix filesystem path) to a URL
 * usable by browser APIs (Image, video src, fetch, etc.).
 * Passes through anything already a URL.
 */
export function pathToUrl(src: string): string {
  if (!src) return ''
  if (/^(https?|data:|blob:|file:|local:)/.test(src)) return src
  // Use the custom 'local://' protocol registered in the main process.
  // This sidesteps the cross-origin restriction that blocks file:// URLs
  // when the renderer is loaded from http://localhost (dev mode).
  return 'local:///' + src.replace(/\\/g, '/')
}

/**
 * True for a local path rather than an address.
 *
 * `pathToUrl` passes a URL straight through, which is what makes this
 * necessary: anything that reads a stored `src` and hands it to fetch would
 * otherwise reach the network on a source it did not choose. A `.citadel` file
 * is made to be handed around, so its paths are not trusted to be local.
 *
 * A URL scheme is never shorter than two characters before the colon, which is
 * what keeps `C:\\archive\\voice.m4a` a local path. The main process holds the
 * same line in `documentText.ts` and `transcription.ts`.
 */
export function isLocalSourcePath(src: string): boolean {
  return src.trim() !== '' && !/^[a-z][a-z0-9+.-]+:/i.test(src)
}
