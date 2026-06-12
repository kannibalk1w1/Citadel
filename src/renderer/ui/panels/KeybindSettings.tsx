import React, { useEffect, useMemo, useState } from 'react'
import { useUIStore } from '../../store/uiStore'
import type { ExportArea } from '../../store/uiStore'
import { exportPresets, type ExportPreset } from '../../store/uiStore'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { defaultKeybinds } from '../../keybinds/defaultKeybinds'
import { Actions } from '../../keybinds/actions'
import { prepareExportCanvas } from '../../export/exportCanvas'
import { describeExportPreview } from '../../export/exportPreviewModel'

const btnStyle: React.CSSProperties = {
  width: 22, height: 22,
  background: 'var(--bg-canvas)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
  borderRadius: 3,
  cursor: 'pointer',
  fontSize: 14,
  fontFamily: 'var(--font-mono)',
  padding: 0,
  lineHeight: 1,
}

type PreviewCacheStats = {
  count: number
  bytes: number
}

type AssetHealth = {
  total: number
  missing: number
  missingPaths: string[]
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

const getIpc = (): { invoke: (ch: string, args?: unknown) => Promise<unknown> } => (
  window as unknown as { ipc: { invoke: (ch: string, args?: unknown) => Promise<unknown> } }
).ipc

const exportAreas: { area: ExportArea; label: string }[] = [
  { area: 'viewport', label: 'Viewport' },
  { area: 'selection', label: 'Selection' },
  { area: 'board', label: 'Board' },
]

export function KeybindSettings(): React.ReactElement | null {
  const isOpen = useUIStore((s) => s.panels.keybindSettings)
  const togglePanel = useUIStore((s) => s.togglePanel)
  const [filter, setFilter] = useState('')
  const youSavedEnabled = useUIStore((s) => s.youSavedEnabled)
  const setYouSavedEnabled = useUIStore((s) => s.setYouSavedEnabled)
  const hyperTypeEnabled = useUIStore((s) => s.hyperTypeEnabled)
  const setHyperTypeEnabled = useUIStore((s) => s.setHyperTypeEnabled)
  const dragonCursorEnabled = useUIStore((s) => s.dragonCursorEnabled)
  const setDragonCursorEnabled = useUIStore((s) => s.setDragonCursorEnabled)
  const uiScale = useUIStore((s) => s.uiScale)
  const setUiScale = useUIStore((s) => s.setUiScale)
  const exportScale = useUIStore((s) => s.exportScale)
  const setExportScale = useUIStore((s) => s.setExportScale)
  const exportArea = useUIStore((s) => s.exportArea)
  const setExportArea = useUIStore((s) => s.setExportArea)
  const includeCommentsInExport = useUIStore((s) => s.includeCommentsInExport)
  const setIncludeCommentsInExport = useUIStore((s) => s.setIncludeCommentsInExport)
  const applyExportPreset = useUIStore((s) => s.applyExportPreset)
  const canvasBackground = useUIStore((s) => s.canvasBackground)
  const setCanvasBackground = useUIStore((s) => s.setCanvasBackground)
  const boards = useCanvasStore((s) => s.boards)
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const updateItem = useCanvasStore((s) => s.updateItem)
  const markDirty = useHistoryStore((s) => s.markDirty)
  const [cacheStats, setCacheStats] = useState<PreviewCacheStats | null>(null)
  const [assetHealth, setAssetHealth] = useState<AssetHealth | null>(null)
  const [cacheBusy, setCacheBusy] = useState(false)
  const [cacheMessage, setCacheMessage] = useState('')
  const [relinkBusy, setRelinkBusy] = useState(false)
  const [relinkMessage, setRelinkMessage] = useState('')
  const [exportPreview, setExportPreview] = useState<{ src: string; width: number; height: number } | null>(null)
  const [exportPreviewBusy, setExportPreviewBusy] = useState(false)
  const [exportPreviewError, setExportPreviewError] = useState('')

  const preservePaths = useMemo(() => (
    boards.flatMap((board) => board.items.map((item) => item.src).filter((src): src is string => Boolean(src)))
  ), [boards])
  const localAssetPaths = useMemo(() => (
    preservePaths.filter((src) => !/^(https?|data:|blob:|local:|file:)/i.test(src))
  ), [preservePaths])

  const loadCacheStats = async (assetPaths = localAssetPaths): Promise<void> => {
    try {
      const result = await getIpc().invoke('cache:previewStats')
      if (result && typeof result === 'object' && 'count' in result && 'bytes' in result) {
        setCacheStats(result as PreviewCacheStats)
      }
      const health = await getIpc().invoke('assets:checkPaths', { paths: assetPaths })
      if (health && typeof health === 'object' && 'total' in health && 'missing' in health && 'missingPaths' in health) {
        setAssetHealth(health as AssetHealth)
      }
    } catch (error) {
      console.error('Failed to read preview cache stats:', error)
      setCacheMessage('cache unavailable')
    }
  }

  const clearUnusedCache = async (): Promise<void> => {
    setCacheBusy(true)
    setCacheMessage('')
    try {
      const result = await getIpc().invoke('cache:clearUnusedPreviews', { preservePaths, assetPaths: localAssetPaths })
      if (result && typeof result === 'object' && 'stats' in result) {
        const payload = result as { deleted: number; bytes: number; stats: PreviewCacheStats }
        setCacheStats(payload.stats)
        setCacheMessage(payload.deleted === 0 ? 'nothing unused' : `cleared ${payload.deleted} / ${formatBytes(payload.bytes)}`)
      }
    } catch (error) {
      console.error('Failed to clear preview cache:', error)
      setCacheMessage('clear failed')
    } finally {
      setCacheBusy(false)
    }
  }

  const relinkMissingAssets = async (): Promise<void> => {
    if (!assetHealth?.missingPaths.length) return
    setRelinkBusy(true)
    setRelinkMessage('')
    try {
      const result = await getIpc().invoke('assets:relinkMissing', { missingPaths: assetHealth.missingPaths })
      const payload = result as { replacements?: Record<string, string>; scanned?: number }
      const replacements = payload.replacements ?? {}
      const entries = Object.entries(replacements)
      if (entries.length === 0) {
        setRelinkMessage(`no matches in ${payload.scanned ?? 0} files`)
        return
      }

      const replacementMap = new Map(entries)
      for (const board of boards) {
        for (const item of board.items) {
          if (item.src && replacementMap.has(item.src)) {
            updateItem(board.id, item.id, { src: replacementMap.get(item.src) })
          }
        }
      }
      markDirty()
      setRelinkMessage(`relinked ${entries.length}`)
      await loadCacheStats(localAssetPaths.map((path) => replacements[path] ?? path))
    } catch (error) {
      console.error('Failed to relink assets:', error)
      setRelinkMessage('relink failed')
    } finally {
      setRelinkBusy(false)
    }
  }

  const chooseCanvasBackground = async (): Promise<void> => {
    const result = await getIpc().invoke('file:openDialog', {
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }],
    })
    if (result && typeof result === 'object' && 'path' in result && typeof (result as { path?: unknown }).path === 'string') {
      setCanvasBackground({ ...canvasBackground, mode: 'custom', assetPath: (result as { path: string }).path })
    }
  }

  const generateExportPreview = async (): Promise<void> => {
    setExportPreviewBusy(true)
    setExportPreviewError('')
    try {
      const { canvas, width, height } = await prepareExportCanvas()
      setExportPreview({ src: canvas.toDataURL('image/png'), width, height })
    } catch (error) {
      console.error('Failed to generate export preview:', error)
      setExportPreview(null)
      setExportPreviewError('preview failed')
    } finally {
      setExportPreviewBusy(false)
    }
  }

  const useExportPreset = (preset: ExportPreset): void => {
    applyExportPreset(preset)
    setExportPreview(null)
    setExportPreviewError('')
  }

  useEffect(() => {
    if (isOpen) loadCacheStats().catch(console.error)
  }, [isOpen])

  if (!isOpen) return null

  const entries = Object.entries(defaultKeybinds).filter(([action]) =>
    !filter || action.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="citadel-floating-panel" style={{ position: 'fixed', inset: '60px 20px 20px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, zIndex: 'var(--z-modal)', overflow: 'auto', boxShadow: 'var(--shadow-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 14, fontFamily: 'var(--font-display)', color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          Keybindings
        </h2>
        <button
          onClick={() => togglePanel('keybindSettings')}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}
          title="Close"
        >
          ×
        </button>
      </div>
      <div style={{
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '1px solid var(--border)',
      }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Appearance
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
              Canvas background
            </div>
            <div title={canvasBackground.assetPath ?? undefined} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {canvasBackground.mode === 'custom' && canvasBackground.assetPath
                ? canvasBackground.assetPath.split(/[\\/]/).pop()
                : canvasBackground.mode}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCanvasBackground({ ...canvasBackground, mode: 'stone' })}
            aria-pressed={canvasBackground.mode === 'stone'}
            style={{
              ...btnStyle,
              width: 'auto',
              padding: '0 8px',
              fontSize: 11,
              background: canvasBackground.mode === 'stone' ? 'var(--accent)' : 'var(--bg-canvas)',
              color: canvasBackground.mode === 'stone' ? 'var(--bg-ui)' : 'var(--text-primary)',
            }}
          >
            Built-in
          </button>
          <button
            type="button"
            onClick={() => chooseCanvasBackground().catch(console.error)}
            aria-pressed={canvasBackground.mode === 'custom'}
            style={{
              ...btnStyle,
              width: 'auto',
              padding: '0 8px',
              fontSize: 11,
              background: canvasBackground.mode === 'custom' ? 'var(--accent)' : 'var(--bg-canvas)',
              color: canvasBackground.mode === 'custom' ? 'var(--bg-ui)' : 'var(--text-primary)',
            }}
          >
            Choose
          </button>
          <button
            type="button"
            onClick={() => setCanvasBackground({ ...canvasBackground, mode: 'none' })}
            aria-pressed={canvasBackground.mode === 'none'}
            style={{
              ...btnStyle,
              width: 'auto',
              padding: '0 8px',
              fontSize: 11,
              background: canvasBackground.mode === 'none' ? 'var(--accent)' : 'var(--bg-canvas)',
              color: canvasBackground.mode === 'none' ? 'var(--bg-ui)' : 'var(--text-primary)',
            }}
          >
            None
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'center', marginTop: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Opacity</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={canvasBackground.opacity}
              onChange={(e) => setCanvasBackground({ ...canvasBackground, opacity: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Scale</span>
            <input
              type="range"
              min={0.25}
              max={4}
              step={0.05}
              value={canvasBackground.scale}
              onChange={(e) => setCanvasBackground({ ...canvasBackground, scale: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={canvasBackground.repeat}
              onChange={(e) => setCanvasBackground({ ...canvasBackground, repeat: e.target.checked })}
              style={{ accentColor: 'var(--accent)' }}
            />
            Repeat
          </label>
        </div>
      </div>
      <div style={{
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '1px solid var(--border)',
      }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Fun Settings
        </h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={youSavedEnabled}
            onChange={(e) => setYouSavedEnabled(e.target.checked)}
            style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
            YOU SAVED banner on manual save
          </span>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            dark souls
          </span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 6 }}>
          <input
            type="checkbox"
            checked={hyperTypeEnabled}
            onChange={(e) => setHyperTypeEnabled(e.target.checked)}
            style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
            HyperType mode
          </span>
          <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginLeft: 'auto', textAlign: 'right' }}>
            by Thanh-Huy1104<br />MIT
          </span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 6 }}>
          <input
            type="checkbox"
            checked={dragonCursorEnabled}
            onChange={(e) => setDragonCursorEnabled(e.target.checked)}
            style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
            Dragon Scimitar cursor
          </span>
          <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginLeft: 'auto', textAlign: 'right' }}>
            rw-designer.com<br />CC Attribution / PD
          </span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-primary)', flex: 1 }}>
            UI Scale
          </span>
          <button
            type="button"
            onClick={() => setUiScale(uiScale - 0.25)}
            disabled={uiScale <= 0.75}
            aria-label="Decrease UI scale"
            style={{ ...btnStyle, opacity: uiScale <= 0.75 ? 0.35 : 1, cursor: uiScale <= 0.75 ? 'not-allowed' : 'pointer' }}
          >−</button>
          <span style={{ width: 36, textAlign: 'center', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {Math.round(uiScale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setUiScale(uiScale + 0.25)}
            disabled={uiScale >= 1.5}
            aria-label="Increase UI scale"
            style={{ ...btnStyle, opacity: uiScale >= 1.5 ? 0.35 : 1, cursor: uiScale >= 1.5 ? 'not-allowed' : 'pointer' }}
          >+</button>
        </div>
      </div>
      <div style={{
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '1px solid var(--border)',
      }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Export
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '132px 1fr auto',
          gap: 10,
          alignItems: 'center',
          marginBottom: 10,
          padding: 8,
          border: '1px solid var(--border)',
          borderRadius: 4,
          background: 'var(--bg-canvas)',
        }}>
          <div style={{
            width: 132,
            height: 74,
            border: '1px solid var(--border)',
            borderRadius: 3,
            background: 'var(--bg-ui)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {exportPreview ? (
              <img
                src={exportPreview.src}
                alt="Export preview"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                preview
              </span>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
              {describeExportPreview({ area: exportArea, scale: exportScale, includeComments: includeCommentsInExport, selectedCount: selectedIds.length })}
            </div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: exportPreviewError ? 'var(--accent-danger)' : 'var(--text-muted)', marginTop: 3 }}>
              {exportPreview
                ? `${exportPreview.width} x ${exportPreview.height}px source`
                : exportPreviewError || 'Generate a preview before exporting'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => generateExportPreview().catch(console.error)}
            disabled={exportPreviewBusy}
            style={{ ...btnStyle, width: 'auto', padding: '0 8px', fontSize: 11, opacity: exportPreviewBusy ? 0.45 : 1 }}
          >
            {exportPreviewBusy ? 'Rendering' : 'Preview'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
          {(Object.entries(exportPresets) as [ExportPreset, (typeof exportPresets)[ExportPreset]][]).map(([preset, settings]) => {
            const active = exportArea === settings.area
              && exportScale === settings.scale
              && includeCommentsInExport === settings.includeComments
            return (
              <button
                key={preset}
                type="button"
                onClick={() => useExportPreset(preset)}
                aria-pressed={active}
                title={`${settings.area} / ${settings.scale}x / comments ${settings.includeComments ? 'included' : 'hidden'}`}
                style={{
                  ...btnStyle,
                  width: '100%',
                  minHeight: 28,
                  fontSize: 10,
                  background: active ? 'var(--accent)' : 'var(--bg-canvas)',
                  color: active ? 'var(--bg-ui)' : 'var(--text-primary)',
                  textTransform: 'uppercase',
                }}
              >
                {settings.label}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-primary)', flex: 1 }}>
            Quality scale
          </span>
          {[1, 2, 3].map((scale) => (
            <button
              key={scale}
              type="button"
              onClick={() => setExportScale(scale)}
              aria-pressed={exportScale === scale}
              style={{
                ...btnStyle,
                width: 32,
                fontSize: 11,
                background: exportScale === scale ? 'var(--accent)' : 'var(--bg-canvas)',
                color: exportScale === scale ? 'var(--bg-ui)' : 'var(--text-primary)',
              }}
            >
              {scale}x
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-primary)', flex: 1 }}>
            Area
          </span>
          {exportAreas.map(({ area, label }) => (
            <button
              key={area}
              type="button"
              onClick={() => setExportArea(area)}
              aria-pressed={exportArea === area}
              title={area === 'board'
                ? 'Fit the active board before exporting'
                : area === 'selection'
                  ? 'Fit the selected items before exporting'
                  : 'Export the current visible canvas'}
              style={{
                ...btnStyle,
                width: 'auto',
                padding: '0 8px',
                fontSize: 11,
                background: exportArea === area ? 'var(--accent)' : 'var(--bg-canvas)',
                color: exportArea === area ? 'var(--bg-ui)' : 'var(--text-primary)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 8 }}>
          <input
            type="checkbox"
            checked={includeCommentsInExport}
            onChange={(e) => setIncludeCommentsInExport(e.target.checked)}
            style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
            Include comment pins
          </span>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            export
          </span>
        </label>
      </div>
      <div style={{
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '1px solid var(--border)',
      }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Maintenance
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
              Preview cache
            </div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 2 }}>
              {cacheStats ? `${cacheStats.count} files / ${formatBytes(cacheStats.bytes)} / ${preservePaths.length} referenced` : 'not loaded'}
              {cacheMessage ? ` - ${cacheMessage}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadCacheStats().catch(console.error)}
            disabled={cacheBusy}
            style={{ ...btnStyle, width: 'auto', padding: '0 8px', fontSize: 11, opacity: cacheBusy ? 0.45 : 1 }}
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => clearUnusedCache().catch(console.error)}
            disabled={cacheBusy}
            style={{ ...btnStyle, width: 'auto', padding: '0 8px', fontSize: 11, opacity: cacheBusy ? 0.45 : 1 }}
          >
            Clear unused
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center', marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
              Local asset health
            </div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: assetHealth?.missing ? 'var(--accent)' : 'var(--text-muted)', marginTop: 2 }}>
              {assetHealth ? `${assetHealth.total} checked / ${assetHealth.missing} missing` : 'not loaded'}
              {relinkMessage ? ` - ${relinkMessage}` : ''}
            </div>
          </div>
          {assetHealth?.missing ? (
            <span title={assetHealth.missingPaths.join('\n')} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-accent)' }}>
              inspect
            </span>
          ) : null}
          {assetHealth?.missing ? (
            <button
              type="button"
              onClick={() => relinkMissingAssets().catch(console.error)}
              disabled={relinkBusy}
              style={{ ...btnStyle, width: 'auto', padding: '0 8px', fontSize: 11, opacity: relinkBusy ? 0.45 : 1 }}
            >
              Relink folder
            </button>
          ) : null}
        </div>
      </div>
      <input
        placeholder="Filter actions…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ width: '100%', marginBottom: 12, background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 4, padding: '5px 8px', color: 'var(--text-primary)', fontSize: 12, outline: 'none' }}
      />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Action</th>
            <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Keys</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([action, keys]) => (
            <tr key={action} style={{ borderBottom: '1px solid var(--border-muted)' }}>
              <td style={{ padding: '5px 8px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{action}</td>
              <td style={{ padding: '5px 8px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {(keys as string[]).map((k) => (
                  <kbd key={k} style={{ background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px', marginRight: 4, fontSize: 10 }}>
                    {k}
                  </kbd>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
