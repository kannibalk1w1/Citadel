import { create } from 'zustand'
import { RELIC_TEMPLATE_MAX, normalizeRelicTemplates, type RelicTemplate } from './relicTemplates'

type IpcWindow = Window & { ipc?: { invoke: (channel: string, args?: unknown) => Promise<unknown> } }

const SETTINGS_KEY = 'templates.relics'

function persist(templates: RelicTemplate[]): void {
  const ipc = (window as IpcWindow).ipc
  ipc?.invoke('settings:set', { key: SETTINGS_KEY, value: templates }).catch(console.error)
}

type RelicTemplateState = {
  templates: RelicTemplate[]
  loaded: boolean
  load: () => Promise<void>
  saveTemplate: (template: RelicTemplate) => void
  removeTemplate: (id: string) => void
}

export const useRelicTemplateStore = create<RelicTemplateState>((set, get) => ({
  templates: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return
    const ipc = (window as IpcWindow).ipc
    if (!ipc) return
    try {
      const result = (await ipc.invoke('settings:get', { key: SETTINGS_KEY })) as { value?: unknown }
      set({ templates: normalizeRelicTemplates(result?.value), loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  saveTemplate: (template) => {
    const templates = [...get().templates, template].slice(-RELIC_TEMPLATE_MAX)
    set({ templates })
    persist(templates)
  },

  removeTemplate: (id) => {
    const templates = get().templates.filter((t) => t.id !== id)
    set({ templates })
    persist(templates)
  },
}))
