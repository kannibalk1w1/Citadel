import { describe, expect, it } from 'vitest'
import { ALLOWED_PERMISSIONS, isPermissionAllowed } from './permissions'

describe('the permission allowlist', () => {
  it('allows the microphone, which is what voice memos need', () => {
    expect(isPermissionAllowed('media', { mediaTypes: ['audio'] })).toBe(true)
    expect(isPermissionAllowed('media', { mediaType: 'audio' })).toBe(true)
  })

  it('refuses the camera, which nothing in Citadel uses', () => {
    expect(isPermissionAllowed('media', { mediaTypes: ['video'] })).toBe(false)
    expect(isPermissionAllowed('media', { mediaType: 'video' })).toBe(false)
    // Asking for both at once must not smuggle the camera in beside the mic.
    expect(isPermissionAllowed('media', { mediaTypes: ['audio', 'video'] })).toBe(false)
  })

  it('refuses a media request that names nothing', () => {
    expect(isPermissionAllowed('media', {})).toBe(false)
    expect(isPermissionAllowed('media', undefined)).toBe(false)
    expect(isPermissionAllowed('media', { mediaTypes: [] })).toBe(false)
  })

  it('allows writing to the clipboard and going fullscreen', () => {
    expect(isPermissionAllowed('clipboard-sanitized-write')).toBe(true)
    expect(isPermissionAllowed('fullscreen')).toBe(true)
  })

  it('refuses everything Citadel has no business asking for', () => {
    for (const permission of [
      'geolocation', 'notifications', 'midi', 'midiSysex', 'hid', 'serial', 'usb',
      'idle-detection', 'display-capture', 'pointerLock', 'openExternal',
      'window-management', 'local-fonts', 'clipboard-read', 'unknown',
    ]) {
      expect(isPermissionAllowed(permission)).toBe(false)
    }
  })

  it('is a short list, and stays one', () => {
    // A growing allowlist should be a decision someone made on purpose.
    expect([...ALLOWED_PERMISSIONS].sort()).toEqual(['clipboard-sanitized-write', 'fullscreen', 'media'])
  })
})
