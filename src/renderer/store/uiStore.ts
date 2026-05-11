import { create } from 'zustand'
import type { ToolMode } from '../../types'

type PanelState = {
  itemProperties: boolean
  connectionProperties: boolean
  keybindSettings: boolean
  tagSearch: boolean
}

type UIState = {
  toolMode: ToolMode
  setToolMode: (mode: ToolMode) => void

  theme: 'dark' | 'light'
  setTheme: (theme: 'dark' | 'light') => void

  panels: PanelState
  openPanel: (panel: keyof PanelState) => void
  closePanel: (panel: keyof PanelState) => void
  togglePanel: (panel: keyof PanelState) => void

  contextMenu: { x: number; y: number; targetId?: string } | null
  openContextMenu: (x: number, y: number, targetId?: string) => void
  closeContextMenu: () => void

  searchQuery: string
  setSearchQuery: (q: string) => void

  activeConnectionId: string | null
  setActiveConnectionId: (id: string | null) => void

  // Pending connect interaction
  connectFromId: string | null
  setConnectFromId: (id: string | null) => void

  // Inline text editing
  editingItemId: string | null
  setEditingItemId: (id: string | null) => void

  // Grid
  gridSize: number
  setGridSize: (size: number) => void
  snapToGrid: boolean
  toggleSnapToGrid: () => void

  // Snap guide re-render signal
  _snapTick: number
  bumpSnap: () => void

  // YOU SAVED banner
  youSavedEnabled: boolean
  youSavedVisible: boolean
  showYouSaved: () => void
  hideYouSaved: () => void
  setYouSavedEnabled: (enabled: boolean) => void

  // HyperType arcade mode
  hyperTypeEnabled: boolean
  setHyperTypeEnabled: (enabled: boolean) => void

  // Dragon cursor
  dragonCursorEnabled: boolean
  setDragonCursorEnabled: (enabled: boolean) => void

  // UI scale
  uiScale: number
  setUiScale: (v: number) => void
}

export const useUIStore = create<UIState>((set) => ({
  toolMode: 'select',
  setToolMode: (mode) => set({ toolMode: mode }),

  theme: 'dark',
  setTheme: (theme) => set({ theme }),

  panels: {
    itemProperties: false,
    connectionProperties: false,
    keybindSettings: false,
    tagSearch: false,
  },
  openPanel: (panel) => set((s) => ({ panels: { ...s.panels, [panel]: true } })),
  closePanel: (panel) => set((s) => ({ panels: { ...s.panels, [panel]: false } })),
  togglePanel: (panel) => set((s) => ({ panels: { ...s.panels, [panel]: !s.panels[panel] } })),

  contextMenu: null,
  openContextMenu: (x, y, targetId) => set({ contextMenu: { x, y, targetId } }),
  closeContextMenu: () => set({ contextMenu: null }),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  activeConnectionId: null,
  setActiveConnectionId: (id) => set({ activeConnectionId: id }),

  connectFromId: null,
  setConnectFromId: (id) => set({ connectFromId: id }),

  editingItemId: null,
  setEditingItemId: (id) => set({ editingItemId: id }),

  gridSize: 40,
  setGridSize: (size) => set({ gridSize: Math.max(8, Math.min(200, size)) }),
  snapToGrid: true,
  toggleSnapToGrid: () => set((s) => ({ snapToGrid: !s.snapToGrid })),

  _snapTick: 0,
  bumpSnap: () => set((s) => ({ _snapTick: s._snapTick + 1 })),

  youSavedEnabled: false,
  youSavedVisible: false,
  showYouSaved: () => set({ youSavedVisible: true }),
  hideYouSaved: () => set({ youSavedVisible: false }),
  setYouSavedEnabled: (enabled) => {
    set({ youSavedEnabled: enabled })
    const ipc = (window as unknown as { ipc: { invoke: (ch: string, args: unknown) => Promise<unknown> } }).ipc
    ipc.invoke('settings:set', { key: 'ui.youSavedEnabled', value: enabled }).catch(console.error)
  },

  hyperTypeEnabled: false,
  setHyperTypeEnabled: (enabled) => {
    set({ hyperTypeEnabled: enabled })
    const ipc = (window as unknown as { ipc: { invoke: (ch: string, args: unknown) => Promise<unknown> } }).ipc
    ipc.invoke('settings:set', { key: 'ui.hyperTypeEnabled', value: enabled }).catch(console.error)
  },

  dragonCursorEnabled: false,
  setDragonCursorEnabled: (enabled) => {
    set({ dragonCursorEnabled: enabled })
    const ipc = (window as unknown as { ipc: { invoke: (ch: string, args: unknown) => Promise<unknown> } }).ipc
    ipc.invoke('settings:set', { key: 'ui.dragonCursorEnabled', value: enabled }).catch(console.error)
  },

  uiScale: 1.0,
  setUiScale: (v) => {
    const clamped = Math.min(1.5, Math.max(0.75, v))
    set({ uiScale: clamped })
    const ipc = (window as unknown as { ipc: { invoke: (ch: string, args: unknown) => Promise<unknown> } }).ipc
    ipc.invoke('zoom:set', { factor: clamped }).catch(console.error)
  },
}))
