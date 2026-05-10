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
