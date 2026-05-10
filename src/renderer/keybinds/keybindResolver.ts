import { defaultKeybinds } from './defaultKeybinds'
import type { ActionName, KeybindMap } from '../../types'

// Serialize a KeyboardEvent into a canonical combo string
export function serializeEvent(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey) parts.push('ctrl')
  if (e.metaKey) parts.push('meta')
  if (e.altKey) parts.push('alt')
  if (e.shiftKey) parts.push('shift')
  const key = e.key.toLowerCase()
  if (key !== 'control' && key !== 'meta' && key !== 'alt' && key !== 'shift') {
    parts.push(key)
  }
  return parts.join('+')
}

type Handler = () => void

export class KeybindResolver {
  private map: Map<string, ActionName>       // combo → action
  private handlers: Map<ActionName, Handler> // action → handler

  constructor(overrides: Partial<KeybindMap> = {}) {
    this.map = new Map()
    this.handlers = new Map()

    const merged = { ...defaultKeybinds, ...overrides }
    for (const [action, combos] of Object.entries(merged)) {
      for (const combo of combos as string[]) {
        this.map.set(combo, action as ActionName)
      }
    }
  }

  register(action: ActionName, handler: Handler): void {
    this.handlers.set(action, handler)
  }

  resolve(e: KeyboardEvent): boolean {
    const combo = serializeEvent(e)
    const action = this.map.get(combo)
    if (!action) return false
    const handler = this.handlers.get(action)
    if (!handler) return false
    e.preventDefault()
    handler()
    return true
  }

  dispatch(action: ActionName): boolean {
    const handler = this.handlers.get(action)
    if (!handler) return false
    handler()
    return true
  }
}

// Singleton for the renderer — imported and populated by feature code
export const resolver = new KeybindResolver()
