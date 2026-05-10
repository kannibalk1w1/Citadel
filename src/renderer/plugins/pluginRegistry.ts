import type { Plugin, PluginAPI } from '../../types'
import { useMascotStore } from '../store/mascotStore'
import { pluginHooks } from './hooks'

const registry = new Map<string, Plugin>()

export function buildPluginAPI(): PluginAPI {
  return {
    registerItemType: (type, component) => {
      // Registered item types are picked up by ItemRenderer at runtime
      pluginHooks.itemTypes.set(type, component)
    },
    onEvent: (eventType, handler) => {
      return pluginHooks.on(eventType, handler)
    },
    triggerMascotEffect: (name) => {
      useMascotStore.getState().triggerEffect(name as never)
    },
  }
}

export function loadPlugin(plugin: Plugin): void {
  if (registry.has(plugin.id)) {
    console.warn(`Plugin "${plugin.id}" is already loaded.`)
    return
  }
  const api = buildPluginAPI()
  plugin.activate(api)
  registry.set(plugin.id, plugin)
  useMascotStore.getState().triggerEffect('banner-raise')
  console.log(`[Citadel] Plugin loaded: ${plugin.name} v${plugin.version}`)
}

export function unloadPlugin(id: string): void {
  const plugin = registry.get(id)
  if (!plugin) return
  plugin.deactivate?.()
  registry.delete(id)
}

export function getLoadedPlugins(): Plugin[] {
  return [...registry.values()]
}
