import React, { useEffect, useMemo, useState } from 'react'
import type { CanvasItem } from '../../types'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { useUIStore } from '../store/uiStore'
import { inscribe } from '../ui/toasts/inscriptionToastStore'
import { buildArchiveWorkbenchModel, type ArchiveWorkbenchRelic } from './archiveWorkbenchModel'
import { buildIngestItems } from './workbenchIngest'
import { activeArchiveRailWidth } from '../ui/shell/shellModel'

type IpcWindow = Window & { ipc?: { invoke: (channel: string, args?: unknown) => Promise<unknown> } }

const PROBE_LIMIT = 200

function sectionTitle(text: string): React.ReactElement {
  return (
    <div style={{ color: 'var(--text-accent)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
      {text}
    </div>
  )
}

// The Archive Workbench: review uncategorized relics, assign sigils fast,
// surface missing assets, and ingest whole folders as relic grids.
export function ArchiveWorkbench(): React.ReactElement | null {
  const isOpen = useUIStore((s) => s.panels.archiveWorkbench)
  const boards = useCanvasStore((s) => s.boards)
  const [availability, setAvailability] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!isOpen) return
    const ipc = (window as IpcWindow).ipc
    if (!ipc) return
    const sources = Array.from(new Set(
      boards.flatMap((board) => board.items.map((item) => item.src).filter((src): src is string => Boolean(src))),
    )).slice(0, PROBE_LIMIT)
    let cancelled = false
    void Promise.all(sources.map(async (src) => {
      try {
        const result = (await ipc.invoke('assets:getThumbnail', { path: src })) as { exists?: boolean }
        return [src, result?.exists === true] as const
      } catch {
        return [src, true] as const
      }
    })).then((entries) => {
      if (!cancelled) setAvailability(Object.fromEntries(entries))
    })
    return () => { cancelled = true }
  }, [isOpen, boards])

  const model = useMemo(
    () => (isOpen ? buildArchiveWorkbenchModel(boards, availability) : null),
    [isOpen, boards, availability],
  )

  if (!isOpen || !model) return null

  const applySigil = (relic: ArchiveWorkbenchRelic, sigil: string) => {
    const canvas = useCanvasStore.getState()
    const board = canvas.boards.find((b) => b.id === relic.chamberId)
    const item = board?.items.find((i) => i.id === relic.itemId)
    if (!board || !item || item.tags.includes(sigil)) return
    const after = { id: item.id, tags: [...item.tags, sigil] }
    useHistoryStore.getState().push('ITEM_STYLE', board.id, { id: item.id, tags: item.tags }, after)
    canvas.updateItem(board.id, item.id, { tags: after.tags })
    useHistoryStore.getState().markDirty()
  }

  const travelTo = (chamberId: string, itemId: string) => {
    const canvas = useCanvasStore.getState()
    if (chamberId !== canvas.activeBoardId) canvas.setActiveBoard(chamberId)
    const item = canvas.boards.find((b) => b.id === chamberId)?.items.find((i: CanvasItem) => i.id === itemId)
    if (!item) return
    const expandedRailWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-right-w') || '228')
    const sidebarW = activeArchiveRailWidth(useUIStore.getState().archiveRailCollapsed, expandedRailWidth)
    const scale = canvas.viewport().scale
    canvas.updateViewport({
      x: (window.innerWidth - sidebarW) / 2 - (item.x + item.width / 2) * scale,
      y: window.innerHeight / 2 - (item.y + item.height / 2) * scale,
    })
    canvas.setSelection([itemId])
  }

  const ingestFolder = async () => {
    const ipc = (window as IpcWindow).ipc
    const canvas = useCanvasStore.getState()
    const { activeBoardId } = canvas
    if (!ipc || !activeBoardId) return
    const result = (await ipc.invoke('assets:scanFolder')) as { folder: string | null; files: string[] }
    if (!result?.folder || result.files.length === 0) {
      if (result?.folder) inscribe('No media found in that folder')
      return
    }
    const viewport = canvas.viewport()
    const expandedRailWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-right-w') || '228')
    const sidebarW = activeArchiveRailWidth(useUIStore.getState().archiveRailCollapsed, expandedRailWidth)
    const origin = {
      x: ((window.innerWidth - sidebarW) / 2 - viewport.x) / viewport.scale,
      y: (window.innerHeight / 2 - viewport.y) / viewport.scale,
    }
    const items = buildIngestItems(result.files, origin)
    items.forEach((item) => {
      canvas.addItem(activeBoardId, item)
      useHistoryStore.getState().push('ITEM_ADD', activeBoardId, null, item)
    })
    canvas.setSelection(items.map((item) => item.id))
    useHistoryStore.getState().markDirty()
    inscribe(`Imported ${items.length} files`)
  }

  return (
    <div
      className="citadel-floating-panel"
      style={{
        position: 'absolute',
        top: 48,
        right: 'calc(var(--context-rail-w) + 8px)',
        width: 480,
        maxHeight: 'calc(100vh - 72px)',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 10,
        zIndex: 'var(--z-panels)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
        <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontFamily: 'var(--font-display)', color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Media review
        </h3>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            type="button"
            title="Import a folder of media into this board"
            onClick={() => { void ingestFolder() }}
            style={{ height: 22, background: 'var(--bg-ui)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', color: 'var(--text-accent)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', padding: '0 8px' }}
          >
            Import folder…
          </button>
          <button
            type="button"
            title="Close"
            onClick={() => useUIStore.getState().closePanel('archiveWorkbench')}
            style={{ width: 22, height: 22, background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-md)', padding: 0 }}
          >
            x
          </button>
        </div>
      </div>

      <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
        {model.summary.uncategorized} untagged · {model.summary.missingAssets} missing
      </div>

      <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {sectionTitle('Untagged items')}
        {model.uncategorizedRelics.length === 0 && (
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-md)' }}>
            Every item has a tag or a note.
          </span>
        )}
        {model.uncategorizedRelics.map((relic) => (
          <div key={relic.itemId} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 6, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
              <button
                type="button"
                title={`Go to ${relic.filename} in ${relic.chamberName}`}
                onClick={() => travelTo(relic.chamberId, relic.itemId)}
                style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 'var(--text-md)', overflow: 'hidden', textAlign: 'left', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: 0 }}
              >
                {relic.filename}
              </button>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                {relic.type} · {relic.chamberName}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {relic.suggestedSigils.map((sigil) => (
                <button
                  key={sigil}
                  type="button"
                  title={`Apply tag "${sigil}"`}
                  onClick={() => applySigil(relic, sigil)}
                  style={{ background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-accent)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', padding: '1px 7px' }}
                >
                  +{sigil}
                </button>
              ))}
            </div>
          </div>
        ))}

        {sectionTitle('Missing files')}
        {model.missingRelics.length === 0 && (
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-md)' }}>
            No files are missing from disk.
          </span>
        )}
        {model.missingRelics.map((missing) => (
          <div key={missing.src} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', border: '1px solid var(--accent-danger)', borderRadius: 'var(--radius-sm)', padding: '4px 6px' }}>
            <button
              type="button"
              title={`Travel to the first ${missing.filename} relic`}
              onClick={() => travelTo(missing.chamberIds[0], missing.itemIds[0])}
              style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', overflow: 'hidden', textAlign: 'left', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: 0 }}
            >
              {missing.filename}
            </button>
            <span style={{ color: 'var(--accent-danger)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
              ×{missing.itemIds.length}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
