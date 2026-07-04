import React, { useMemo } from 'react'
import { nanoid } from 'nanoid'
import type { CanvasItem } from '../../types'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { useUIStore } from '../store/uiStore'
import { pathToUrl } from '../utils/pathToUrl'
import { buildAssetLibrary, type AssetLibraryEntry } from './assetLibraryModel'

const previewTypes = new Set(['image', 'gif'])

function itemLabel(entry: AssetLibraryEntry): string {
  return `${entry.type} / ${entry.count} use${entry.count === 1 ? '' : 's'}`
}

function assetItemFromEntry(entry: AssetLibraryEntry): CanvasItem | undefined {
  return useCanvasStore.getState()
    .boards.find((board) => board.id === entry.firstBoardId)
    ?.items.find((item) => item.id === entry.firstItemId)
}

function focusAsset(entry: AssetLibraryEntry): void {
  const item = assetItemFromEntry(entry)
  if (!item) return
  const sidebarW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-right-w') || '228')
  const canvasW = window.innerWidth - sidebarW
  const canvas = useCanvasStore.getState()
  const viewport = canvas.viewport()
  canvas.setActiveBoard(entry.firstBoardId)
  canvas.setSelection([entry.firstItemId])
  canvas.updateViewport({
    x: canvasW / 2 - (item.x + item.width / 2) * viewport.scale,
    y: window.innerHeight / 2 - (item.y + item.height / 2) * viewport.scale,
  })
  useUIStore.getState().setSearchHighlight(entry.firstItemId)
  window.setTimeout(() => {
    if (useUIStore.getState().searchHighlightId === entry.firstItemId) {
      useUIStore.getState().setSearchHighlight(null)
    }
  }, 900)
}

function placeAsset(entry: AssetLibraryEntry): void {
  const source = assetItemFromEntry(entry)
  const { activeBoardId, addItem, setSelection, viewport } = useCanvasStore.getState()
  if (!source || !activeBoardId) return
  const vp = viewport()
  const sidebarW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-right-w') || '228')
  const canvasW = window.innerWidth - sidebarW
  const cx = (canvasW / 2 - vp.x) / vp.scale
  const cy = (window.innerHeight / 2 - vp.y) / vp.scale
  const copy: CanvasItem = {
    ...source,
    id: nanoid(),
    x: cx - source.width / 2,
    y: cy - source.height / 2,
    zIndex: Date.now(),
    locked: false,
  }
  addItem(activeBoardId, copy)
  useHistoryStore.getState().push('ITEM_ADD', activeBoardId, null, copy)
  setSelection([copy.id])
}

export function AssetLibrary(): React.ReactElement | null {
  const isOpen = useUIStore((s) => s.panels.assetLibrary)
  const closePanel = useUIStore((s) => s.closePanel)
  const boards = useCanvasStore((s) => s.boards)
  const assets = useMemo(() => buildAssetLibrary(boards), [boards])

  if (!isOpen) return null

  return (
    <div
      className="citadel-floating-panel"
      style={{
        position: 'absolute',
        top: 48,
        right: 'calc(var(--sidebar-right-w) + 8px)',
        width: 340,
        maxHeight: 'calc(100vh - 72px)',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: 10,
        zIndex: 'var(--z-panels)',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Assets
        </h3>
        <button
          onClick={() => closePanel('assetLibrary')}
          title="Close"
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
        >
          x
        </button>
      </div>

      {assets.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-body)' }}>
          No imported assets yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, overflowY: 'auto', paddingRight: 2 }}>
          {assets.map((entry) => (
            <div
              key={entry.src}
              className="citadel-list-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr auto',
                gap: 8,
                alignItems: 'center',
                border: '1px solid var(--border)',
                borderRadius: 5,
                padding: 6,
              }}
            >
              <button
                type="button"
                onClick={() => focusAsset(entry)}
                title="Jump to first use"
                style={{
                  width: 44,
                  height: 34,
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  background: 'var(--bg-ui)',
                  padding: 0,
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
              >
                {previewTypes.has(entry.type) ? (
                  <img src={pathToUrl(entry.src)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <span style={{ color: 'var(--text-accent)', fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                    {entry.type.slice(0, 3)}
                  </span>
                )}
              </button>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.filename}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                  {itemLabel(entry)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => placeAsset(entry)}
                title="Place another copy on active board"
                style={{
                  height: 24,
                  padding: '0 8px',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  background: 'var(--bg-ui)',
                  color: 'var(--text-secondary)',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                }}
              >
                Place
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
