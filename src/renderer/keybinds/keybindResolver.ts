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

  /**
   * Actions that currently have a handler, in registration order.
   *
   * The command palette lists these rather than keeping its own catalogue: an
   * action with no handler would be a dead row, and a second registry would
   * drift from this one the moment a feature registered without updating it.
   */
  registeredActions(): ActionName[] {
    return [...this.handlers.keys()]
  }

  hasHandler(action: ActionName): boolean {
    return this.handlers.has(action)
  }

  /**
   * Every combo bound to an action, from the same merged map `resolve` uses —
   * so anything the palette displays is what the user would actually press,
   * including their overrides.
   */
  bindingsFor(action: ActionName): string[] {
    const combos: string[] = []
    for (const [combo, bound] of this.map) {
      if (bound === action) combos.push(combo)
    }
    return combos
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
