import React, { useEffect, useRef } from 'react'
import type { CanvasItem } from '../types'

// Module-level clipboard (persists across renders, not across restarts)
let clipboard: CanvasItem[] = []
let pasteOffset = 0
import { CanvasStage } from './canvas/CanvasStage'
import { Toolbar } from './ui/Toolbar'
import { BoardTabs } from './ui/BoardTabs'
import { Minimap } from './ui/Minimap'
import { ContextMenu } from './ui/ContextMenu'
import { RecordingBar } from './ui/RecordingBar'
import { RightSidebar } from './ui/RightSidebar'
import { TagSearch } from './ui/TagSearch'
import { ItemProperties } from './ui/panels/ItemProperties'
import { ConnectionProperties } from './ui/panels/ConnectionProperties'
import { KeybindSettings } from './ui/panels/KeybindSettings'
import { TextEditOverlay } from './canvas/TextEditOverlay'
import { YouSavedBanner } from './ui/YouSavedBanner'
import { HyperTypeOverlay } from './arcade/HyperTypeOverlay'
import { engine, lastMouse } from './arcade/HyperTypeEngine'
import { useMascotStore } from './store/mascotStore'
import { useCanvasStore } from './store/canvasStore'
import { useHistoryStore } from './store/historyStore'
import { useUIStore } from './store/uiStore'
import { resolver } from './keybinds/keybindResolver'
import { Actions } from './keybinds/actions'
import { nanoid } from 'nanoid'
import { saveCurrentOrAs, saveProjectAs, openProject, newProject, autoSave, loadProjectData } from './utils/projectFile'
import { exportToPdf } from './export/pdfExport'
import { exportToImage } from './export/imageExport'
import { exportToZip } from './export/zipExport'

const ZOOM_STEP = 1.2
const MIN_SCALE = 0.05
const MAX_SCALE = 20

export default function App(): React.ReactElement {
  const triggerEffect = useMascotStore((s) => s.triggerEffect)
  const initBoard = useCanvasStore((s) => s.initDefaultBoard)
  const resolverReady = useRef(false)
  const editingItemId = useUIStore((s) => s.editingItemId)
  const editingItem = useCanvasStore((s) => s.items().find((i) => i.id === editingItemId))
  const [recoveryData, setRecoveryData] = React.useState<string | null>(null)
  const canvasContainerRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    return useUIStore.subscribe(
      (s) => s.hyperTypeEnabled,
      (enabled) => engine.setEnabled(enabled)
    )
  }, [])

  useEffect(() => {
    initBoard()
    triggerEffect('rise-from-fog')

    // Check for crash recovery file on startup
    const ipc = (window as unknown as { ipc: { invoke: (ch: string, ...a: unknown[]) => Promise<unknown> } }).ipc
    ipc.invoke('recovery:get').then((res) => {
      const { data } = res as { data: string | null }
      if (data) setRecoveryData(data)
    }).catch(() => {})

    ipc.invoke('settings:get', { key: 'ui.youSavedEnabled' }).then((res) => {
      const { value } = res as { value: unknown }
      if (value === true) useUIStore.getState().setYouSavedEnabled(true)
    }).catch(() => {})

    ipc.invoke('settings:get', { key: 'ui.hyperTypeEnabled' }).then((res) => {
      const { value } = res as { value: unknown }
      if (value === true) {
        useUIStore.getState().setHyperTypeEnabled(true)
        engine.setEnabled(true)
      }
    }).catch(() => {})

    ipc.invoke('settings:get', { key: 'ui.dragonCursorEnabled' }).then((res) => {
      const { value } = res as { value: unknown }
      if (value === true) useUIStore.getState().setDragonCursorEnabled(true)
    }).catch(() => {})
  }, [])

  // ── Wire keybind actions once ───────────────────────────────────────────────
  useEffect(() => {
    if (resolverReady.current) return
    resolverReady.current = true

    // Tool modes
    resolver.register(Actions.TOOL_SELECT,  () => useUIStore.getState().setToolMode('select'))
    resolver.register(Actions.TOOL_PAN,     () => useUIStore.getState().setToolMode('pan'))
    resolver.register(Actions.TOOL_CONNECT, () => useUIStore.getState().setToolMode('connect'))
    resolver.register(Actions.TOOL_LASSO,   () => useUIStore.getState().setToolMode('lasso'))
    resolver.register(Actions.TOOL_TEXT,    () => useUIStore.getState().setToolMode('text'))
    resolver.register(Actions.TOOL_STICKY,  () => useUIStore.getState().setToolMode('sticky'))
    resolver.register(Actions.TOOL_LINK,    () => useUIStore.getState().setToolMode('link'))
    resolver.register(Actions.TOOL_TAG,     () => useUIStore.getState().setToolMode('tag'))
    resolver.register(Actions.TOOL_SWATCH,  () => useUIStore.getState().setToolMode('swatch'))

    // Undo / redo
    resolver.register(Actions.UNDO, () => {
      const { undo, canUndo } = useHistoryStore.getState()
      if (!canUndo()) return
      const event = undo()
      if (!event) return
      const canvas = useCanvasStore.getState()
      if (event.type === 'ITEM_ADD') {
        const item = event.after as { id: string }
        canvas.removeItems(event.boardId, [item.id])
      } else if (event.type === 'ITEM_DELETE') {
        const items = event.before as CanvasItem[]
        items.forEach((i) => canvas.addItem(event.boardId, i))
      } else if (event.type === 'ITEM_MOVE' || event.type === 'ITEM_STYLE') {
        const patch = event.before as Partial<CanvasItem> & { id: string }
        canvas.updateItem(event.boardId, patch.id, patch)
      }
      triggerEffect('rewind-swirl')
      engine.burst('↩', lastMouse.x, lastMouse.y)
    })

    resolver.register(Actions.REDO, () => {
      const { redo, canRedo } = useHistoryStore.getState()
      if (!canRedo()) return
      const event = redo()
      if (!event) return
      const canvas = useCanvasStore.getState()
      if (event.type === 'ITEM_ADD') {
        canvas.addItem(event.boardId, event.after as CanvasItem)
      } else if (event.type === 'ITEM_DELETE') {
        const items = event.after as { id: string }[]
        canvas.removeItems(event.boardId, items.map((i) => i.id))
      } else if (event.type === 'ITEM_MOVE' || event.type === 'ITEM_STYLE') {
        const patch = event.after as Partial<CanvasItem> & { id: string }
        canvas.updateItem(event.boardId, patch.id, patch)
      }
      triggerEffect('forward-surge')
      engine.burst('↪', lastMouse.x, lastMouse.y)
    })

    // Delete selected items
    resolver.register(Actions.DELETE, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId, items } = canvas
      if (!activeBoardId || selectedIds.length === 0) return
      const toDelete = items().filter((i) => selectedIds.includes(i.id))
      useHistoryStore.getState().push('ITEM_DELETE', activeBoardId, toDelete, toDelete.map((i) => ({ id: i.id })))
      canvas.removeItems(activeBoardId, selectedIds)
      canvas.clearSelection()
      triggerEffect('crumble')
      engine.burst('✕', lastMouse.x, lastMouse.y, 'slice')
    })

    // Duplicate selected items
    resolver.register(Actions.DUPLICATE, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId, items } = canvas
      if (!activeBoardId || selectedIds.length === 0) return
      const originals = items().filter((i) => selectedIds.includes(i.id))
      const copies = originals.map((i) => ({ ...i, id: nanoid(), x: i.x + 20, y: i.y + 20 }))
      copies.forEach((c) => {
        canvas.addItem(activeBoardId, c)
        useHistoryStore.getState().push('ITEM_ADD', activeBoardId, null, c)
      })
      canvas.setSelection(copies.map((c) => c.id))
    })

    // Select all
    resolver.register(Actions.SELECT_ALL, () => {
      const canvas = useCanvasStore.getState()
      canvas.setSelection(canvas.items().map((i) => i.id))
    })

    // Deselect
    resolver.register(Actions.DESELECT, () => {
      useCanvasStore.getState().clearSelection()
      useUIStore.getState().setToolMode('select')
    })

    // Zoom
    resolver.register(Actions.ZOOM_IN, () => {
      const canvas = useCanvasStore.getState()
      const vp = canvas.viewport()
      const newScale = Math.min(MAX_SCALE, vp.scale * ZOOM_STEP)
      canvas.updateViewport({ scale: newScale })
    })
    resolver.register(Actions.ZOOM_OUT, () => {
      const canvas = useCanvasStore.getState()
      const vp = canvas.viewport()
      const newScale = Math.max(MIN_SCALE, vp.scale / ZOOM_STEP)
      canvas.updateViewport({ scale: newScale })
    })
    resolver.register(Actions.ZOOM_RESET, () => {
      useCanvasStore.getState().updateViewport({ scale: 1, x: 0, y: 0 })
    })
    resolver.register(Actions.ZOOM_FIT, () => {
      const canvas = useCanvasStore.getState()
      const allItems = canvas.items()
      if (allItems.length === 0) {
        canvas.updateViewport({ scale: 1, x: 0, y: 0 })
        return
      }
      const minX = Math.min(...allItems.map((i) => i.x))
      const minY = Math.min(...allItems.map((i) => i.y))
      const maxX = Math.max(...allItems.map((i) => i.x + i.width))
      const maxY = Math.max(...allItems.map((i) => i.y + i.height))
      const sidebarW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-right-w') || '164')
      const canvasW = window.innerWidth - sidebarW
      const pad = 60
      const scale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, Math.min(
          (canvasW - pad * 2) / (maxX - minX),
          (window.innerHeight - pad * 2) / (maxY - minY),
        ))
      )
      canvas.updateViewport({
        scale,
        x: canvasW / 2 - ((minX + maxX) / 2) * scale,
        y: window.innerHeight / 2 - ((minY + maxY) / 2) * scale,
      })
    })

    // Item ordering
    resolver.register(Actions.BRING_FRONT, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId } = canvas
      if (activeBoardId) selectedIds.forEach((id) => canvas.reorderItem(activeBoardId, id, 'front'))
    })
    resolver.register(Actions.SEND_BACK, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId } = canvas
      if (activeBoardId) selectedIds.forEach((id) => canvas.reorderItem(activeBoardId, id, 'back'))
    })
    resolver.register(Actions.BRING_FORWARD, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId } = canvas
      if (activeBoardId) selectedIds.forEach((id) => canvas.reorderItem(activeBoardId, id, 'forward'))
    })
    resolver.register(Actions.SEND_BACKWARD, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId } = canvas
      if (activeBoardId) selectedIds.forEach((id) => canvas.reorderItem(activeBoardId, id, 'backward'))
    })

    // Snap toggle
    resolver.register(Actions.TOGGLE_SNAP, () => useUIStore.getState().toggleSnapToGrid())

    resolver.register(Actions.GROUP, () => {
      const { selectedIds, activeBoardId, items } = useCanvasStore.getState()
      if (!activeBoardId || selectedIds.length < 2) return
      const selectedItems = items().filter((i) => selectedIds.includes(i.id))
      if (selectedItems.every((i) => i.groupId)) return
      useCanvasStore.getState().groupItems(activeBoardId, selectedIds)
    })

    resolver.register(Actions.UNGROUP, () => {
      const { selectedIds, activeBoardId, items } = useCanvasStore.getState()
      if (!activeBoardId) return
      const groupIds = new Set(
        items()
          .filter((i) => selectedIds.includes(i.id) && i.groupId)
          .map((i) => i.groupId!)
      )
      groupIds.forEach((gid) => useCanvasStore.getState().ungroupItems(activeBoardId, gid))
    })

    // Boards
    resolver.register(Actions.BOARD_NEW, () => {
      const canvas = useCanvasStore.getState()
      const id = canvas.addBoard(`Board ${canvas.boards.length + 1}`)
      canvas.setActiveBoard(id)
    })
    resolver.register(Actions.BOARD_NEXT, () => {
      const { boards, activeBoardId, setActiveBoard } = useCanvasStore.getState()
      if (boards.length < 2) return
      const idx = boards.findIndex((b) => b.id === activeBoardId)
      setActiveBoard(boards[(idx + 1) % boards.length].id)
    })
    resolver.register(Actions.BOARD_PREV, () => {
      const { boards, activeBoardId, setActiveBoard } = useCanvasStore.getState()
      if (boards.length < 2) return
      const idx = boards.findIndex((b) => b.id === activeBoardId)
      setActiveBoard(boards[(idx - 1 + boards.length) % boards.length].id)
    })
    resolver.register(Actions.BOARD_RENAME, () => {
      const { boards, activeBoardId, renameBoard } = useCanvasStore.getState()
      const board = boards.find((b) => b.id === activeBoardId)
      if (!board || !activeBoardId) return
      const name = window.prompt('Rename board:', board.name)
      if (name && name.trim()) renameBoard(activeBoardId, name.trim())
    })
    resolver.register(Actions.BOARD_DELETE, () => {
      const canvas = useCanvasStore.getState()
      const { boards, activeBoardId, setActiveBoard, removeBoard } = canvas
      if (!activeBoardId || boards.length <= 1) return
      const idx = boards.findIndex((b) => b.id === activeBoardId)
      const next = boards.filter((b) => b.id !== activeBoardId)
      removeBoard(activeBoardId)
      if (next.length > 0) setActiveBoard(next[Math.min(idx, next.length - 1)].id)
    })
    resolver.register(Actions.RECORD_PLAY, () => {
      // RecordingBar manages its own playback UI — no-op here
    })

    // Panels
    resolver.register(Actions.PANEL_PROPERTIES, () => useUIStore.getState().togglePanel('itemProperties'))
    resolver.register(Actions.PANEL_SEARCH,     () => useUIStore.getState().togglePanel('tagSearch'))
    resolver.register(Actions.PANEL_KEYBINDS,   () => useUIStore.getState().togglePanel('keybindSettings'))

    // Exports
    resolver.register(Actions.EXPORT_PDF,   () => { exportToPdf().catch(console.error) })
    resolver.register(Actions.EXPORT_IMAGE, () => { exportToImage().catch(console.error) })
    resolver.register(Actions.EXPORT_ZIP,   () => { exportToZip().catch(console.error) })

    // File
    resolver.register(Actions.SAVE, () => {
      saveCurrentOrAs().then((ok) => {
        if (!ok) return
        triggerEffect('rune-seal')
        if (useUIStore.getState().youSavedEnabled) useUIStore.getState().showYouSaved()
      })
    })
    resolver.register(Actions.SAVE_AS, () => {
      saveProjectAs().then((p) => {
        if (!p) return
        triggerEffect('rune-seal')
        if (useUIStore.getState().youSavedEnabled) useUIStore.getState().showYouSaved()
      })
    })
    resolver.register(Actions.OPEN,        () => { openProject().then((ok) => { if (ok) triggerEffect('lightning-in') }) })
    resolver.register(Actions.NEW_PROJECT, () => { newProject(); triggerEffect('rise-from-fog') })

    // Copy / Paste / Cut
    resolver.register(Actions.COPY, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, items } = canvas
      if (selectedIds.length === 0) return
      clipboard = items().filter((i) => selectedIds.includes(i.id))
    })

    resolver.register(Actions.PASTE, () => {
      if (clipboard.length === 0) return
      const canvas = useCanvasStore.getState()
      const { activeBoardId } = canvas
      if (!activeBoardId) return
      pasteOffset += 20
      const copies = clipboard.map((i) => ({ ...i, id: nanoid(), x: i.x + pasteOffset, y: i.y + pasteOffset }))
      copies.forEach((c) => {
        canvas.addItem(activeBoardId, c)
        useHistoryStore.getState().push('ITEM_ADD', activeBoardId, null, c)
      })
      canvas.setSelection(copies.map((c) => c.id))
    })

    resolver.register(Actions.CUT, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId, items } = canvas
      if (!activeBoardId || selectedIds.length === 0) return
      clipboard = items().filter((i) => selectedIds.includes(i.id))
      pasteOffset = 0
      useHistoryStore.getState().push('ITEM_DELETE', activeBoardId, clipboard, clipboard.map((i) => ({ id: i.id })))
      canvas.removeItems(activeBoardId, selectedIds)
      canvas.clearSelection()
    })

    // Align selected items
    resolver.register(Actions.ALIGN_LEFT, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId, items } = canvas
      if (!activeBoardId || selectedIds.length < 2) return
      const sel = items().filter((i) => selectedIds.includes(i.id))
      const minX = Math.min(...sel.map((i) => i.x))
      sel.forEach((i) => canvas.updateItem(activeBoardId, i.id, { x: minX }))
    })
    resolver.register(Actions.ALIGN_RIGHT, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId, items } = canvas
      if (!activeBoardId || selectedIds.length < 2) return
      const sel = items().filter((i) => selectedIds.includes(i.id))
      const maxX = Math.max(...sel.map((i) => i.x + i.width))
      sel.forEach((i) => canvas.updateItem(activeBoardId, i.id, { x: maxX - i.width }))
    })
    resolver.register(Actions.ALIGN_TOP, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId, items } = canvas
      if (!activeBoardId || selectedIds.length < 2) return
      const sel = items().filter((i) => selectedIds.includes(i.id))
      const minY = Math.min(...sel.map((i) => i.y))
      sel.forEach((i) => canvas.updateItem(activeBoardId, i.id, { y: minY }))
    })
    resolver.register(Actions.ALIGN_BOTTOM, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId, items } = canvas
      if (!activeBoardId || selectedIds.length < 2) return
      const sel = items().filter((i) => selectedIds.includes(i.id))
      const maxY = Math.max(...sel.map((i) => i.y + i.height))
      sel.forEach((i) => canvas.updateItem(activeBoardId, i.id, { y: maxY - i.height }))
    })
    resolver.register(Actions.ALIGN_CENTER_H, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId, items } = canvas
      if (!activeBoardId || selectedIds.length < 2) return
      const sel = items().filter((i) => selectedIds.includes(i.id))
      const minX = Math.min(...sel.map((i) => i.x))
      const maxX = Math.max(...sel.map((i) => i.x + i.width))
      const cx = (minX + maxX) / 2
      sel.forEach((i) => canvas.updateItem(activeBoardId, i.id, { x: cx - i.width / 2 }))
    })
    resolver.register(Actions.ALIGN_CENTER_V, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId, items } = canvas
      if (!activeBoardId || selectedIds.length < 2) return
      const sel = items().filter((i) => selectedIds.includes(i.id))
      const minY = Math.min(...sel.map((i) => i.y))
      const maxY = Math.max(...sel.map((i) => i.y + i.height))
      const cy = (minY + maxY) / 2
      sel.forEach((i) => canvas.updateItem(activeBoardId, i.id, { y: cy - i.height / 2 }))
    })

    // Recording
    resolver.register(Actions.RECORD_TOGGLE, () => {
      const { isRecording, startRecording, stopRecording, saveRecording } = useHistoryStore.getState()
      const { triggerEffect: trigger, clearEffect } = useMascotStore.getState()
      if (isRecording) {
        const session = stopRecording()
        if (session) saveRecording(session)
        clearEffect('eye-open')
        trigger('eye-close')
      } else {
        startRecording(`Recording ${new Date().toLocaleTimeString()}`)
        trigger('eye-open')
      }
    })
  }, [])

  // ── Global keydown listener ────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      engine.keyStroke(e.key, lastMouse.x, lastMouse.y)
      // Don't intercept when typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return
      resolver.resolve(e)
    }
    const onMouseMove = (e: MouseEvent) => {
      lastMouse.x = e.clientX
      lastMouse.y = e.clientY
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

  // ── Bridge native menu → keybind resolver ─────────────────────────────────
  // Electron menu accelerators intercept keydown before the renderer sees it,
  // so we listen for the IPC messages the menu sends and dispatch them here.
  useEffect(() => {
    const ipc = (window as unknown as { ipc: { on: (ch: string, fn: () => void) => () => void } }).ipc
    const unsubs = [
      ipc.on('menu:undo',       () => resolver.dispatch(Actions.UNDO)),
      ipc.on('menu:redo',       () => resolver.dispatch(Actions.REDO)),
      ipc.on('menu:save',       () => resolver.dispatch(Actions.SAVE)),
      ipc.on('menu:saveAs',     () => resolver.dispatch(Actions.SAVE_AS)),
      ipc.on('menu:open',       () => resolver.dispatch(Actions.OPEN)),
      ipc.on('menu:newProject', () => resolver.dispatch(Actions.NEW_PROJECT)),
      ipc.on('menu:delete',     () => resolver.dispatch(Actions.DELETE)),
      ipc.on('menu:selectAll',  () => resolver.dispatch(Actions.SELECT_ALL)),
      ipc.on('menu:zoomIn',     () => resolver.dispatch(Actions.ZOOM_IN)),
      ipc.on('menu:zoomOut',    () => resolver.dispatch(Actions.ZOOM_OUT)),
      ipc.on('menu:zoomFit',    () => resolver.dispatch(Actions.ZOOM_FIT)),
      ipc.on('menu:duplicate',  () => resolver.dispatch(Actions.DUPLICATE)),
      ipc.on('menu:copy',       () => resolver.dispatch(Actions.COPY)),
      ipc.on('menu:paste',      () => resolver.dispatch(Actions.PASTE)),
      ipc.on('menu:cut',        () => resolver.dispatch(Actions.CUT)),
      ipc.on('menu:boardNew',     () => resolver.dispatch(Actions.BOARD_NEW)),
      ipc.on('menu:boardNext',    () => resolver.dispatch(Actions.BOARD_NEXT)),
      ipc.on('menu:boardPrev',    () => resolver.dispatch(Actions.BOARD_PREV)),
      ipc.on('menu:recordToggle', () => resolver.dispatch(Actions.RECORD_TOGGLE)),
      ipc.on('menu:exportPdf',    () => exportToPdf().catch(console.error)),
      ipc.on('menu:exportImage',  () => exportToImage().catch(console.error)),
      ipc.on('menu:exportZip',    () => exportToZip().catch(console.error)),
    ]
    return () => unsubs.forEach((u) => u?.())
  }, [])

  // ── Auto-save every 2 minutes ──────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      autoSave()
      triggerEffect('base-pulse')
    }, 2 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  // ── Idle 15s → ember-drift ────────────────────────────────────────────────
  useEffect(() => {
    const { clearEffect } = useMascotStore.getState()
    let idleTimer: ReturnType<typeof setTimeout>
    const resetIdle = () => {
      clearEffect('ember-drift')
      clearTimeout(idleTimer)
      idleTimer = setTimeout(() => triggerEffect('ember-drift'), 15_000)
    }
    const EVENTS = ['mousemove', 'keydown', 'mousedown', 'wheel'] as const
    EVENTS.forEach((e) => window.addEventListener(e, resetIdle, { passive: true }))
    resetIdle()
    return () => {
      clearTimeout(idleTimer)
      EVENTS.forEach((e) => window.removeEventListener(e, resetIdle))
    }
  }, [])

  const handleRecoveryRestore = () => {
    if (!recoveryData) return
    try {
      loadProjectData(JSON.parse(recoveryData))
      triggerEffect('lightning-in')
    } catch (e) { console.error('Recovery restore failed', e) }
    const ipc = (window as unknown as { ipc: { invoke: (ch: string) => Promise<unknown> } }).ipc
    ipc.invoke('recovery:clear').catch(() => {})
    setRecoveryData(null)
  }

  const handleRecoveryDismiss = () => {
    const ipc = (window as unknown as { ipc: { invoke: (ch: string) => Promise<unknown> } }).ipc
    ipc.invoke('recovery:clear').catch(() => {})
    setRecoveryData(null)
    triggerEffect('fracture')
  }

  return (
    <div className="app-root" style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: 'var(--bg-canvas)' }}>
      {recoveryData && (
        <div style={{
          position: 'absolute', top: 48, left: '50%', transform: 'translateX(-50%)',
          zIndex: 'var(--z-modal)' as unknown as number,
          background: 'var(--bg-panel)',
          border: '1px solid var(--accent)',
          borderRadius: 6, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: 'var(--shadow-lg)',
          fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-primary)',
        }}>
          <span style={{ color: 'var(--accent)' }}>⚠</span>
          <span>Unsaved session detected. Restore?</span>
          <button onClick={handleRecoveryRestore} style={{
            background: 'var(--accent)', color: '#0f0d0b', border: 'none',
            borderRadius: 3, padding: '4px 10px', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
          }}>Restore</button>
          <button onClick={handleRecoveryDismiss} style={{
            background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)',
            borderRadius: 3, padding: '4px 10px', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: 12,
          }}>Discard</button>
        </div>
      )}
      <BoardTabs />
      <Toolbar />
      {/* Canvas viewport — inset from the right sidebar */}
      <div ref={canvasContainerRef} style={{ position: 'absolute', inset: 0, right: 'var(--sidebar-right-w)' }}>
        <CanvasStage />
      </div>
      <RightSidebar />
      <Minimap />
      <RecordingBar />
      <TagSearch />
      <ContextMenu />
      <ItemProperties />
      <ConnectionProperties />
      <KeybindSettings />
      {editingItem && <TextEditOverlay key={editingItem.id} item={editingItem} />}
      <YouSavedBanner />
      <HyperTypeOverlay canvasContainerRef={canvasContainerRef} />
    </div>
  )
}
