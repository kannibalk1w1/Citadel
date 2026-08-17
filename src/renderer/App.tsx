import React, { useEffect, useRef } from 'react'
import type { CanvasItem } from '../types'

// Module-level clipboard (persists across renders, not across restarts)
let clipboard: CanvasItem[] = []
let pasteOffset = 0
import { CanvasStage } from './canvas/CanvasStage'
import { VisionFilterDefs } from './canvas/VisionFilterDefs'
import { useVisionLayers } from './canvas/useVisionLayers'
import { VisionStatusChip } from './ui/VisionStatusChip'
import { StudySessionBar } from './ui/StudySessionBar'
import { TimeMachine } from './ui/TimeMachine'
import { useStudyStore } from './presentation/studyStore'
import { visionStatusLabel, type VisionMode } from './canvas/visionModes'
import { Toolbar } from './ui/Toolbar'
import { BoardTabs } from './ui/BoardTabs'
import { ProjectMenu } from './ui/ProjectMenu'
import { ShellFrame } from './ui/shell/ShellFrame'
import { MenuBarHover } from './ui/shell/MenuBarHover'
import { ClickThroughPanel } from './ui/shell/ClickThroughPanel'
import { CommandPalette } from './ui/palette/CommandPalette'
import { Onboarding } from './ui/onboarding/Onboarding'
import { activeArchiveRailWidth, shellCanvasInset } from './ui/shell/shellModel'
import { BoardNavigator } from './ui/BoardNavigator'
import { AssetLibrary } from './ui/AssetLibrary'
import { Minimap } from './ui/Minimap'
import { ContextMenu } from './ui/ContextMenu'
import { RecordingBar } from './ui/RecordingBar'
import { RightSidebar } from './ui/RightSidebar'
import { TagSearch } from './ui/TagSearch'
import { PresentationSequence } from './ui/PresentationSequence'
import { ItemProperties } from './ui/panels/ItemProperties'
import { ConnectionProperties } from './ui/panels/ConnectionProperties'
import { KeybindSettings } from './ui/panels/KeybindSettings'
import { TextEditOverlay } from './canvas/TextEditOverlay'
import { YouSavedBanner } from './ui/YouSavedBanner'
import { InscriptionToasts } from './ui/toasts/InscriptionToasts'
import { inscribe } from './ui/toasts/inscriptionToastStore'
import { ArchiveRiteOverlay } from './ui/ArchiveRiteOverlay'
import { registerArchiveProgressListener } from './ui/archiveProgressStore'
import { PresentationQuill } from './presentation/PresentationQuill'
import { plantWaystoneEvent, resolveWaystones } from './canvas/chamberWaystones'
import { IndexLedger } from './ui/IndexLedger'
import { ArchiveWorkbench } from './archive/ArchiveWorkbench'
import { InscriptionPrompt } from './ui/prompt/InscriptionPrompt'
import { SourceCaptureRegionPicker } from './ui/SourceCaptureRegionPicker'
import { askInscription } from './ui/prompt/inscriptionPromptStore'
import { QuillControls } from './presentation/QuillControls'
import { useQuillStore } from './presentation/quillStore'
import { HyperTypeOverlay } from './arcade/HyperTypeOverlay'
import { engine, lastMouse } from './arcade/HyperTypeEngine'
import { getCaretScreenPos } from './arcade/caretPos'
import { useCanvasStore } from './store/canvasStore'
import { useHistoryStore } from './store/historyStore'
import { useUIStore } from './store/uiStore'
import { normalizeCanvasBackground, normalizeSavedThemePalettes, normalizeThemeOverrides } from './store/uiStore'
import { normalizeKeybindOverrides, resolver } from './keybinds/keybindResolver'
import { Actions } from './keybinds/actions'
import { nanoid } from 'nanoid'
import { saveCurrentOrAs, saveProjectAs, openProject, newProject, autoSave, clearRecoveryIfClean, loadProjectData, parseRecoveryData, type ParsedRecovery } from './utils/projectFile'
import { exportToPdf } from './export/pdfExport'
import { exportToImage } from './export/imageExport'
import { exportToZip } from './export/zipExport'
import { autoArrangeGrid } from './canvas/arrange/autoArrange'
import { createCommentPinItem } from './canvas/annotations/commentPin'
import { focusViewportFor, nextPresentationIndex, orderedPresentationItems } from './presentation/presentationNavigation'
import { replayEvent, revertEvent } from './store/canvasEventApply'
import { installMediaPreviewProfileHarness } from './performance/mediaPreviewProfileHarness'
import { ToolIcon } from './ui/icons/ToolIcon'

const ZOOM_STEP = 1.2
const MIN_SCALE = 0.05
const MAX_SCALE = 20
function fitActiveBoard(fullWidth = false): void {
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
  const expandedRailWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-right-w') || '228')
  const sidebarW = fullWidth
    ? 0
    : activeArchiveRailWidth(useUIStore.getState().archiveRailCollapsed, expandedRailWidth)
  const canvasW = window.innerWidth - sidebarW
  const pad = fullWidth ? 80 : 60
  const scale = Math.min(
    MAX_SCALE,
    Math.max(MIN_SCALE, Math.min(
      (canvasW - pad * 2) / Math.max(1, maxX - minX),
      (window.innerHeight - pad * 2) / Math.max(1, maxY - minY),
    ))
  )
  canvas.updateViewport({
    scale,
    x: canvasW / 2 - ((minX + maxX) / 2) * scale,
    y: window.innerHeight / 2 - ((minY + maxY) / 2) * scale,
  })
}

function focusPresentationItem(item: CanvasItem): void {
  useCanvasStore.getState().updateViewport(
    focusViewportFor(item, { width: window.innerWidth, height: window.innerHeight }),
  )
}

function stepPresentation(direction: 1 | -1): void {
  const ui = useUIStore.getState()
  if (!ui.presentationMode) return

  const canvas = useCanvasStore.getState()
  const { boards, activeBoardId, selectedIds } = canvas
  const boardIndex = boards.findIndex((board) => board.id === activeBoardId)
  if (boardIndex === -1) return

  const activeItems = orderedPresentationItems(canvas.items())
  const currentId = selectedIds.find((id) => activeItems.some((item) => item.id === id)) ?? null
  const nextIndex = nextPresentationIndex(activeItems, currentId, direction)
  const nextItem = activeItems[nextIndex]
  if (nextItem) {
    canvas.setSelection([nextItem.id])
    focusPresentationItem(nextItem)
    return
  }

  const nextBoardIndex = boardIndex + direction
  const nextBoard = boards[nextBoardIndex]
  if (!nextBoard) return
  canvas.setActiveBoard(nextBoard.id)
  const boardItems = orderedPresentationItems(nextBoard.items)
  const boardItem = direction === 1 ? boardItems[0] : boardItems.at(-1)
  if (boardItem) {
    canvas.setSelection([boardItem.id])
    focusPresentationItem(boardItem)
  } else {
    fitActiveBoard(true)
  }
}

export default function App(): React.ReactElement {
  const initBoard = useCanvasStore((s) => s.initDefaultBoard)
  const resolverReady = useRef(false)
  const editingItemId = useUIStore((s) => s.editingItemId)
  const editingItem = useCanvasStore((s) => s.items().find((i) => i.id === editingItemId))
  const presentationMode = useUIStore((s) => s.presentationMode)
  const archiveRailCollapsed = useUIStore((s) => s.archiveRailCollapsed)
  const hyperTypeEnabled = useUIStore((s) => s.hyperTypeEnabled)
  useEffect(() => { engine.setEnabled(hyperTypeEnabled) }, [hyperTypeEnabled])
  const windowOpacity = useUIStore((s) => s.windowOpacity)
  const windowOpacityUsesRendererFallback = useUIStore((s) => s.windowOpacityUsesRendererFallback)
  const activeBoard = useCanvasStore((s) => s.activeBoard())
  const [recoveryData, setRecoveryData] = React.useState<ParsedRecovery | null>(null)
  // Held as state, not a ref: the vision checks style this element from an
  // effect, and a ref's .current changing does not re-run one.
  const [canvasContainerEl, setCanvasContainerEl] = React.useState<HTMLDivElement | null>(null)
  const visionMode = useUIStore((s) => s.visionMode)
  useVisionLayers(canvasContainerEl)

  // Electron's BrowserWindow#setOpacity is a documented no-op on Linux. The
  // transparent host created by main lets this alpha reach the compositor there,
  // while desktop builds with native opacity leave the renderer fully opaque.
  useEffect(() => {
    const root = document.documentElement
    if (windowOpacityUsesRendererFallback) {
      root.dataset.windowOpacityFallback = 'true'
      root.style.setProperty('--window-overlay-opacity', String(windowOpacity))
      return
    }
    delete root.dataset.windowOpacityFallback
    root.style.removeProperty('--window-overlay-opacity')
  }, [windowOpacity, windowOpacityUsesRendererFallback])

  useEffect(() => {
    initBoard()

    // Check for crash recovery file on startup
    const ipc = (window as unknown as { ipc: { invoke: (ch: string, ...a: unknown[]) => Promise<unknown> } }).ipc
    ipc.invoke('recovery:get').then((res) => {
      const { data } = res as { data: string | null }
      if (data) setRecoveryData(parseRecoveryData(data))
    }).catch(() => {})

    ipc.invoke('settings:getMany', {
      keys: [
        'ui.youSavedEnabled',
        'ui.hyperTypeEnabled',
        'ui.dragonCursorEnabled',
        'ui.theme',
        'ui.themeOverrides',
        'ui.savedThemePalettes',
        'ui.archiveRailCollapsed',
        'ui.zoomFactor',
        'export.scale',
        'export.area',
        'export.includeComments',
        'ui.canvasBackground',
        'ui.canvasDefaultMigration',
        'ui.alwaysOnTop',
        'ui.windowOpacity',
        'ui.onboardingComplete',
      ],
    }).then((res) => {
      const { values } = res as { values: Record<string, unknown> }
      const nextState: Partial<ReturnType<typeof useUIStore.getState>> = {}
      if (values['ui.youSavedEnabled'] === true) nextState.youSavedEnabled = true
      if (values['ui.hyperTypeEnabled'] === true) nextState.hyperTypeEnabled = true
      if (values['ui.dragonCursorEnabled'] === true) nextState.dragonCursorEnabled = true
      const theme = values['ui.theme']
      if (theme === 'citadel' || theme === 'graphite' || theme === 'light') nextState.theme = theme
      if (theme === 'ref-flow') nextState.theme = 'graphite'
      nextState.themeOverrides = normalizeThemeOverrides(values['ui.themeOverrides'])
      nextState.savedThemePalettes = normalizeSavedThemePalettes(values['ui.savedThemePalettes'])
      if (typeof values['ui.archiveRailCollapsed'] === 'boolean') nextState.archiveRailCollapsed = values['ui.archiveRailCollapsed']
      if (typeof values['export.scale'] === 'number') {
        nextState.exportScale = Math.min(3, Math.max(1, Math.round(values['export.scale'])))
      }
      const exportArea = values['export.area']
      if (exportArea === 'viewport' || exportArea === 'board' || exportArea === 'selection') {
        nextState.exportArea = exportArea
      }
      if (values['export.includeComments'] === false) nextState.includeCommentsInExport = false
      const canvasBackground = values['ui.canvasBackground']
      if (canvasBackground && typeof canvasBackground === 'object') {
        nextState.canvasBackground = normalizeCanvasBackground(canvasBackground)
      }
      // Retire older flat defaults in favour of the quiet dot grid. Legacy
      // stone values have already been normalized to dots above.
      const CANVAS_DEFAULT_MIGRATION = 3
      const migrated = typeof values['ui.canvasDefaultMigration'] === 'number' ? values['ui.canvasDefaultMigration'] : 0
      if (migrated < CANVAS_DEFAULT_MIGRATION) {
        const carried = nextState.canvasBackground?.mode
        if (carried === 'flat') {
          nextState.canvasBackground = { ...nextState.canvasBackground!, mode: 'dots' }
          ipc.invoke('settings:set', { key: 'ui.canvasBackground', value: nextState.canvasBackground }).catch(() => {})
        }
        ipc.invoke('settings:set', { key: 'ui.canvasDefaultMigration', value: CANVAS_DEFAULT_MIGRATION }).catch(() => {})
      }
      if (Object.keys(nextState).length > 0) useUIStore.setState(nextState)
      // The welcome panel is deliberately non-modal. It only appears on a
      // first run, and never prevents an existing project from being opened.
      if (values['ui.onboardingComplete'] !== true) useUIStore.getState().openPanel('onboarding')
      // Re-apply through main so the window actually adopts the stored mode.
      // Click-through is never restored: it is not persisted.
      const alwaysOnTop = values['ui.alwaysOnTop'] === true
      const storedOpacity = values['ui.windowOpacity']
      const opacity = typeof storedOpacity === 'number' ? storedOpacity : 1
      if (alwaysOnTop || opacity !== 1) {
        useUIStore.getState().applyWindowMode({ alwaysOnTop, opacity })
      }
      const zoomFactor = values['ui.zoomFactor']
      if (typeof zoomFactor === 'number' && zoomFactor !== 1.0) useUIStore.getState().setUiScale(zoomFactor)
    }).catch(() => {})
    ipc.invoke('keybinds:get').then((res) => {
      resolver.setOverrides(normalizeKeybindOverrides((res as { overrides?: unknown }).overrides))
    }).catch(() => {})

    installMediaPreviewProfileHarness({
      window,
      isDev: import.meta.env.DEV,
      ipc,
      setProfileBoard: (board) => {
        useCanvasStore.setState((state) => ({
          boards: [...state.boards.filter((existing) => existing.id !== board.id), board],
          activeBoardId: board.id,
          selectedIds: [],
        }))
      },
    })
  }, [])

  useEffect(() => {
    const clearRecoveryOnCleanUnload = () => {
      clearRecoveryIfClean().catch(() => {})
    }
    window.addEventListener('beforeunload', clearRecoveryOnCleanUnload)
    return () => window.removeEventListener('beforeunload', clearRecoveryOnCleanUnload)
  }, [])

  useEffect(() => registerArchiveProgressListener(), [])

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
    resolver.register(Actions.TOOL_CODE,    () => useUIStore.getState().setToolMode('code'))
    resolver.register(Actions.TOOL_STICKY,  () => useUIStore.getState().setToolMode('sticky'))
    resolver.register(Actions.TOOL_LINK,    () => useUIStore.getState().setToolMode('link'))
    resolver.register(Actions.TOOL_TAG,     () => useUIStore.getState().setToolMode('tag'))
    resolver.register(Actions.TOOL_SWATCH,  () => useUIStore.getState().setToolMode('swatch'))
    resolver.register(Actions.CODE_COPY, () => {
      const code = useCanvasStore.getState().selectedItems().find((item) => item.type === 'code')?.meta?.code
      if (typeof code !== 'string') return
      navigator.clipboard.writeText(code).then(() => inscribe('Code copied')).catch(() => inscribe('Could not copy code', { tone: 'danger' }))
    })

    // Undo / redo
    resolver.register(Actions.UNDO, () => {
      const { undo, canUndo } = useHistoryStore.getState()
      if (!canUndo()) return
      const event = undo()
      if (event) revertEvent(event)
      engine.burst('↩', lastMouse.x, lastMouse.y)
    })

    resolver.register(Actions.REDO, () => {
      const { redo, canRedo } = useHistoryStore.getState()
      if (!canRedo()) return
      const event = redo()
      if (event) replayEvent(event)
      engine.burst('↪', lastMouse.x, lastMouse.y)
    })

    // Delete selected items
    resolver.register(Actions.DELETE, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId } = canvas
      if (!activeBoardId || selectedIds.length === 0) return
      const toDelete = canvas.selectedUnlockedItems()
      if (toDelete.length === 0) return
      useHistoryStore.getState().push('ITEM_DELETE', activeBoardId, toDelete, toDelete.map((i) => ({ id: i.id })))
      canvas.removeItems(activeBoardId, toDelete.map((i) => i.id))
      canvas.clearSelection()
      engine.burst('✕', lastMouse.x, lastMouse.y, 'slice')
    })

    // Duplicate selected items
    resolver.register(Actions.DUPLICATE, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId } = canvas
      if (!activeBoardId || selectedIds.length === 0) return
      const originals = canvas.selectedUnlockedItems()
      if (originals.length === 0) return
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

    resolver.register(Actions.TOGGLE_LOCK, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId, updateItem } = canvas
      if (!activeBoardId || selectedIds.length === 0) return
      const selectedItems = canvas.selectedItems()
      const nextLocked = selectedItems.some((i) => !i.locked)
      selectedItems.forEach((item) => {
        useHistoryStore.getState().push(
          'ITEM_STYLE',
          activeBoardId,
          { id: item.id, locked: item.locked },
          { id: item.id, locked: nextLocked },
        )
        updateItem(activeBoardId, item.id, { locked: nextLocked })
      })
    })

    const flipSelected = (axis: 'flipX' | 'flipY') => {
      const canvas = useCanvasStore.getState()
      const { activeBoardId } = canvas
      if (!activeBoardId) return
      const targets = canvas.selectedUnlockedItems()
      if (targets.length === 0) return
      targets.forEach((item) => {
        const beforeMeta = { ...item.meta }
        const afterMeta = { ...item.meta, [axis]: item.meta?.[axis] !== true }
        useHistoryStore.getState().push('ITEM_STYLE', activeBoardId,
          { id: item.id, meta: beforeMeta },
          { id: item.id, meta: afterMeta },
        )
        useCanvasStore.getState().updateItem(activeBoardId, item.id, { meta: afterMeta })
      })
    }
    resolver.register(Actions.FLIP_H, () => flipSelected('flipX'))
    resolver.register(Actions.FLIP_V, () => flipSelected('flipY'))

    resolver.register(Actions.QUILL_TOGGLE, () => {
      if (!useUIStore.getState().presentationMode) return
      useQuillStore.getState().toggleActive()
    })

    resolver.register(Actions.WAYSTONE_PLANT, () => {
      const canvas = useCanvasStore.getState()
      const board = canvas.boards.find((b) => b.id === canvas.activeBoardId)
      if (!board) return
      const viewport = canvas.viewport()
      const stones = resolveWaystones(board)
      const event = plantWaystoneEvent(board, {
        id: nanoid(),
        name: `Bookmark ${stones.length + 1}`,
        x: viewport.x,
        y: viewport.y,
        scale: viewport.scale,
      })
      if (!event) {
        inscribe('No more bookmarks on this board')
        return
      }
      useHistoryStore.getState().push('BOARD_STYLE', board.id, event.before, event.after)
      canvas.updateBoardMeta(board.id, event.after)
      useHistoryStore.getState().markDirty()
      inscribe('Bookmark added')
    })

    let waystoneCursor = -1
    resolver.register(Actions.WAYSTONE_NEXT, () => {
      const canvas = useCanvasStore.getState()
      const board = canvas.boards.find((b) => b.id === canvas.activeBoardId)
      if (!board) return
      const stones = resolveWaystones(board)
      if (stones.length === 0) return
      waystoneCursor = (waystoneCursor + 1) % stones.length
      const stone = stones[waystoneCursor]
      canvas.updateViewport({ x: stone.x, y: stone.y, scale: stone.scale })
      inscribe(`Bookmark: ${stone.name}`)
    })

    resolver.register(Actions.FILENAME_LABELS_TOGGLE, () => {
      useUIStore.getState().toggleFilenameLabels()
      inscribe(useUIStore.getState().filenameLabelsVisible ? 'Filenames shown' : 'Filenames hidden')
    })

    // ── Vision checks ───────────────────────────────────────────────────────
    // Ways of looking, not changes to the board, so none of these push a
    // CanvasEvent and none of them are undoable.
    const announceVision = (): void => {
      const { visionMode, mirrorView } = useUIStore.getState()
      inscribe(visionStatusLabel(visionMode, mirrorView) ?? 'Vision checks off')
    }

    const setVision = (mode: VisionMode): void => {
      const current = useUIStore.getState().visionMode
      // Pressing the same check again puts the board back, so one key is both
      // "show me" and "stop showing me".
      useUIStore.getState().setVisionMode(current === mode ? 'none' : mode)
      announceVision()
    }

    resolver.register(Actions.VISION_CYCLE, () => {
      useUIStore.getState().cycleVisionMode()
      announceVision()
    })
    resolver.register(Actions.VISION_VALUE, () => setVision('value'))
    resolver.register(Actions.VISION_SQUINT, () => setVision('squint'))
    resolver.register(Actions.VISION_MIRROR, () => {
      useUIStore.getState().toggleMirrorView()
      announceVision()
    })
    resolver.register(Actions.VISION_CLEAR, () => {
      useUIStore.getState().clearVisionChecks()
      inscribe('Vision checks off')
    })

    // ── Study sessions ──────────────────────────────────────────────────────
    resolver.register(Actions.STUDY_START, () => {
      const study = useStudyStore.getState()
      // The same key ends a running session, so it is one switch, not two.
      if (study.status === 'idle') study.start()
      else study.stop()
    })
    resolver.register(Actions.STUDY_PAUSE, () => {
      const study = useStudyStore.getState()
      if (study.status === 'running') study.pause()
      else if (study.status === 'paused') study.resume()
    })
    resolver.register(Actions.TIME_MACHINE_TOGGLE, () => useUIStore.getState().togglePanel('timeMachine'))
    resolver.register(Actions.STUDY_NEXT, () => useStudyStore.getState().advance(1))
    resolver.register(Actions.STUDY_PREV, () => useStudyStore.getState().advance(-1))
    resolver.register(Actions.STUDY_STOP, () => {
      if (useStudyStore.getState().status !== 'idle') useStudyStore.getState().stop()
    })

    resolver.register(Actions.COMMENT_PIN_ADD, () => {
      const canvas = useCanvasStore.getState()
      const { activeBoardId } = canvas
      if (!activeBoardId) return
      const target = canvas.selectedItems()[0] ?? null
      const viewport = canvas.viewport()
      const expandedRailWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-right-w') || '228')
      const sidebarW = useUIStore.getState().presentationMode
        ? 0
        : activeArchiveRailWidth(useUIStore.getState().archiveRailCollapsed, expandedRailWidth)
      const fallbackPoint = {
        x: (window.innerWidth - sidebarW) / 2 / viewport.scale - viewport.x / viewport.scale - 110,
        y: window.innerHeight / 2 / viewport.scale - viewport.y / viewport.scale - 48,
      }
      const comment = createCommentPinItem({
        id: nanoid(),
        target,
        point: fallbackPoint,
        zIndex: Date.now(),
      })
      canvas.addItem(activeBoardId, comment)
      useHistoryStore.getState().push('ITEM_ADD', activeBoardId, null, comment)
      canvas.setSelection([comment.id])
      useUIStore.getState().setEditingItemId(comment.id)
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
      fitActiveBoard(false)
    })
    resolver.register(Actions.PRESENTATION_TOGGLE, () => {
      const ui = useUIStore.getState()
      const next = !ui.presentationMode
      ui.setPresentationMode(next)
      if (next) {
        ui.closeContextMenu()
        ui.setToolMode('pan')
        fitActiveBoard(true)
      } else {
        ui.setToolMode('select')
      }
    })
    resolver.register(Actions.PRESENTATION_NEXT, () => stepPresentation(1))
    resolver.register(Actions.PRESENTATION_PREV, () => stepPresentation(-1))

    // Item ordering
    resolver.register(Actions.BRING_FRONT, () => {
      const canvas = useCanvasStore.getState()
      const { activeBoardId } = canvas
      if (activeBoardId) canvas.selectedUnlockedItems().forEach((i) => canvas.reorderItem(activeBoardId, i.id, 'front'))
    })
    resolver.register(Actions.SEND_BACK, () => {
      const canvas = useCanvasStore.getState()
      const { activeBoardId } = canvas
      if (activeBoardId) canvas.selectedUnlockedItems().forEach((i) => canvas.reorderItem(activeBoardId, i.id, 'back'))
    })
    resolver.register(Actions.BRING_FORWARD, () => {
      const canvas = useCanvasStore.getState()
      const { activeBoardId } = canvas
      if (activeBoardId) canvas.selectedUnlockedItems().forEach((i) => canvas.reorderItem(activeBoardId, i.id, 'forward'))
    })
    resolver.register(Actions.SEND_BACKWARD, () => {
      const canvas = useCanvasStore.getState()
      const { activeBoardId } = canvas
      if (activeBoardId) canvas.selectedUnlockedItems().forEach((i) => canvas.reorderItem(activeBoardId, i.id, 'backward'))
    })

    // Snap toggle
    resolver.register(Actions.TOGGLE_SNAP, () => useUIStore.getState().toggleSnapToGrid())

    resolver.register(Actions.GROUP, () => {
      const { selectedIds, activeBoardId, selectedUnlockedItems, groupItems } = useCanvasStore.getState()
      if (!activeBoardId || selectedIds.length < 2) return
      const selectedItems = selectedUnlockedItems()
      if (selectedItems.length < 2) return
      if (selectedItems.every((i) => i.groupId)) return
      groupItems(activeBoardId, selectedItems.map((i) => i.id))
    })

    resolver.register(Actions.UNGROUP, () => {
      const { activeBoardId, selectedUnlockedItems, ungroupItems } = useCanvasStore.getState()
      if (!activeBoardId) return
      const groupIds = new Set(
        selectedUnlockedItems()
          .filter((i) => i.groupId)
          .map((i) => i.groupId!)
      )
      groupIds.forEach((gid) => ungroupItems(activeBoardId, gid))
    })

    // Boards
    resolver.register(Actions.BOARD_NEW, () => {
      const canvas = useCanvasStore.getState()
      const id = canvas.addBoard(`Board ${canvas.boards.length + 1}`)
      canvas.setActiveBoard(id)
      useHistoryStore.getState().markDirty()
      inscribe('Board created')
    })
    resolver.register(Actions.BOARD_DUPLICATE, () => {
      const canvas = useCanvasStore.getState()
      if (!canvas.activeBoardId) return
      const id = canvas.duplicateBoard(canvas.activeBoardId)
      if (id) {
        useHistoryStore.getState().markDirty()
        inscribe('Board duplicated')
      }
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
      const { boards, activeBoardId } = useCanvasStore.getState()
      const board = boards.find((b) => b.id === activeBoardId)
      if (!board || !activeBoardId) return
      void askInscription('Rename board:', board.name).then((name) => {
        if (!name) return
        useCanvasStore.getState().renameBoard(activeBoardId, name)
        useHistoryStore.getState().markDirty()
      })
    })
    resolver.register(Actions.BOARD_DELETE, () => {
      const canvas = useCanvasStore.getState()
      const { boards, activeBoardId, setActiveBoard, removeBoard } = canvas
      if (!activeBoardId || boards.length <= 1) return
      const idx = boards.findIndex((b) => b.id === activeBoardId)
      const next = boards.filter((b) => b.id !== activeBoardId)
      removeBoard(activeBoardId)
      useHistoryStore.getState().markDirty()
      if (next.length > 0) setActiveBoard(next[Math.min(idx, next.length - 1)].id)
      inscribe('Board deleted')
    })
    // RECORD_PLAY is deliberately left unregistered: RecordingBar owns playback
    // through its own UI, and there is nothing here to dispatch to. Registering
    // a no-op to "claim" the action put a "Play recording" row in the command
    // palette that did nothing when run — the palette lists exactly the actions
    // that have a handler, so an empty handler is how a dead row gets in.

    // Panels
    resolver.register(Actions.PANEL_PROPERTIES, () => {
      const inspector = document.querySelector<HTMLElement>('.citadel-item-properties')
      inspector?.querySelector<HTMLElement>('input, select, textarea, button')?.focus()
    })
    resolver.register(Actions.PANEL_SEARCH,     () => useUIStore.getState().togglePanel('tagSearch'))
    resolver.register(Actions.PANEL_KEYBINDS,   () => useUIStore.getState().togglePanel('keybindSettings'))
    resolver.register(Actions.PALETTE_TOGGLE,   () => useUIStore.getState().togglePanel('commandPalette'))
    resolver.register(Actions.PANEL_ARCHIVE_RAIL_TOGGLE, () => useUIStore.getState().toggleArchiveRail())

    // Window modes
    const OPACITY_STEP = 0.1
    resolver.register(Actions.WINDOW_ALWAYS_ON_TOP_TOGGLE, () => {
      const ui = useUIStore.getState()
      ui.applyWindowMode({ alwaysOnTop: !ui.windowAlwaysOnTop })
      inscribe(ui.windowAlwaysOnTop ? 'Window no longer on top' : 'Window stays on top')
    })
    resolver.register(Actions.WINDOW_CLICK_THROUGH_TOGGLE, () => {
      const ui = useUIStore.getState()
      const clickThrough = !ui.windowClickThrough
      ui.applyWindowMode({ clickThrough })
      // The only way back is the global shortcut, so say so plainly.
      inscribe(clickThrough ? 'Clicks pass through — Ctrl+Alt+C to stop' : 'Clicks return to Citadel')
    })
    resolver.register(Actions.WINDOW_OPACITY_DOWN, () => {
      const ui = useUIStore.getState()
      ui.applyWindowMode({ opacity: ui.windowOpacity - OPACITY_STEP })
    })
    resolver.register(Actions.WINDOW_OPACITY_UP, () => {
      const ui = useUIStore.getState()
      ui.applyWindowMode({ opacity: ui.windowOpacity + OPACITY_STEP })
    })

    // Exports
    resolver.register(Actions.EXPORT_PDF,   () => { exportToPdf().then(() => inscribe('PDF exported')).catch(console.error) })
    resolver.register(Actions.EXPORT_IMAGE, () => { exportToImage().then(() => inscribe('Image exported')).catch(console.error) })
    resolver.register(Actions.EXPORT_ZIP,   () => { void exportToZip().catch(console.error) })

    // File
    resolver.register(Actions.SAVE, () => {
      saveCurrentOrAs().then((ok) => {
        if (!ok) return
        if (useUIStore.getState().youSavedEnabled) useUIStore.getState().showYouSaved()
        else inscribe('Project saved')
      })
    })
    resolver.register(Actions.SAVE_AS, () => {
      saveProjectAs().then((p) => {
        if (!p) return
        if (useUIStore.getState().youSavedEnabled) useUIStore.getState().showYouSaved()
        else inscribe('Project saved')
      })
    })
    resolver.register(Actions.OPEN,        () => { openProject().then((ok) => { if (ok) inscribe('Project opened') }) })
    resolver.register(Actions.NEW_PROJECT, () => { if (newProject()) inscribe('New project created') })

    // Copy / Paste / Cut
    resolver.register(Actions.COPY, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds } = canvas
      if (selectedIds.length === 0) return
      clipboard = canvas.selectedUnlockedItems()
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
      const { selectedIds, activeBoardId } = canvas
      if (!activeBoardId || selectedIds.length === 0) return
      clipboard = canvas.selectedUnlockedItems()
      pasteOffset = 0
      if (clipboard.length === 0) return
      useHistoryStore.getState().push('ITEM_DELETE', activeBoardId, clipboard, clipboard.map((i) => ({ id: i.id })))
      canvas.removeItems(activeBoardId, clipboard.map((i) => i.id))
      canvas.clearSelection()
    })

    // Align selected items
    resolver.register(Actions.ALIGN_LEFT, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId } = canvas
      if (!activeBoardId || selectedIds.length < 2) return
      const sel = canvas.selectedUnlockedItems()
      if (sel.length < 2) return
      const minX = Math.min(...sel.map((i) => i.x))
      sel.forEach((i) => canvas.updateItem(activeBoardId, i.id, { x: minX }))
    })
    resolver.register(Actions.ALIGN_RIGHT, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId } = canvas
      if (!activeBoardId || selectedIds.length < 2) return
      const sel = canvas.selectedUnlockedItems()
      if (sel.length < 2) return
      const maxX = Math.max(...sel.map((i) => i.x + i.width))
      sel.forEach((i) => canvas.updateItem(activeBoardId, i.id, { x: maxX - i.width }))
    })
    resolver.register(Actions.ALIGN_TOP, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId } = canvas
      if (!activeBoardId || selectedIds.length < 2) return
      const sel = canvas.selectedUnlockedItems()
      if (sel.length < 2) return
      const minY = Math.min(...sel.map((i) => i.y))
      sel.forEach((i) => canvas.updateItem(activeBoardId, i.id, { y: minY }))
    })
    resolver.register(Actions.ALIGN_BOTTOM, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId } = canvas
      if (!activeBoardId || selectedIds.length < 2) return
      const sel = canvas.selectedUnlockedItems()
      if (sel.length < 2) return
      const maxY = Math.max(...sel.map((i) => i.y + i.height))
      sel.forEach((i) => canvas.updateItem(activeBoardId, i.id, { y: maxY - i.height }))
    })
    resolver.register(Actions.ALIGN_CENTER_H, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId } = canvas
      if (!activeBoardId || selectedIds.length < 2) return
      const sel = canvas.selectedUnlockedItems()
      if (sel.length < 2) return
      const minX = Math.min(...sel.map((i) => i.x))
      const maxX = Math.max(...sel.map((i) => i.x + i.width))
      const cx = (minX + maxX) / 2
      sel.forEach((i) => canvas.updateItem(activeBoardId, i.id, { x: cx - i.width / 2 }))
    })
    resolver.register(Actions.ALIGN_CENTER_V, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId } = canvas
      if (!activeBoardId || selectedIds.length < 2) return
      const sel = canvas.selectedUnlockedItems()
      if (sel.length < 2) return
      const minY = Math.min(...sel.map((i) => i.y))
      const maxY = Math.max(...sel.map((i) => i.y + i.height))
      const cy = (minY + maxY) / 2
      sel.forEach((i) => canvas.updateItem(activeBoardId, i.id, { y: cy - i.height / 2 }))
    })
    resolver.register(Actions.AUTO_ARRANGE, () => {
      const canvas = useCanvasStore.getState()
      const { selectedIds, activeBoardId } = canvas
      if (!activeBoardId || selectedIds.length < 2) return
      const selectedItems = canvas.selectedUnlockedItems()
      const moves = autoArrangeGrid(selectedItems)
      if (moves.length === 0) return
      const before = selectedItems.map((item) => ({ id: item.id, x: item.x, y: item.y }))
      useHistoryStore.getState().push('ITEM_MOVE', activeBoardId, before, moves)
      canvas.moveItems(activeBoardId, moves)
    })

    // Recording
    resolver.register(Actions.RECORD_TOGGLE, () => {
      const { isRecording, startRecording, stopRecording, saveRecording } = useHistoryStore.getState()
      if (isRecording) {
        const session = stopRecording()
        if (session) saveRecording(session)
        inscribe('Recording stopped')
      } else {
        startRecording(`Recording ${new Date().toLocaleTimeString()}`)
        inscribe('Recording started')
      }
    })
  }, [])

  // ── Global keydown listener ────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const tag = target.tagName
      const inText = tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
      let spawnX = lastMouse.x
      let spawnY = lastMouse.y
      if (inText) {
        const pos = getCaretScreenPos(target)
        if (pos) { spawnX = pos.x; spawnY = pos.y }
      }
      engine.keyStroke(e.key, spawnX, spawnY)
      if (useUIStore.getState().presentationMode && e.key === 'Escape') {
        e.preventDefault()
        // Escape rests a raised quill before it exits the presentation.
        if (useQuillStore.getState().active) {
          useQuillStore.getState().toggleActive()
          return
        }
        useUIStore.getState().setPresentationMode(false)
        useUIStore.getState().setToolMode('select')
        return
      }
      if (inText) return
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
    const ipc = (window as unknown as { ipc: { on: (ch: string, fn: (payload?: unknown) => void) => () => void } }).ipc
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
      ipc.on('menu:boardDuplicate', () => resolver.dispatch(Actions.BOARD_DUPLICATE)),
      ipc.on('menu:boardNext',    () => resolver.dispatch(Actions.BOARD_NEXT)),
      ipc.on('menu:boardPrev',    () => resolver.dispatch(Actions.BOARD_PREV)),
      ipc.on('menu:recordToggle', () => resolver.dispatch(Actions.RECORD_TOGGLE)),
      ipc.on('menu:alwaysOnTopToggle', () => resolver.dispatch(Actions.WINDOW_ALWAYS_ON_TOP_TOGGLE)),
      ipc.on('menu:clickThroughToggle', () => resolver.dispatch(Actions.WINDOW_CLICK_THROUGH_TOGGLE)),
      // Main turns click-through off from the global shortcut; mirror it here.
      ipc.on('window:modeChanged', (payload) => {
        const mode = payload as { alwaysOnTop: boolean; opacity: number; clickThrough: boolean }
        useUIStore.getState().setWindowModeFromMain(mode)
        if (!mode.clickThrough) inscribe('Clicks return to Citadel')
      }),
      ipc.on('menu:exportPdf',    () => exportToPdf().catch(console.error)),
      ipc.on('menu:exportImage',  () => exportToImage().catch(console.error)),
      ipc.on('menu:exportZip',    () => exportToZip().catch(console.error)),
    ]
    return () => unsubs.forEach((u) => u?.())
  }, [])

  // ── Auto-save every 2 minutes ──────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      autoSave().catch(() => {})
    }, 2 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const handleRecoveryRestore = () => {
    if (!recoveryData) return
    try {
      loadProjectData(recoveryData.project)
    } catch (e) { console.error('Recovery restore failed', e) }
    const ipc = (window as unknown as { ipc: { invoke: (ch: string) => Promise<unknown> } }).ipc
    ipc.invoke('recovery:clear').catch(() => {})
    setRecoveryData(null)
  }

  const handleRecoveryDismiss = () => {
    const ipc = (window as unknown as { ipc: { invoke: (ch: string) => Promise<unknown> } }).ipc
    ipc.invoke('recovery:clear').catch(() => {})
    setRecoveryData(null)
  }

  const recoveryBanner = recoveryData && (
        <div style={{
          position: 'absolute', top: 48, left: '50%', transform: 'translateX(-50%)',
          zIndex: 'var(--z-modal)' as unknown as number,
          background: 'var(--bg-panel)',
          border: '1px solid var(--accent)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 'var(--space-5)',
          boxShadow: 'var(--shadow-lg)',
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)', color: 'var(--text-primary)',
        }}>
          <span style={{ color: 'var(--accent)', display: 'flex' }}><ToolIcon name="warning" size={20} /></span>
          <span>
            Unsaved session detected
            <span style={{ display: 'block', fontSize: 'var(--text-md)', color: 'var(--text-secondary)', marginTop: 2 }}>
              {recoveryData.savedAt ? `${new Date(recoveryData.savedAt).toLocaleString()} - ` : ''}
              {recoveryData.boardCount} boards / {recoveryData.itemCount} items
            </span>
          </span>
          <button onClick={handleRecoveryRestore} style={{
            background: 'var(--accent)', color: '#070808', border: 'none',
            borderRadius: 'var(--radius-sm)', padding: '4px 10px', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', fontWeight: 600,
          }}>Restore</button>
          <button onClick={handleRecoveryDismiss} style={{
            background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '4px 10px', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)',
          }}>Discard</button>
        </div>
  )

  const presentationOverlay = presentationMode && (
        <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 'var(--z-ui)' as React.CSSProperties['zIndex'],
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-5)',
          padding: '6px 8px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          background: 'var(--bg-panel)',
          color: 'var(--text-secondary)',
          boxShadow: 'var(--shadow-md)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-sm)',
        }}>
          <button
            type="button"
            onClick={() => stepPresentation(-1)}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-canvas)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              padding: '2px 6px',
            }}
          >
            Prev
          </button>
          <span style={{ color: 'var(--text-accent)' }}>{activeBoard?.name ?? 'Presentation'}</span>
          <QuillControls />
          <button
            type="button"
            onClick={() => stepPresentation(1)}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-canvas)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              padding: '2px 6px',
            }}
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => {
              useUIStore.getState().setPresentationMode(false)
              useUIStore.getState().setToolMode('select')
            }}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-canvas)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              padding: '2px 6px',
            }}
          >
            Esc
          </button>
        </div>
  )

  return (
    <ShellFrame
      presentationMode={presentationMode}
      archiveRailCollapsed={archiveRailCollapsed}
      topBar={(
        <>
          {!presentationMode && <MenuBarHover />}
          {recoveryBanner}
          <BoardTabs />
          <ProjectMenu />
        </>
      )}
      commandSpine={<Toolbar />}
      canvas={(
        <>
          <div
            ref={setCanvasContainerEl}
            data-vision-surface="canvas"
            style={{ position: 'absolute', inset: 0, right: shellCanvasInset(presentationMode, archiveRailCollapsed) }}
          >
            <CanvasStage />
            <PresentationQuill />
          </div>
          {/* Both outside the filtered container, so a check cannot hide its own
              indicator or tint the matrix it is defined by. */}
          <VisionFilterDefs mode={visionMode} />
          <VisionStatusChip />
          <StudySessionBar />
          <TimeMachine />
        </>
      )}
      archiveRail={<RightSidebar />}
      contextDeck={(
        <>
          <Minimap />
          <BoardNavigator />
          <AssetLibrary />
          <IndexLedger />
          <ArchiveWorkbench />
          <RecordingBar />
          <TagSearch />
          <PresentationSequence />
          <ContextMenu />
          <ItemProperties />
          <ConnectionProperties />
          <KeybindSettings />
          {editingItem && !editingItem.locked && <TextEditOverlay key={editingItem.id} item={editingItem} />}
        </>
      )}
      presentationOverlay={presentationOverlay}
      globalOverlays={(
        <>
          <YouSavedBanner />
          <InscriptionToasts />
          <ArchiveRiteOverlay />
          <ClickThroughPanel />
          <Onboarding />
          <CommandPalette />
          <InscriptionPrompt />
          <HyperTypeOverlay />
          <SourceCaptureRegionPicker />
        </>
      )}
    />
  )
}
