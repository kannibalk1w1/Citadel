// @vitest-environment jsdom
/**
 * Buyer-critical happy path: raise a chamber, save it as a `.citadel`, reopen
 * it, and confirm the archive came back intact.
 *
 * The renderer helpers run for real; `window.ipc` is wired to the same
 * main-process persistence functions the IPC handlers call, against a real
 * temporary directory. The renderer still never touches `fs` itself.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readCitadelProject, writeCitadelProject } from '../../main/projectPersistence'
import type { CanvasItem, Connection } from '../../types'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import {
  getCurrentFilePath,
  getRecentProjects,
  newProject,
  openProject,
  resetRecoveryAutosaveCacheForTests,
  saveProjectAs,
} from './projectFile'

let root: string
let dialogPath: string | null = null
let settings: Record<string, unknown> = {}

function relic(patch: Partial<CanvasItem> & Pick<CanvasItem, 'id' | 'type'>): CanvasItem {
  return {
    x: 0, y: 0, width: 160, height: 120,
    rotation: 0, zIndex: 0,
    locked: false, visible: true, opacity: 1,
    tags: [],
    ...patch,
  }
}

function thread(patch: Partial<Connection> & Pick<Connection, 'id' | 'fromId' | 'toId'>): Connection {
  return {
    fromAnchor: 'auto', toAnchor: 'auto',
    style: 'bezier', color: '#c8a96e', width: 1.5,
    arrowHead: 'arrow', dashed: false,
    ...patch,
  }
}

const invoke = vi.fn(async (channel: string, payload?: Record<string, unknown>) => {
  switch (channel) {
    case 'file:save':
      writeCitadelProject(payload!.path as string, payload!.data as string)
      return { ok: true }
    case 'file:load':
      return { data: readCitadelProject(payload!.path as string) }
    case 'file:saveDialog':
    case 'file:openDialog':
      return { path: dialogPath }
    case 'settings:get':
      return { value: settings[payload!.key as string] }
    case 'settings:set':
      settings[payload!.key as string] = payload!.value
      return { ok: true }
    default:
      throw new Error(`unexpected channel in round-trip test: ${channel}`)
  }
})

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'citadel-roundtrip-'))
  dialogPath = join(root, 'first-chamber.citadel')
  settings = {}
  invoke.mockClear()
  resetRecoveryAutosaveCacheForTests()
  Object.assign(window, {
    ipc: { invoke },
    confirm: () => true,
    // jsdom ships no matchMedia; the mascot checks prefers-reduced-motion on every effect.
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  })
  useCanvasStore.setState({ boards: [], activeBoardId: null, selectedIds: [] })
  useHistoryStore.setState({ events: [], cursor: -1, savedCursor: -1, recordingSession: null, isRecording: false, recordings: [] })
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

/** Raises a chamber holding an inscription, a relic, and the thread binding them. */
function buildArchive(relicPath: string): string {
  newProject()
  const store = useCanvasStore.getState()
  const boardId = store.activeBoardId!
  store.renameBoard(boardId, 'Reliquary')
  store.addItem(boardId, relic({
    id: 'inscription-1', type: 'sticky',
    x: 40, y: 60, width: 200, height: 140,
    tags: ['memory', 'unsorted'],
    meta: { text: 'the first mark' },
  }))
  store.addItem(boardId, relic({
    id: 'relic-1', type: 'image',
    x: 400, y: 60, zIndex: 1,
    src: relicPath,
    tags: ['reference'],
  }))
  store.addConnection(boardId, thread({
    id: 'thread-1', fromId: 'inscription-1', toId: 'relic-1', label: 'recalls',
  }))
  useHistoryStore.getState().markDirty()
  return boardId
}

describe('citadel project round trip', () => {
  it('saves a chamber to disk and restores it on open', async () => {
    const relicPath = join(root, 'relic.png')
    writeFileSync(relicPath, 'relic-bytes')
    const boardId = buildArchive(relicPath)
    const before = structuredClone(useCanvasStore.getState().boards)

    const savedPath = await saveProjectAs()

    expect(savedPath).toBe(join(root, 'first-chamber.citadel'))
    expect(getCurrentFilePath()).toBe(savedPath)
    expect(useHistoryStore.getState().isDirty()).toBe(false)

    // Abandon the chamber, then reopen the saved archive.
    newProject()
    expect(useCanvasStore.getState().boards[0].items).toHaveLength(0)

    await expect(openProject()).resolves.toBe(true)

    const after = useCanvasStore.getState()
    expect(after.activeBoardId).toBe(boardId)
    expect(after.boards).toHaveLength(1)
    expect(after.boards[0].name).toBe('Reliquary')
    expect(after.boards[0]).toEqual(before[0])
  })

  it('restores relic sources as absolute paths after the round trip', async () => {
    const relicPath = join(root, 'relic.png')
    writeFileSync(relicPath, 'relic-bytes')
    buildArchive(relicPath)

    await saveProjectAs()
    newProject()
    await openProject()

    const items = useCanvasStore.getState().boards[0].items
    expect(items.find((item) => item.id === 'relic-1')?.src).toBe(resolve(relicPath))
  })

  it('preserves inscriptions, sigils, and threads verbatim', async () => {
    buildArchive(join(root, 'relic.png'))

    await saveProjectAs()
    newProject()
    await openProject()

    const board = useCanvasStore.getState().boards[0]
    const inscription = board.items.find((item) => item.id === 'inscription-1')
    expect(inscription).toMatchObject({ tags: ['memory', 'unsorted'], meta: { text: 'the first mark' } })
    expect(board.connections).toEqual([
      expect.objectContaining({ id: 'thread-1', fromId: 'inscription-1', toId: 'relic-1', label: 'recalls' }),
    ])
  })

  it('records the saved and reopened archive in recent projects', async () => {
    buildArchive(join(root, 'relic.png'))

    await saveProjectAs()
    await openProject()

    const recents = await getRecentProjects()
    expect(recents).toHaveLength(1)
    expect(recents[0]).toMatchObject({ path: join(root, 'first-chamber.citadel'), name: 'first-chamber.citadel' })
  })

  it('leaves the open chamber untouched when the open dialog is dismissed', async () => {
    buildArchive(join(root, 'relic.png'))
    await saveProjectAs()

    dialogPath = null
    await expect(openProject()).resolves.toBe(false)

    expect(useCanvasStore.getState().boards[0].items).toHaveLength(2)
  })

  it('surfaces a failed open without destroying the open chamber', async () => {
    buildArchive(join(root, 'relic.png'))
    await saveProjectAs()
    const intact = structuredClone(useCanvasStore.getState().boards)

    const corrupt = join(root, 'corrupt.citadel')
    writeFileSync(corrupt, 'not json at all')
    dialogPath = corrupt

    await expect(openProject()).resolves.toBe(false)

    expect(useCanvasStore.getState().boards).toEqual(intact)
  })
})
