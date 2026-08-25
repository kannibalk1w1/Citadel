type Listener = (...args: unknown[]) => void

export type DemoBridge = {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  on: (_channel: string, _listener: Listener) => () => void
  once: (_channel: string, _listener: Listener) => void
}

type StoredSettings = Record<string, unknown>

const SETTINGS_STORAGE_KEY = 'citadel.browser-demo.settings'

function readSettings(): StoredSettings {
  try {
    const value = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!value) return {}
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as StoredSettings
      : {}
  } catch {
    return {}
  }
}

function writeSettings(settings: StoredSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Browser privacy modes can deny storage. The demo remains usable in the
    // current tab, just without retaining display preferences between visits.
  }
}

function objectArg(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

/**
 * A deliberately narrow substitute for Electron's preload bridge.
 *
 * It serves the bundled showcase and browser-safe preferences, while native
 * file/window channels return harmless empty results. That lets the existing
 * renderer stay a single application instead of gaining browser checks at
 * every call site.
 */
export function createDemoBridge(showcaseData: string): DemoBridge {
  return {
    async invoke(channel, ...args) {
      const payload = objectArg(args[0])

      if (channel === 'showcase:load') return { data: showcaseData }
      if (channel === 'recovery:get') return { data: null }
      if (channel === 'recovery:clear' || channel === 'file:saveRecovery') return { ok: true }
      if (channel === 'keybinds:get') return { overrides: {} }

      if (channel === 'settings:get') {
        const key = typeof payload.key === 'string' ? payload.key : ''
        return { value: readSettings()[key] }
      }
      if (channel === 'settings:getMany') {
        const settings = readSettings()
        const keys = Array.isArray(payload.keys) ? payload.keys.filter((key): key is string => typeof key === 'string') : []
        return { values: Object.fromEntries(keys.map((key) => [key, settings[key]])) }
      }
      if (channel === 'settings:set') {
        const key = typeof payload.key === 'string' ? payload.key : ''
        if (key) writeSettings({ ...readSettings(), [key]: payload.value })
        return { ok: true }
      }
      if (channel === 'settings:setMany') {
        const values = objectArg(payload.values)
        writeSettings({ ...readSettings(), ...values })
        return { ok: true }
      }

      if (channel === 'window:setMode') {
        return { ok: true, mode: { alwaysOnTop: false, opacity: 1, clickThrough: false } }
      }
      if (channel === 'zoom:set') return { ok: true }

      // Project-file operations intentionally stay unavailable for this
      // session-only demo. Returning the normal cancellation shapes prevents
      // a shortcut or overlooked native control from breaking the canvas.
      if (channel === 'file:openDialog' || channel === 'file:saveDialog') return { path: null }
      if (channel === 'file:load') return { data: null }
      if (channel === 'import:zip') return { ok: false, reason: 'Project files are available in the desktop app.' }
      if (channel === 'assets:scanFolder') return { folder: null, files: [] }
      if (channel === 'assets:getThumbnail') return { exists: true, thumbnailPath: null }
      if (channel === 'cache:previewStats') return { count: 0, bytes: 0 }
      if (channel === 'cache:clearUnusedPreviews') return { ok: true }

      return { ok: false, unavailableInBrowserDemo: true }
    },
    on: () => () => {},
    once: () => {},
  }
}
