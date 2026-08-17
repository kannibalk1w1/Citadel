// Guards every path that hands a URL to shell.openExternal.
//
// Two of those paths take input we do not control: a relic's `link` field,
// which travels inside shareable .citadel/.citadelz files, and window.open
// calls originating in the YouTube <webview>. openExternal happily launches
// `file:` targets through their default handler on Windows, so the scheme is
// checked against an allowlist rather than a denylist.
const OPENABLE_SCHEMES = new Set(['http:', 'https:', 'mailto:'])

export function isExternallyOpenable(url: unknown): url is string {
  if (typeof url !== 'string' || !url.trim()) return false
  try {
    return OPENABLE_SCHEMES.has(new URL(url).protocol)
  } catch {
    return false
  }
}
