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

export type RecoverySnapshot = {
  kind: 'citadel-recovery'
  savedAt: number
  boardCount: number
  itemCount: number
  project: ProjectFile
}

export type ParsedRecovery = {
  savedAt: number | null
  boardCount: number
  itemCount: number
  project: ProjectFile
}

// Path of the currently open file (null = unsaved new project)
let currentFilePath: string | null = null

export function getCurrentFilePath(): string | null {
  return currentFilePath
}

function ipc() {
  return (window as unknown as { ipc: { invoke: (ch: string, ...a: unknown[]) => Promise<unknown> } }).ipc
}

function createProjectFile(): ProjectFile {
  const { boards, activeBoardId } = useCanvasStore.getState()
  const { recordings } = useHistoryStore.getState()
  return {
    version: VERSION,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    boards,
    activeBoardId: activeBoardId ?? boards[0]?.id ?? '',
    recordings,
  }
}

function serialize(): string {
  return JSON.stringify(createProjectFile(), null, 2)
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

function projectStats(file: ProjectFile): { boardCount: number; itemCount: number } {
  return {
    boardCount: file.boards.length,
    itemCount: file.boards.reduce((sum, board) => sum + board.items.length, 0),
  }
}

function createRecoverySnapshot(): RecoverySnapshot {
  const project = createProjectFile()
  return {
    kind: 'citadel-recovery',
    savedAt: Date.now(),
    ...projectStats(project),
    project,
  }
}

export function parseRecoveryData(data: string): ParsedRecovery {
  const parsed = JSON.parse(data) as ProjectFile | RecoverySnapshot
  if ('kind' in parsed && parsed.kind === 'citadel-recovery') {
    return {
      savedAt: parsed.savedAt,
      boardCount: parsed.boardCount,
      itemCount: parsed.itemCount,
      project: parsed.project,
    }
  }

  const project = parsed as ProjectFile
  return {
    savedAt: null,
    ...projectStats(project),
    project,
  }
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
    await ipc().invoke('file:saveRecovery', { data: JSON.stringify(createRecoverySnapshot(), null, 2) })
  } catch { /* non-critical */ }
}
