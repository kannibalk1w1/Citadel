import { create } from 'zustand'
import type { ToolMode } from '../../types'

type PanelState = {
  itemProperties: boolean
  connectionProperties: boolean
  keybindSettings: boolean
  tagSearch: boolean
  presentationSequence: boolean
  boardNavigator: boolean
  assetLibrary: boolean
  indexLedger: boolean
  archiveWorkbench: boolean
}

export type ExportArea = 'viewport' | 'board' | 'selection'
export type ExportPreset = 'draft' | 'clean' | 'high-res'
export type CanvasBackgroundMode = 'stone' | 'custom' | 'none'

export type CanvasBackgroundSettings = {
  mode: CanvasBackgroundMode
  assetPath: string | null
  opacity: number
  scale: number
  repeat: boolean
}

const DEFAULT_CANVAS_BACKGROUND: CanvasBackgroundSettings = {
  mode: 'stone',
  assetPath: null,
  opacity: 0.62,
  scale: 1,
  repeat: true,
}

export const exportPresets: Record<ExportPreset, { label: string; area: ExportArea; scale: number; includeComments: boolean }> = {
  draft: { label: 'Draft', area: 'viewport', scale: 1, includeComments: false },
  clean: { label: 'Clean', area: 'board', scale: 2, includeComments: false },
  'high-res': { label: 'High-res', area: 'board', scale: 3, includeComments: true },
}

export function normalizeCanvasBackground(settings: Partial<CanvasBackgroundSettings> | null | undefined): CanvasBackgroundSettings {
  const mode = settings?.mode === 'custom' || settings?.mode === 'none' || settings?.mode === 'stone'
    ? settings.mode
    : DEFAULT_CANVAS_BACKGROUND.mode
  return {
    mode,
    assetPath: typeof settings?.assetPath === 'string' && settings.assetPath ? settings.assetPath : null,
    opacity: Math.max(0, Math.min(1, typeof settings?.opacity === 'number' ? settings.opacity : DEFAULT_CANVAS_BACKGROUND.opacity)),
    scale: Math.max(0.25, Math.min(4, typeof settings?.scale === 'number' ? settings.scale : DEFAULT_CANVAS_BACKGROUND.scale)),
    repeat: typeof settings?.repeat === 'boolean' ? settings.repeat : DEFAULT_CANVAS_BACKGROUND.repeat,
  }
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
  searchHighlightId: string | null
  setSearchHighlight: (id: string | null) => void

  activeConnectionId: string | null
  setActiveConnectionId: (id: string | null) => void
  bindingPulse: { connectionId: string; startedAt: number } | null
  triggerBindingPulse: (connectionId: string) => void
  clearBindingPulse: () => void

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

  // Presentation
  presentationMode: boolean
  setPresentationMode: (enabled: boolean) => void
  togglePresentationMode: () => void

  // Export
  exportScale: number
  setExportScale: (v: number) => void
  exportArea: ExportArea
  setExportArea: (area: ExportArea) => void
  includeCommentsInExport: boolean
  setIncludeCommentsInExport: (enabled: boolean) => void
  applyExportPreset: (preset: ExportPreset) => void

  // Canvas appearance
  canvasBackground: CanvasBackgroundSettings
  setCanvasBackground: (settings: Partial<CanvasBackgroundSettings>) => void

  // Comments
  commentPinsVisible: boolean
  setCommentPinsVisible: (enabled: boolean) => void
  toggleCommentPinsVisible: () => void

  // Filename inscriptions under media relics
  filenameLabelsVisible: boolean
  toggleFilenameLabels: () => void
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
    presentationSequence: false,
    boardNavigator: false,
    assetLibrary: false,
    indexLedger: false,
    archiveWorkbench: false,
  },
  openPanel: (panel) => set((s) => ({ panels: { ...s.panels, [panel]: true } })),
  closePanel: (panel) => set((s) => ({ panels: { ...s.panels, [panel]: false } })),
  togglePanel: (panel) => set((s) => ({ panels: { ...s.panels, [panel]: !s.panels[panel] } })),

  contextMenu: null,
  openContextMenu: (x, y, targetId) => set({ contextMenu: { x, y, targetId } }),
  closeContextMenu: () => set({ contextMenu: null }),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  searchHighlightId: null,
  setSearchHighlight: (id) => set({ searchHighlightId: id }),

  activeConnectionId: null,
  setActiveConnectionId: (id) => set({ activeConnectionId: id }),
  bindingPulse: null,
  triggerBindingPulse: (connectionId) => set({ bindingPulse: { connectionId, startedAt: Date.now() } }),
  clearBindingPulse: () => set({ bindingPulse: null }),

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

  presentationMode: false,
  setPresentationMode: (enabled) => set({ presentationMode: enabled }),
  togglePresentationMode: () => set((s) => ({ presentationMode: !s.presentationMode })),

  exportScale: 1,
  setExportScale: (v) => {
    const clamped = Math.min(3, Math.max(1, Math.round(v)))
    set({ exportScale: clamped })
    const ipc = (window as unknown as { ipc: { invoke: (ch: string, args: unknown) => Promise<unknown> } }).ipc
    ipc.invoke('settings:set', { key: 'export.scale', value: clamped }).catch(console.error)
  },
  exportArea: 'viewport',
  setExportArea: (area) => {
    set({ exportArea: area })
    const ipc = (window as unknown as { ipc: { invoke: (ch: string, args: unknown) => Promise<unknown> } }).ipc
    ipc.invoke('settings:set', { key: 'export.area', value: area }).catch(console.error)
  },
  includeCommentsInExport: true,
  setIncludeCommentsInExport: (enabled) => {
    set({ includeCommentsInExport: enabled })
    const ipc = (window as unknown as { ipc: { invoke: (ch: string, args: unknown) => Promise<unknown> } }).ipc
    ipc.invoke('settings:set', { key: 'export.includeComments', value: enabled }).catch(console.error)
  },
  applyExportPreset: (preset) => {
    const settings = exportPresets[preset]
    const scale = Math.min(3, Math.max(1, Math.round(settings.scale)))
    set({
      exportArea: settings.area,
      exportScale: scale,
      includeCommentsInExport: settings.includeComments,
    })
    const ipc = (window as unknown as { ipc: { invoke: (ch: string, args: unknown) => Promise<unknown> } }).ipc
    ipc.invoke('settings:setMany', {
      values: {
        'export.area': settings.area,
        'export.scale': scale,
        'export.includeComments': settings.includeComments,
      },
    }).catch(console.error)
  },

  canvasBackground: DEFAULT_CANVAS_BACKGROUND,
  setCanvasBackground: (settings) => {
    const next = normalizeCanvasBackground(settings)
    set({ canvasBackground: next })
    const ipc = (window as unknown as { ipc: { invoke: (ch: string, args: unknown) => Promise<unknown> } }).ipc
    ipc.invoke('settings:set', { key: 'ui.canvasBackground', value: next }).catch(console.error)
  },

  commentPinsVisible: true,
  setCommentPinsVisible: (enabled) => set({ commentPinsVisible: enabled }),
  toggleCommentPinsVisible: () => set((s) => ({ commentPinsVisible: !s.commentPinsVisible })),

  filenameLabelsVisible: false,
  toggleFilenameLabels: () => set((s) => ({ filenameLabelsVisible: !s.filenameLabelsVisible })),
}))
