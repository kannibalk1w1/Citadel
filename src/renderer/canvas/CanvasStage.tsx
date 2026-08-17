import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer } from 'react-konva'
import type Konva from 'konva'
import { nanoid } from 'nanoid'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { useUIStore } from '../store/uiStore'
import { DS_NORMAL, DS_CROSS, DS_HAND, DS_WHIP } from '../arcade/dragonCursor'
import { DOMLayerItemRenderer, isDOMLayerItem, ItemRenderer } from './ItemRenderer'
import { ConnectionLayer } from './overlays/ConnectionLayer'
import { GroupLayer } from './overlays/GroupLayer'
import { SnapGuides } from './overlays/SnapGuides'
import { SelectionBox } from './overlays/SelectionBox'
import { SelectedActionStrip } from './overlays/SelectedActionStrip'
import { SearchHighlight } from './overlays/SearchHighlight'
import { LassoOverlay } from './overlays/LassoOverlay'
import { AnchorHandles } from './overlays/AnchorHandles'
import { ConnectorQuickToolbar } from './overlays/ConnectorQuickToolbar'
import { KonvaItemChrome } from './overlays/KonvaItemChrome'
import { RuntimeStatsSigil } from './overlays/RuntimeStatsSigil'
import { CanvasBackground } from './CanvasBackground'
import { chamberAccentVariables, resolveChamberIdentity } from './chamberIdentity'
import { useFileDrop } from './useFileDrop'
import { visibleItemIds } from './visibility/viewportVisibility'
import { activeArchiveRailWidth } from '../ui/shell/shellModel'
import { canvasRuntimeStats } from '../performance/canvasRuntimeStats'
import { canvasColor } from '../theme/canvasColors'

const ZOOM_FACTOR = 1.1
const MIN_SCALE = 0.05
const MAX_SCALE = 20
const VIEWPORT_OVERSCAN_PX = 240

// Cursor art is opt-in and falls back to the standard cursor on every entry, so
// a missing or blocked .cur never leaves the pointer invisible.
const DRAGON_CURSORS: Record<string, string> = {
  select:     DS_NORMAL,
  lasso:      DS_WHIP,
  connect:    DS_CROSS,
  text:       DS_NORMAL,
  code:       DS_NORMAL,
  sticky:     DS_NORMAL,
  link:       DS_HAND,
  tag:        DS_NORMAL,
  swatch:     DS_NORMAL,
  comparison: DS_NORMAL,
  record:     DS_NORMAL,
  default:    DS_NORMAL,
}

const STANDARD_CURSORS: Record<string, string> = {
  pan:        'grab',
  connect:    'crosshair',
  text:       'text',
  code:       'cell',
  sticky:     'cell',
  swatch:     'cell',
  comparison: 'cell',
  lasso:      'crosshair',
  default:    'default',
}

export function CanvasStage(): React.ReactElement {
  const stageRef = useRef<Konva.Stage>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isPanning = useRef(false)
  const panStart = useRef<{ mouseX: number; mouseY: number; vpX: number; vpY: number } | null>(null)
  const viewport = useCanvasStore((s) => s.viewport())
  const updateViewport = useCanvasStore((s) => s.updateViewport)
  const items = useCanvasStore((s) => s.items())
  const toolMode = useUIStore((s) => s.toolMode)
  const clearSelection = useCanvasStore((s) => s.clearSelection)
  const closeContextMenu = useUIStore((s) => s.closeContextMenu)
  const openContextMenu = useUIStore((s) => s.openContextMenu)
  const connectFromId = useUIStore((s) => s.connectFromId)
  const setConnectFromId = useUIStore((s) => s.setConnectFromId)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const activeBoard = useCanvasStore((s) => s.boards.find((b) => b.id === s.activeBoardId) ?? null)
  const boardMeta = activeBoard?.meta
  const chamberVariables = useMemo(
    () => (activeBoard ? chamberAccentVariables(resolveChamberIdentity(activeBoard)) : {}),
    // Identity derives solely from board meta; viewport updates recreate the
    // board object every pan frame but never touch meta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boardMeta]
  )
  const searchHighlightId = useUIStore((s) => s.searchHighlightId)
  const presentationMode = useUIStore((s) => s.presentationMode)
  const archiveRailCollapsed = useUIStore((s) => s.archiveRailCollapsed)
  const dragonCursorEnabled = useUIStore((s) => s.dragonCursorEnabled)
  const CURSOR = dragonCursorEnabled ? DRAGON_CURSORS : STANDARD_CURSORS

  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)

  const { handleDragOver, handleDrop } = useFileDrop()

  // ── Wheel zoom ─────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const oldScale = viewport.scale
    const direction = e.evt.deltaY < 0 ? 1 : -1
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, oldScale * (direction > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR)))
    const mousePointTo = {
      x: (pointer.x - viewport.x) / oldScale,
      y: (pointer.y - viewport.y) / oldScale,
    }
    updateViewport({
      scale: newScale,
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    })
  }, [viewport, updateViewport])

  // ── Stage click ────────────────────────────────────────────────────────────
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== stageRef.current) return
    closeContextMenu()

    const stage = stageRef.current
    if (!stage || !activeBoardId) return

    // Convert screen coords → canvas coords
    const pos = stage.getPointerPosition()
    if (!pos) return
    const cx = (pos.x - viewport.x) / viewport.scale
    const cy = (pos.y - viewport.y) / viewport.scale

    if (toolMode === 'sticky') {
      const item = {
        id: nanoid(), type: 'sticky' as const,
        x: cx - 100, y: cy - 80, width: 200, height: 160,
        rotation: 0, zIndex: Date.now(), locked: false, visible: true, opacity: 1,
        tags: [], meta: { content: '', color: '#1e1b18' },
      }
      useCanvasStore.getState().addItem(activeBoardId, item)
      useHistoryStore.getState().push('ITEM_ADD', activeBoardId, null, item)
      useCanvasStore.getState().setSelection([item.id])
      return
    }

    if (toolMode === 'text') {
      const item = {
        id: nanoid(), type: 'text' as const,
        x: cx, y: cy, width: 300, height: 40,
        rotation: 0, zIndex: Date.now(), locked: false, visible: true, opacity: 1,
        tags: [], meta: { content: '', fontSize: 16, align: 'left' },
      }
      useCanvasStore.getState().addItem(activeBoardId, item)
      useHistoryStore.getState().push('ITEM_ADD', activeBoardId, null, item)
      useCanvasStore.getState().setSelection([item.id])
      useUIStore.getState().setEditingItemId(item.id)
      useUIStore.getState().setToolMode('select')
      return
    }

    if (toolMode === 'code') {
      const item = {
        id: nanoid(), type: 'code' as const,
        x: cx - 260, y: cy - 150, width: 520, height: 300,
        rotation: 0, zIndex: Date.now(), locked: false, visible: true, opacity: 1,
        tags: [], meta: { code: '// Paste code here', language: 'typescript' },
      }
      useCanvasStore.getState().addItem(activeBoardId, item)
      useHistoryStore.getState().push('ITEM_ADD', activeBoardId, null, item)
      useCanvasStore.getState().setSelection([item.id])
      useUIStore.getState().setToolMode('select')
      return
    }

    if (toolMode === 'swatch') {
      const item = {
        id: nanoid(), type: 'swatch' as const,
        x: cx - 150, y: cy - 40, width: 300, height: 80,
        rotation: 0, zIndex: Date.now(), locked: false, visible: true, opacity: 1,
        tags: [], meta: { colors: ['#070909', canvasColor("accent"), '#6f1717', '#d9e0dc', '#3f4a46'] },
      }
      useCanvasStore.getState().addItem(activeBoardId, item)
      useHistoryStore.getState().push('ITEM_ADD', activeBoardId, null, item)
      useCanvasStore.getState().setSelection([item.id])
      useUIStore.getState().setToolMode('select')
      return
    }

    if (toolMode === 'comparison') {
      const newItem = {
        id: nanoid(), type: 'comparison' as const,
        x: cx - 200, y: cy - 150, width: 400, height: 300,
        rotation: 0, zIndex: Date.now(), locked: false, visible: true, opacity: 1,
        tags: [], meta: { srcA: '', srcB: '', splitX: 0.5 },
      }
      useCanvasStore.getState().addItem(activeBoardId, newItem)
      useHistoryStore.getState().push('ITEM_ADD', activeBoardId, null, newItem)
      useCanvasStore.getState().setSelection([newItem.id])
      useUIStore.getState().setToolMode('select')
      return
    }

    if (toolMode === 'connect') {
      // Clicking empty canvas cancels connect
      setConnectFromId(null)
      return
    }

    clearSelection()
  }, [toolMode, viewport, activeBoardId, clearSelection, closeContextMenu, setConnectFromId])

  // ── Right-click on stage ───────────────────────────────────────────────────
  const handleContextMenu = useCallback((e: Konva.KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault()
    if (e.target === stageRef.current) openContextMenu(e.evt.clientX, e.evt.clientY)
  }, [openContextMenu])

  // Connect tool rubber-band — track cursor
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (toolMode !== 'connect' || !connectFromId) { setCursorPos(null); return }
    setCursorPos({ x: e.evt.clientX, y: e.evt.clientY })
  }, [connectFromId, toolMode])

  // ── Middle-mouse pan ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onDown = (e: MouseEvent) => {
      if (e.button !== 1) return
      e.preventDefault()
      const vp = useCanvasStore.getState().viewport()
      isPanning.current = true
      panStart.current = { mouseX: e.clientX, mouseY: e.clientY, vpX: vp.x, vpY: vp.y }
    }

    const onMove = (e: MouseEvent) => {
      if (!isPanning.current || !panStart.current) return
      const dx = e.clientX - panStart.current.mouseX
      const dy = e.clientY - panStart.current.mouseY
      useCanvasStore.getState().updateViewport({
        x: panStart.current.vpX + dx,
        y: panStart.current.vpY + dy,
      })
    }

    const onUp = (e: MouseEvent) => {
      if (e.button !== 1) return
      isPanning.current = false
      panStart.current = null
    }

    el.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      el.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // empty deps intentional: handlers read store imperatively via getState() to avoid stale closures

  // Archive rail width is reserved from the canvas work area. Read once —
  // getComputedStyle forces a style recalc and this renders every pan frame.
  const SIDEBAR_W = useMemo(() => {
    const expandedRailWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-right-w') || '228')
    return activeArchiveRailWidth(archiveRailCollapsed, expandedRailWidth)
  }, [archiveRailCollapsed])
  const width = presentationMode ? window.innerWidth : window.innerWidth - SIDEBAR_W
  const height = window.innerHeight
  const sortedItems = useMemo(() => [...items].sort((a, b) => a.zIndex - b.zIndex), [items])
  const visibleIds = useMemo(() => new Set(visibleItemIds(sortedItems, viewport, { width, height }, {
    overscanPx: VIEWPORT_OVERSCAN_PX,
    alwaysIncludeIds: [...selectedIds, searchHighlightId, connectFromId].filter((id): id is string => Boolean(id)),
  })), [connectFromId, height, searchHighlightId, selectedIds, sortedItems, viewport, width])
  const renderedItems = useMemo(() => sortedItems.filter((item) => visibleIds.has(item.id)), [sortedItems, visibleIds])
  const renderedDOMItems = useMemo(() => renderedItems.filter(isDOMLayerItem), [renderedItems])
  const runtimeStats = useMemo(() => canvasRuntimeStats(sortedItems, renderedItems), [renderedItems, sortedItems])

  // Compute rubber-band endpoints in screen space
  const connectSource = connectFromId ? items.find((i) => i.id === connectFromId) : null
  const rubberBand = connectSource && cursorPos ? {
    x1: (connectSource.x + connectSource.width / 2) * viewport.scale + viewport.x,
    y1: (connectSource.y + connectSource.height / 2) * viewport.scale + viewport.y,
    x2: cursorPos.x,
    y2: cursorPos.y,
  } : null

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        cursor: CURSOR[toolMode] ?? CURSOR.default,
        zIndex: 0,
        ...chamberVariables,
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <CanvasBackground />
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        draggable={toolMode === 'pan'}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onContextMenu={handleContextMenu}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setCursorPos(null)}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            updateViewport({ x: e.target.x(), y: e.target.y() })
          }
        }}
        onDragMove={(e) => {
          const stage = stageRef.current
          if (!stage || e.target !== stage) return
          updateViewport({ x: stage.x(), y: stage.y() })
        }}
      >
        <Layer>
          {renderedItems.map((item) => (
            <ItemRenderer key={item.id} item={item} />
          ))}
        </Layer>
        <Layer listening={false}>
          <SnapGuides />
        </Layer>
        <Layer listening={false}>
          <KonvaItemChrome items={renderedItems} />
          <SelectionBox items={renderedItems} />
          <AnchorHandles />
        </Layer>
        <Layer listening={false}>
          <SearchHighlight visibleItemIds={visibleIds} />
        </Layer>
        <Layer>
          <LassoOverlay />
        </Layer>
      </Stage>

      <ConnectionLayer viewport={viewport} items={items} visibleItemIds={visibleIds} rubberBand={rubberBand} />
      <GroupLayer viewport={viewport} visibleItemIds={visibleIds} />
      <div
        id="dom-items-layer"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 2,
          overflow: 'visible',
        }}
      />
      {renderedDOMItems.map((item) => (
        <DOMLayerItemRenderer key={`dom-${item.id}`} item={item} />
      ))}
      <RuntimeStatsSigil stats={runtimeStats} />
      <ConnectorQuickToolbar />
      <SelectedActionStrip />
    </div>
  )
}
