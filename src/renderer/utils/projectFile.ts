/**
 * Save / load .citadel project files via the IPC bridge.
 * The renderer never touches fs directly — all I/O goes through window.ipc.
 */
import type { ProjectFile } from '../../types'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'

const VERSION = '1.0.0'
const RECENT_PROJECTS_KEY = 'recent.projects'
const RECENT_PROJECT_LIMIT = 8

export type RecentProject = {
  path: string
  name: string
  lastOpenedAt: number
}

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

function projectNameFromPath(path: string): string {
  return path.split(/[\\/]/).pop() || path
}

function isRecentProject(value: unknown): value is RecentProject {
  return !!value
    && typeof value === 'object'
    && typeof (value as RecentProject).path === 'string'
    && typeof (value as RecentProject).name === 'string'
    && typeof (value as RecentProject).lastOpenedAt === 'number'
}

export async function getRecentProjects(): Promise<RecentProject[]> {
  const result = await ipc().invoke('settings:get', { key: RECENT_PROJECTS_KEY }) as { value: unknown }
  return Array.isArray(result.value) ? result.value.filter(isRecentProject) : []
}

async function setRecentProjects(projects: RecentProject[]): Promise<void> {
  await ipc().invoke('settings:set', { key: RECENT_PROJECTS_KEY, value: projects })
  window.dispatchEvent(new Event('citadel:recentProjectsChanged'))
}

async function rememberRecentProject(path: string): Promise<void> {
  const existing = await getRecentProjects()
  const normalized = path.toLowerCase()
  const next = [
    { path, name: projectNameFromPath(path), lastOpenedAt: Date.now() },
    ...existing.filter((project) => project.path.toLowerCase() !== normalized),
  ].slice(0, RECENT_PROJECT_LIMIT)
  await setRecentProjects(next)
}

async function loadProjectFromPath(path: string): Promise<boolean> {
  const loaded = path.toLowerCase().endsWith('.citadelz')
    ? await ipc().invoke('import:zip', { zipPath: path }) as { projectJson: string }
    : await ipc().invoke('file:load', { path }) as { data: string }
  const file = deserialize('projectJson' in loaded ? loaded.projectJson : loaded.data)
  applyProject(file)
  currentFilePath = path
  rememberRecentProject(path).catch(console.error)
  return true
}

export async function saveProject(path: string): Promise<boolean> {
  try {
    await ipc().invoke('file:save', { path, data: serialize() })
    currentFilePath = path
    rememberRecentProject(path).catch(console.error)
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
    return await loadProjectFromPath(result.path)
  } catch {
    return false
  }
}

export async function openRecentProject(path: string): Promise<boolean> {
  try {
    return await loadProjectFromPath(path)
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
