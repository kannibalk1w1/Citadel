import React, { useEffect, useMemo, useState } from 'react'
import {
  useUIStore,
  exportPresets,
  themeOverrideKeys,
  themePresetColors,
  themePresetLabels,
  themePresets,
  type ExportArea,
  type ExportPreset,
  type ThemePaletteFile,
  type ThemeOverrideKey,
  type ThemePreset,
  normalizeThemePaletteFile,
} from '../../store/uiStore'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { defaultKeybinds } from '../../keybinds/defaultKeybinds'
import { actionLabel } from '../../keybinds/actionLabels'
import { prepareExportCanvas } from '../../export/exportCanvas'
import { describeExportPreview } from '../../export/exportPreviewModel'

const btnStyle: React.CSSProperties = {
  width: 22, height: 22,
  background: 'var(--bg-canvas)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  fontSize: 'var(--text-lg)',
  fontFamily: 'var(--font-mono)',
  padding: 0,
  lineHeight: 1,
}

const paletteButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: 'var(--text-sm)',
  padding: '4px 7px',
  fontFamily: 'var(--font-body)',
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

const themeOverrideLabels: Record<ThemeOverrideKey, string> = {
  canvas: 'Canvas',
  ui: 'Chrome',
  panel: 'Panels',
  text: 'Text',
  accent: 'Accent',
}

export function KeybindSettings(): React.ReactElement | null {
  const isOpen = useUIStore((s) => s.panels.keybindSettings)
  const togglePanel = useUIStore((s) => s.togglePanel)
  const [filter, setFilter] = useState('')
  const [paletteName, setPaletteName] = useState('')
  const [paletteMessage, setPaletteMessage] = useState('')
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const themeOverrides = useUIStore((s) => s.themeOverrides)
  const setThemeOverrides = useUIStore((s) => s.setThemeOverrides)
  const resetThemeOverrides = useUIStore((s) => s.resetThemeOverrides)
  const savedThemePalettes = useUIStore((s) => s.savedThemePalettes)
  const saveThemePalette = useUIStore((s) => s.saveThemePalette)
  const applyThemePalette = useUIStore((s) => s.applyThemePalette)
  const removeThemePalette = useUIStore((s) => s.removeThemePalette)
  const importThemePalette = useUIStore((s) => s.importThemePalette)
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

  const saveCurrentPalette = (): void => {
    if (saveThemePalette(paletteName)) {
      setPaletteName('')
      setPaletteMessage('palette saved locally')
    } else {
      setPaletteMessage('name the palette first')
    }
  }

  const exportCurrentPalette = async (): Promise<void> => {
    const name = paletteName.trim() || 'Citadel palette'
    const filename = name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'citadel-palette'
    const result = await getIpc().invoke('file:saveDialog', {
      defaultName: `${filename}.citadel-theme.json`,
      filters: [{ name: 'Citadel Theme', extensions: ['citadel-theme.json', 'json'] }],
    }) as { path?: string | null }
    if (!result?.path) return
    const palette: ThemePaletteFile = { format: 'citadel-theme', version: 1, name, theme, overrides: themeOverrides }
    const saved = await getIpc().invoke('file:save', { path: result.path, data: JSON.stringify(palette, null, 2) }) as { ok?: boolean }
    setPaletteMessage(saved?.ok ? 'palette exported' : 'could not export palette')
  }

  const importPalette = async (): Promise<void> => {
    const result = await getIpc().invoke('file:openDialog', {
      filters: [{ name: 'Citadel Theme', extensions: ['citadel-theme.json', 'json'] }],
    }) as { path?: string | null }
    if (!result?.path) return
    try {
      const loaded = await getIpc().invoke('file:load', { path: result.path }) as { data?: string }
      const palette = normalizeThemePaletteFile(loaded.data ? JSON.parse(loaded.data) : null)
      if (!palette) {
        setPaletteMessage('not a valid Citadel theme')
        return
      }
      importThemePalette(palette)
      setPaletteMessage(`applied ${palette.name}`)
    } catch {
      setPaletteMessage('could not import palette')
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

  const entries = Object.entries(defaultKeybinds).filter(([action]) => {
    if (!filter) return true
    const needle = filter.toLowerCase()
    // Match the plain name the user reads and the identifier they may know.
    return action.toLowerCase().includes(needle) || actionLabel(action).toLowerCase().includes(needle)
  })

  return (
    <div className="citadel-floating-panel" style={{ position: 'fixed', inset: '60px 20px 20px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16, zIndex: 'var(--z-modal)', overflow: 'auto', boxShadow: 'var(--shadow-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 'var(--text-lg)', fontFamily: 'var(--font-display)', color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          Keybindings
        </h2>
        <button
          onClick={() => togglePanel('keybindSettings')}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 'var(--text-xl)', lineHeight: 1, padding: '2px 4px' }}
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
        <h3 style={{ margin: '0 0 8px', fontSize: 'var(--text-md)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Appearance
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 148px', gap: 'var(--space-4)', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
              Interface theme
            </div>
            <div style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 2 }}>
              Select a starting palette, then tune its core colours below.
            </div>
          </div>
          <select
            value={theme}
            onChange={(event) => setTheme(event.target.value as ThemePreset)}
            aria-label="Interface theme"
            style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '5px 7px', fontSize: 'var(--text-md)', fontFamily: 'var(--font-body)' }}
          >
            {themePresets.map((preset) => <option key={preset} value={preset}>{themePresetLabels[preset]}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'end', gap: 'var(--space-4)', marginBottom: 12 }}>
          {themeOverrideKeys.map((key) => (
            <label key={key} title={`${themeOverrideLabels[key]} colour`} style={{ display: 'grid', gap: 'var(--space-2)', color: 'var(--text-muted)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
              {themeOverrideLabels[key]}
              <input
                type="color"
                value={themeOverrides[key] ?? themePresetColors[theme][key]}
                onChange={(event) => setThemeOverrides({ [key]: event.target.value })}
                aria-label={`${themeOverrideLabels[key]} colour`}
                style={{ width: 28, height: 24, padding: 1, background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
              />
            </label>
          ))}
          <button
            type="button"
            onClick={resetThemeOverrides}
            disabled={Object.keys(themeOverrides).length === 0}
            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 'var(--text-sm)', padding: '4px 6px', fontFamily: 'var(--font-body)' }}
          >
            Reset colours
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) auto auto auto', gap: 'var(--space-3)', alignItems: 'center', marginBottom: savedThemePalettes.length > 0 ? 8 : 12 }}>
          <input
            value={paletteName}
            onChange={(event) => { setPaletteName(event.target.value); setPaletteMessage('') }}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); saveCurrentPalette() } }}
            placeholder="Palette name"
            aria-label="Palette name"
            maxLength={48}
            style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '5px 7px', fontSize: 'var(--text-md)', fontFamily: 'var(--font-body)' }}
          />
          <button type="button" onClick={saveCurrentPalette} style={paletteButtonStyle}>Save</button>
          <button type="button" onClick={() => exportCurrentPalette().catch(console.error)} style={paletteButtonStyle}>Export…</button>
          <button type="button" onClick={() => importPalette().catch(console.error)} style={paletteButtonStyle}>Import…</button>
        </div>
        {paletteMessage && <div style={{ margin: '-4px 0 8px', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>{paletteMessage}</div>}
        {savedThemePalettes.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 12 }}>
            {savedThemePalettes.map((palette) => (
              <div key={palette.id} style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                <button type="button" onClick={() => { applyThemePalette(palette.id); setPaletteMessage(`applied ${palette.name}`) }} style={{ ...paletteButtonStyle, border: 0, borderRadius: 0 }}>
                  {palette.name}
                </button>
                <button type="button" aria-label={`Delete ${palette.name}`} title={`Delete ${palette.name}`} onClick={() => removeThemePalette(palette.id)} style={{ ...paletteButtonStyle, border: 0, borderLeft: '1px solid var(--border)', borderRadius: 0, padding: '4px 6px', color: 'var(--text-muted)' }}>×</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 'var(--space-4)', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
              Canvas background
            </div>
            <div title={canvasBackground.assetPath ?? undefined} style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {canvasBackground.mode === 'custom' && canvasBackground.assetPath
                ? canvasBackground.assetPath.split(/[\\/]/).pop()
                : canvasBackground.mode}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCanvasBackground({ ...canvasBackground, mode: 'dots' })}
            aria-pressed={canvasBackground.mode === 'dots'}
            style={{
              ...btnStyle,
              width: 'auto',
              padding: '0 8px',
              fontSize: 'var(--text-md)',
              background: canvasBackground.mode === 'dots' ? 'var(--accent)' : 'var(--bg-canvas)',
              color: canvasBackground.mode === 'dots' ? 'var(--bg-ui)' : 'var(--text-primary)',
            }}
          >
            Dots
          </button>
          <button
            type="button"
            onClick={() => setCanvasBackground({ ...canvasBackground, mode: 'flat' })}
            aria-pressed={canvasBackground.mode === 'flat'}
            style={{
              ...btnStyle,
              width: 'auto',
              padding: '0 8px',
              fontSize: 'var(--text-md)',
              background: canvasBackground.mode === 'flat' ? 'var(--accent)' : 'var(--bg-canvas)',
              color: canvasBackground.mode === 'flat' ? 'var(--bg-ui)' : 'var(--text-primary)',
            }}
          >
            Flat
          </button>
          <button
            type="button"
            onClick={() => chooseCanvasBackground().catch(console.error)}
            aria-pressed={canvasBackground.mode === 'custom'}
            style={{
              ...btnStyle,
              width: 'auto',
              padding: '0 8px',
              fontSize: 'var(--text-md)',
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
              fontSize: 'var(--text-md)',
              background: canvasBackground.mode === 'none' ? 'var(--accent)' : 'var(--bg-canvas)',
              color: canvasBackground.mode === 'none' ? 'var(--bg-ui)' : 'var(--text-primary)',
            }}
          >
            None
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 'var(--space-5)', alignItems: 'center', marginTop: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Opacity</span>
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
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Scale</span>
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
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--text-md)', fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
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
      <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginTop: 6 }}>
          <span style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-body)', color: 'var(--text-primary)', flex: 1 }}>
            UI Scale
          </span>
          <button
            type="button"
            onClick={() => setUiScale(uiScale - 0.25)}
            disabled={uiScale <= 0.75}
            aria-label="Decrease UI scale"
            style={{ ...btnStyle, opacity: uiScale <= 0.75 ? 0.35 : 1, cursor: uiScale <= 0.75 ? 'not-allowed' : 'pointer' }}
          >−</button>
          <span style={{ width: 36, textAlign: 'center', fontSize: 'var(--text-md)', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
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
        <h3 style={{ margin: '0 0 8px', fontSize: 'var(--text-md)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Export
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '132px 1fr auto',
          gap: 'var(--space-5)',
          alignItems: 'center',
          marginBottom: 10,
          padding: 8,
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-canvas)',
        }}>
          <div style={{
            width: 132,
            height: 74,
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
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
              <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                preview
              </span>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
              {describeExportPreview({ area: exportArea, scale: exportScale, includeComments: includeCommentsInExport, selectedCount: selectedIds.length })}
            </div>
            <div style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: exportPreviewError ? 'var(--accent-danger)' : 'var(--text-muted)', marginTop: 3 }}>
              {exportPreview
                ? `${exportPreview.width} x ${exportPreview.height}px source`
                : exportPreviewError || 'Generate a preview before exporting'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => generateExportPreview().catch(console.error)}
            disabled={exportPreviewBusy}
            style={{ ...btnStyle, width: 'auto', padding: '0 8px', fontSize: 'var(--text-md)', opacity: exportPreviewBusy ? 0.45 : 1 }}
          >
            {exportPreviewBusy ? 'Rendering' : 'Preview'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 10 }}>
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
                  fontSize: 'var(--text-sm)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <span style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-body)', color: 'var(--text-primary)', flex: 1 }}>
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
                fontSize: 'var(--text-md)',
                background: exportScale === scale ? 'var(--accent)' : 'var(--bg-canvas)',
                color: exportScale === scale ? 'var(--bg-ui)' : 'var(--text-primary)',
              }}
            >
              {scale}x
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginTop: 8 }}>
          <span style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-body)', color: 'var(--text-primary)', flex: 1 }}>
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
                fontSize: 'var(--text-md)',
                background: exportArea === area ? 'var(--accent)' : 'var(--bg-canvas)',
                color: exportArea === area ? 'var(--bg-ui)' : 'var(--text-primary)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', cursor: 'pointer', marginTop: 8 }}>
          <input
            type="checkbox"
            checked={includeCommentsInExport}
            onChange={(e) => setIncludeCommentsInExport(e.target.checked)}
            style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
            Include comment pins
          </span>
          <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            export
          </span>
        </label>
      </div>
      <div style={{
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '1px solid var(--border)',
      }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 'var(--text-md)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Maintenance
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 'var(--space-4)', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
              Preview cache
            </div>
            <div style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 2 }}>
              {cacheStats ? `${cacheStats.count} files / ${formatBytes(cacheStats.bytes)} / ${preservePaths.length} referenced` : 'not loaded'}
              {cacheMessage ? ` - ${cacheMessage}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadCacheStats().catch(console.error)}
            disabled={cacheBusy}
            style={{ ...btnStyle, width: 'auto', padding: '0 8px', fontSize: 'var(--text-md)', opacity: cacheBusy ? 0.45 : 1 }}
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => clearUnusedCache().catch(console.error)}
            disabled={cacheBusy}
            style={{ ...btnStyle, width: 'auto', padding: '0 8px', fontSize: 'var(--text-md)', opacity: cacheBusy ? 0.45 : 1 }}
          >
            Clear unused
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 'var(--space-4)', alignItems: 'center', marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
              Local asset health
            </div>
            <div style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: assetHealth?.missing ? 'var(--accent)' : 'var(--text-muted)', marginTop: 2 }}>
              {assetHealth ? `${assetHealth.total} checked / ${assetHealth.missing} missing` : 'not loaded'}
              {relinkMessage ? ` - ${relinkMessage}` : ''}
            </div>
          </div>
          {assetHealth?.missing ? (
            <span title={assetHealth.missingPaths.join('\n')} style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: 'var(--text-accent)' }}>
              inspect
            </span>
          ) : null}
          {assetHealth?.missing ? (
            <button
              type="button"
              onClick={() => relinkMissingAssets().catch(console.error)}
              disabled={relinkBusy}
              style={{ ...btnStyle, width: 'auto', padding: '0 8px', fontSize: 'var(--text-md)', opacity: relinkBusy ? 0.45 : 1 }}
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
        style={{ width: '100%', marginBottom: 12, background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '5px 8px', color: 'var(--text-primary)', fontSize: 'var(--text-base)', outline: 'none' }}
      />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-md)' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Action</th>
            <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Keys</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([action, keys]) => (
            <tr key={action} style={{ borderBottom: '1px solid var(--border-muted)' }}>
              <td style={{ padding: '5px 8px', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>{actionLabel(action)}</span>
                <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{action}</span>
              </td>
              <td style={{ padding: '5px 8px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {(keys as string[]).map((k) => (
                  <kbd key={k} style={{ background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1px 5px', marginRight: 4, fontSize: 'var(--text-sm)' }}>
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
