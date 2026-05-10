/**
 * Save / load .citadel project files via the IPC bridge.
 * The renderer never touches fs directly — all I/O goes through window.ipc.
 */
import type { ProjectFile } from '../../types'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'

const VERSION = '1.0.0'

// Path of the currently open file (null = unsaved new project)
let currentFilePath: string | null = null

export function getCurrentFilePath(): string | null {
  return currentFilePath
}

function ipc() {
  return (window as unknown as { ipc: { invoke: (ch: string, ...a: unknown[]) => Promise<unknown> } }).ipc
}

function serialize(): string {
  const { boards, activeBoardId } = useCanvasStore.getState()
  const { recordings } = useHistoryStore.getState()
  const file: ProjectFile = {
    version: VERSION,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    boards,
    activeBoardId: activeBoardId ?? boards[0]?.id ?? '',
    recordings,
  }
  return JSON.stringify(file, null, 2)
}

function deserialize(json: string): ProjectFile {
  return JSON.parse(json) as ProjectFile
}

function applyProject(file: ProjectFile): void {
  useCanvasStore.setState({
    boards: file.boards,
    activeBoardId: file.activeBoardId,
    selectedIds: [],
  })
}

export async function saveProject(path: string): Promise<boolean> {
  try {
    await ipc().invoke('file:save', { path, data: serialize() })
    currentFilePath = path
    return true
  } catch {
    return false
  }
}

export async function saveProjectAs(): Promise<string | null> {
  const result = await ipc().invoke('file:saveDialog', {}) as { path: string | null }
  if (!result.path) return null
  const ok = await saveProject(result.path)
  return ok ? result.path : null
}

export async function saveCurrentOrAs(): Promise<boolean> {
  if (currentFilePath) return saveProject(currentFilePath)
  const path = await saveProjectAs()
  return path !== null
}

export async function openProject(): Promise<boolean> {
  const result = await ipc().invoke('file:openDialog') as { path: string | null }
  if (!result.path) return false
  try {
    const loaded = await ipc().invoke('file:load', { path: result.path }) as { data: string }
    const file = deserialize(loaded.data)
    applyProject(file)
    currentFilePath = result.path
    return true
  } catch {
    return false
  }
}

export function newProject(): void {
  currentFilePath = null
  useCanvasStore.setState({ boards: [], activeBoardId: null, selectedIds: [] })
  useCanvasStore.getState().initDefaultBoard()
}

export function loadProjectData(file: ProjectFile): void {
  applyProject(file)
}

export async function autoSave(): Promise<void> {
  try {
    await ipc().invoke('file:saveRecovery', { data: serialize() })
  } catch { /* non-critical */ }
}
