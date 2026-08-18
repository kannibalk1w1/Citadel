/**
 * What the renderer is allowed to ask the operating system for.
 *
 * Electron grants every permission by default when no handler is installed,
 * which for Citadel meant geolocation, notifications, USB, serial, HID and the
 * camera were all available to any code running in the window — including the
 * YouTube webview, which is somebody else's page. Nothing asked for them, but
 * "nothing asks today" is not the same as "nothing can", and the README makes a
 * promise about this app not reaching past your machine.
 *
 * So: deny by default, and name the three things the app actually does.
 *
 * Pure, so the policy can be read and tested without an Electron session.
 */

/** Permissions Citadel genuinely uses. Everything absent from here is refused. */
export const ALLOWED_PERMISSIONS = [
  // Voice memos. Audio only — see mediaTypesAreAudioOnly.
  'media',
  // Copying a code card, a hex value, or a share code to the clipboard.
  'clipboard-sanitized-write',
  // The fullscreen button on a video item, and on the YouTube player.
  'fullscreen',
] as const

export type PermissionDetails = {
  /** Present on a request; lists every media kind being asked for at once. */
  mediaTypes?: readonly string[]
  /** Present on a synchronous check, which asks about one kind at a time. */
  mediaType?: string
}

/**
 * Citadel records voice memos and has no feature that wants a camera, so a
 * request naming video is refused even though it arrives under the same
 * permission. A request naming nothing is refused too: an unspecified media
 * request is not evidence that only the microphone is wanted.
 */
function mediaTypesAreAudioOnly(details: PermissionDetails | undefined): boolean {
  const types = details?.mediaTypes ?? (details?.mediaType ? [details.mediaType] : [])
  return types.length > 0 && types.every((type) => type === 'audio')
}

export function isPermissionAllowed(permission: string, details?: PermissionDetails): boolean {
  if (!(ALLOWED_PERMISSIONS as readonly string[]).includes(permission)) return false
  if (permission === 'media') return mediaTypesAreAudioOnly(details)
  return true
}
