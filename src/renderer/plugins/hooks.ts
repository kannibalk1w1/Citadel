import type { CanvasEventType, CanvasEvent } from '../../types'

type EventHandler = (event: CanvasEvent) => void

class PluginHooks {
  itemTypes: Map<string, unknown> = new Map()
  private listeners: Map<CanvasEventType, Set<EventHandler>> = new Map()

  on(type: CanvasEventType, handler: EventHandler): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type)!.add(handler)
    return () => this.listeners.get(type)?.delete(handler)
  }

  emit(event: CanvasEvent): void {
    this.listeners.get(event.type)?.forEach((h) => h(event))
  }
}

export const pluginHooks = new PluginHooks()
