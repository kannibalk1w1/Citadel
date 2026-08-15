/**
 * Save / load .citadel project files via the IPC bridge.
 * The renderer never touches fs directly — all I/O goes through window.ipc.
 */
import type { ProjectFile } from '../../types'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { parseProjectFile } from './projectSchema'
import { useArchiveProgressStore } from '../ui/archiveProgressStore'
import { inscribe } from '../ui/toasts/inscriptionToastStore'
import { useMascotStore } from '../store/mascotStore'

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

export type SaveActivity = {
  lastManualSaveAt: number | null
  lastRecoverySaveAt: number | null
}

export type AutoSaveResult = 'saved' | 'skipped-clean' | 'skipped-unchanged' | 'failed'

// Path of the currently open file (null = unsaved new project)
let currentFilePath: string | null = null
let saveActivity: SaveActivity = { lastManualSaveAt: null, lastRecoverySaveAt: null }
let lastRecoveryProjectPayload: string | null = null

export function getCurrentFilePath(): string | null {
  return currentFilePath
}

export function getSaveActivity(): SaveActivity {
  return saveActivity
}

function notifyProjectPathChanged(): void {
  window.dispatchEvent(new Event('citadel:projectPathChanged'))
}

function notifySaveActivityChanged(): void {
  window.dispatchEvent(new Event('citadel:saveActivityChanged'))
}

function setSaveActivity(patch: Partial<SaveActivity>): void {
  saveActivity = { ...saveActivity, ...patch }
  notifySaveActivityChanged()
}

function resetSaveActivity(): void {
  saveActivity = { lastManualSaveAt: null, lastRecoverySaveAt: null }
  notifySaveActivityChanged()
}

function resetRecoveryAutosaveCache(): void {
  lastRecoveryProjectPayload = null
}

export function resetRecoveryAutosaveCacheForTests(): void {
  resetRecoveryAutosaveCache()
}

function confirmDiscardUnsaved(): boolean {
  if (!useHistoryStore.getState().isDirty()) return true
  return window.confirm('Discard unsaved changes and continue?')
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
  return parseProjectFile(json)
}

function applyProject(file: ProjectFile): void {
  useCanvasStore.setState({
    boards: file.boards,
    activeBoardId: file.activeBoardId,
    selectedIds: [],
  })
  resetRecoveryAutosaveCache()
  useHistoryStore.getState().resetHistory()
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

function recoveryProjectFingerprint(project: ProjectFile): string {
  return JSON.stringify({
    boards: project.boards,
    activeBoardId: project.activeBoardId,
    recordings: project.recordings,
    keybindOverrides: project.keybindOverrides,
  })
}

export function parseRecoveryData(data: string): ParsedRecovery {
  const parsed = JSON.parse(data) as ProjectFile | RecoverySnapshot
  if ('kind' in parsed && parsed.kind === 'citadel-recovery') {
    const project = parseProjectFile(JSON.stringify(parsed.project))
    return {
      savedAt: parsed.savedAt,
      ...projectStats(project),
      project,
    }
  }

  const project = parseProjectFile(data)
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
  let json: string
  if (path.toLowerCase().endsWith('.citadelz')) {
    useArchiveProgressStore.getState().beginRite('import')
    try {
      const result = await ipc().invoke('import:zip', { zipPath: path }) as
        { ok: true; projectJson: string } | { ok: false; reason: string }
      if (!result.ok) throw new Error(result.reason)
      json = result.projectJson
    } finally {
      useArchiveProgressStore.getState().endRite()
    }
  } else {
    const loaded = await ipc().invoke('file:load', { path }) as { data: string }
    json = loaded.data
  }
  const file = deserialize(json)
  applyProject(file)
  currentFilePath = path
  resetSaveActivity()
  resetRecoveryAutosaveCache()
  notifyProjectPathChanged()
  rememberRecentProject(path).catch(console.error)
  return true
}

export async function saveProject(path: string): Promise<boolean> {
  try {
    await ipc().invoke('file:save', { path, data: serialize() })
    currentFilePath = path
    useHistoryStore.getState().markSaved()
    resetRecoveryAutosaveCache()
    setSaveActivity({ lastManualSaveAt: Date.now() })
    notifyProjectPathChanged()
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

function surfaceOpenFailure(error: unknown): void {
  const reason = error instanceof Error ? error.message : String(error)
  inscribe(`Could not open the project: ${reason}`, { tone: 'danger' })
  useMascotStore.getState().triggerEffect('fracture')
}

export async function openProject(): Promise<boolean> {
  if (!confirmDiscardUnsaved()) return false
  const result = await ipc().invoke('file:openDialog') as { path: string | null }
  if (!result.path) return false
  try {
    return await loadProjectFromPath(result.path)
  } catch (error) {
    surfaceOpenFailure(error)
    return false
  }
}

export async function openRecentProject(path: string): Promise<boolean> {
  if (!confirmDiscardUnsaved()) return false
  try {
    return await loadProjectFromPath(path)
  } catch (error) {
    surfaceOpenFailure(error)
    return false
  }
}

export function newProject(): boolean {
  if (!confirmDiscardUnsaved()) return false
  currentFilePath = null
  resetSaveActivity()
  resetRecoveryAutosaveCache()
  useCanvasStore.setState({ boards: [], activeBoardId: null, selectedIds: [] })
  useCanvasStore.getState().initDefaultBoard()
  useHistoryStore.getState().resetHistory()
  notifyProjectPathChanged()
  return true
}

export function loadProjectData(file: ProjectFile): void {
  currentFilePath = null
  resetSaveActivity()
  resetRecoveryAutosaveCache()
  applyProject(file)
  notifyProjectPathChanged()
}

export async function clearRecoveryIfClean(): Promise<boolean> {
  if (useHistoryStore.getState().isDirty()) return false
  try {
    await ipc().invoke('recovery:clear')
    return true
  } catch {
    return false
  }
}

export async function autoSave(): Promise<AutoSaveResult> {
  if (!useHistoryStore.getState().isDirty()) return 'skipped-clean'
  const snapshot = createRecoverySnapshot()
  const projectPayload = recoveryProjectFingerprint(snapshot.project)
  if (projectPayload === lastRecoveryProjectPayload) return 'skipped-unchanged'
  const payload = JSON.stringify(snapshot, null, 2)
  try {
    await ipc().invoke('file:saveRecovery', { data: payload })
    lastRecoveryProjectPayload = projectPayload
    setSaveActivity({ lastRecoverySaveAt: Date.now() })
    return 'saved'
  } catch {
    return 'failed'
  }
}
