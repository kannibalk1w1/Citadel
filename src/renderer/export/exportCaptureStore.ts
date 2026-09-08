import { create } from 'zustand'

// Rendering-only state: never enters project files, history, or recovery.
export const useExportCaptureStore = create<{
  itemIds: ReadonlySet<string> | null
}>(() => ({ itemIds: null }))
