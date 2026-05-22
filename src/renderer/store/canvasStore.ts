import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type { CanvasItem, CanvasBoard, Connection, Viewport } from '../../types'

type CanvasState = {
  boards: CanvasBoard[]
  activeBoardId: string | null

  // Derived helpers
  activeBoard: () => CanvasBoard | undefined
  items: () => CanvasItem[]
  connections: () => Connection[]
  viewport: () => Viewport

  // Board operations
  initDefaultBoard: () => void
  addBoard: (name: string) => string
  duplicateBoard: (id: string) => string | null
  removeBoard: (id: string) => void
  renameBoard: (id: string, name: string) => void
  updateBoardMeta: (id: string, patch: Record<string, unknown>) => void
  setActiveBoard: (id: string) => void

  // Viewport
  setViewport: (boardId: string, viewport: Viewport) => void
  updateViewport: (delta: Partial<Viewport>) => void

  // Item operations
  addItem: (boardId: string, item: CanvasItem) => void
  updateItem: (boardId: string, id: string, patch: Partial<CanvasItem>) => void
  removeItems: (boardId: string, ids: string[]) => void
  moveItems: (boardId: string, moves: { id: string; x: number; y: number }[]) => void
  reorderItem: (boardId: string, id: string, direction: 'front' | 'back' | 'forward' | 'backward') => void
  groupItems: (boardId: string, ids: string[]) => void
  ungroupItems: (boardId: string, groupId: string) => void

  // Connection operations
  addConnection: (boardId: string, connection: Connection) => void
  updateConnection: (boardId: string, id: string, patch: Partial<Connection>) => void
  removeConnection: (boardId: string, id: string) => void

  // Selection
  selectedIds: string[]
  setSelection: (ids: string[]) => void
  addToSelection: (id: string) => void
  clearSelection: () => void
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  boards: [],
  activeBoardId: null,
  selectedIds: [],

  activeBoard: () => get().boards.find((b) => b.id === get().activeBoardId),
  items: () => get().activeBoard()?.items ?? [],
  connections: () => get().activeBoard()?.connections ?? [],
  viewport: () => get().activeBoard()?.viewport ?? { x: 0, y: 0, scale: 1 },

  initDefaultBoard: () => {
    const id = nanoid()
    set({
      boards: [{
        id,
        name: 'Board 1',
        items: [],
        connections: [],
        viewport: { x: 0, y: 0, scale: 1 },
      }],
      activeBoardId: id,
    })
  },

  addBoard: (name) => {
    const id = nanoid()
    set((s) => ({
      boards: [...s.boards, { id, name, items: [], connections: [], viewport: { x: 0, y: 0, scale: 1 } }],
    }))
    return id
  },

  duplicateBoard: (id) => {
    const source = get().boards.find((b) => b.id === id)
    if (!source) return null
    const boardId = nanoid()
    const itemIdMap = new Map(source.items.map((item) => [item.id, nanoid()]))
    const items = source.items.map((item) => ({ ...item, id: itemIdMap.get(item.id)! }))
    const connections = source.connections
      .filter((connection) => itemIdMap.has(connection.fromId) && itemIdMap.has(connection.toId))
      .map((connection) => ({
        ...connection,
        id: nanoid(),
        fromId: itemIdMap.get(connection.fromId)!,
        toId: itemIdMap.get(connection.toId)!,
      }))
    const clone = {
      ...source,
      id: boardId,
      name: `${source.name} copy`,
      items,
      connections,
      viewport: { ...source.viewport },
    }
    set((s) => {
      const index = s.boards.findIndex((b) => b.id === id)
      const boards = [...s.boards]
      boards.splice(index + 1, 0, clone)
      return { boards, activeBoardId: boardId, selectedIds: [] }
    })
    return boardId
  },

  removeBoard: (id) => {
    set((s) => {
      const boards = s.boards.filter((b) => b.id !== id)
      const activeBoardId = s.activeBoardId === id ? (boards[0]?.id ?? null) : s.activeBoardId
      return { boards, activeBoardId }
    })
  },

  renameBoard: (id, name) => {
    set((s) => ({ boards: s.boards.map((b) => b.id === id ? { ...b, name } : b) }))
  },

  updateBoardMeta: (id, patch) => {
    set((s) => ({
      boards: s.boards.map((b) => b.id === id ? { ...b, meta: { ...b.meta, ...patch } } : b),
    }))
  },

  setActiveBoard: (id) => set({ activeBoardId: id, selectedIds: [] }),

  setViewport: (boardId, viewport) => {
    set((s) => ({ boards: s.boards.map((b) => b.id === boardId ? { ...b, viewport } : b) }))
  },

  updateViewport: (delta) => {
    const { activeBoardId, boards } = get()
    if (!activeBoardId) return
    set({
      boards: boards.map((b) =>
        b.id === activeBoardId ? { ...b, viewport: { ...b.viewport, ...delta } } : b
      ),
    })
  },

  addItem: (boardId, item) => {
    set((s) => ({
      boards: s.boards.map((b) =>
        b.id === boardId ? { ...b, items: [...b.items, item] } : b
      ),
    }))
  },

  updateItem: (boardId, id, patch) => {
    set((s) => ({
      boards: s.boards.map((b) =>
        b.id === boardId
          ? { ...b, items: b.items.map((i) => i.id === id ? { ...i, ...patch } : i) }
          : b
      ),
    }))
  },

  removeItems: (boardId, ids) => {
    const idSet = new Set(ids)
    set((s) => ({
      boards: s.boards.map((b) =>
        b.id === boardId ? { ...b, items: b.items.filter((i) => !idSet.has(i.id)) } : b
      ),
      selectedIds: s.selectedIds.filter((id) => !idSet.has(id)),
    }))
  },

  moveItems: (boardId, moves) => {
    const moveMap = new Map(moves.map((m) => [m.id, m]))
    set((s) => ({
      boards: s.boards.map((b) =>
        b.id === boardId
          ? { ...b, items: b.items.map((i) => moveMap.has(i.id) ? { ...i, ...moveMap.get(i.id) } : i) }
          : b
      ),
    }))
  },

  reorderItem: (boardId, id, direction) => {
    set((s) => {
      const board = s.boards.find((b) => b.id === boardId)
      if (!board) return s
      const items = [...board.items].sort((a, b) => a.zIndex - b.zIndex)
      const idx = items.findIndex((i) => i.id === id)
      if (idx === -1) return s
      if (direction === 'front') items[idx] = { ...items[idx], zIndex: (items.at(-1)?.zIndex ?? 0) + 1 }
      else if (direction === 'back') items[idx] = { ...items[idx], zIndex: (items[0]?.zIndex ?? 0) - 1 }
      else if (direction === 'forward' && idx < items.length - 1) {
        const z = items[idx + 1].zIndex
        items[idx + 1] = { ...items[idx + 1], zIndex: items[idx].zIndex }
        items[idx] = { ...items[idx], zIndex: z }
      } else if (direction === 'backward' && idx > 0) {
        const z = items[idx - 1].zIndex
        items[idx - 1] = { ...items[idx - 1], zIndex: items[idx].zIndex }
        items[idx] = { ...items[idx], zIndex: z }
      }
      return { boards: s.boards.map((b) => b.id === boardId ? { ...b, items } : b) }
    })
  },

  groupItems: (boardId, ids) => {
    const gid = nanoid()
    set((s) => ({
      boards: s.boards.map((b) =>
        b.id !== boardId ? b : {
          ...b,
          items: b.items.map((i) => ids.includes(i.id) ? { ...i, groupId: gid } : i),
        }
      ),
    }))
  },

  ungroupItems: (boardId, groupId) => {
    set((s) => ({
      boards: s.boards.map((b) =>
        b.id !== boardId ? b : {
          ...b,
          items: b.items.map((i) => i.groupId === groupId ? { ...i, groupId: undefined } : i),
        }
      ),
    }))
  },

  addConnection: (boardId, connection) => {
    set((s) => ({
      boards: s.boards.map((b) =>
        b.id === boardId ? { ...b, connections: [...b.connections, connection] } : b
      ),
    }))
  },

  updateConnection: (boardId, id, patch) => {
    set((s) => ({
      boards: s.boards.map((b) =>
        b.id === boardId
          ? { ...b, connections: b.connections.map((c) => c.id === id ? { ...c, ...patch } : c) }
          : b
      ),
    }))
  },

  removeConnection: (boardId, id) => {
    set((s) => ({
      boards: s.boards.map((b) =>
        b.id === boardId ? { ...b, connections: b.connections.filter((c) => c.id !== id) } : b
      ),
    }))
  },

  setSelection: (ids) => {
    const allItems = get().items()
    const groupIds = new Set(
      ids.flatMap((id) => {
        const item = allItems.find((i) => i.id === id)
        return item?.groupId ? [item.groupId] : []
      })
    )
    const expanded = Array.from(new Set([
      ...ids,
      ...allItems.filter((i) => i.groupId && groupIds.has(i.groupId)).map((i) => i.id),
    ]))
    set({ selectedIds: expanded })
  },
  addToSelection: (id) => {
    const allItems = get().items()
    const item = allItems.find((i) => i.id === id)
    const toAdd = item?.groupId
      ? allItems.filter((i) => i.groupId === item.groupId).map((i) => i.id)
      : [id]
    set((s) => ({ selectedIds: Array.from(new Set([...s.selectedIds, ...toAdd])) }))
  },
  clearSelection: () => set({ selectedIds: [] }),
}))
