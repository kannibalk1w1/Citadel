import React, { useEffect, useRef, useState } from 'react'
import { nanoid } from 'nanoid'
import { useUIStore } from '../store/uiStore'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { useMascotStore } from '../store/mascotStore'
import type { CanvasItem, ToolMode } from '../../types'
import { Actions } from '../keybinds/actions'
import { resolver } from '../keybinds/keybindResolver'
import { ToolIcon, type ToolIconName } from './icons/ToolIcon'
import { activeArchiveRailWidth } from './shell/shellModel'

type ToolDef = { mode: ToolMode; label: string; key: string; icon: ToolIconName }

function contextRailWidth(): number {
  const expandedRailWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-right-w') || '228')
  return activeArchiveRailWidth(useUIStore.getState().archiveRailCollapsed, expandedRailWidth)
}

const PRIMARY_TOOLS: ToolDef[] = [
  { mode: 'select', label: 'Select', key: 'V', icon: 'select' },
  { mode: 'pan', label: 'Pan', key: 'H', icon: 'pan' },
  { mode: 'lasso', label: 'Lasso', key: 'L', icon: 'lasso' },
  { mode: 'connect', label: 'Bind', key: 'C', icon: 'connect' },
  { mode: 'text', label: 'Text', key: 'T', icon: 'text' },
  { mode: 'sticky', label: 'Note', key: 'N', icon: 'sticky' },
]

const SPECIALIST_TOOLS: ToolDef[] = [
  { mode: 'link', label: 'Link', key: 'K', icon: 'link' },
  { mode: 'swatch', label: 'Swatch', key: 'W', icon: 'swatch' },
  { mode: 'tag', label: 'Tag', key: 'G', icon: 'tag' },
  { mode: 'comparison' as ToolMode, label: 'Comparison', key: 'P', icon: 'comparison' },
]

export function Toolbar(): React.ReactElement {
  const toolMode = useUIStore((s) => s.toolMode)
  const setToolMode = useUIStore((s) => s.setToolMode)
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const allItems = useCanvasStore((s) => s.items())
  const isRecording = useHistoryStore((s) => s.isRecording)
  const startRecording = useHistoryStore((s) => s.startRecording)
  const stopRecording = useHistoryStore((s) => s.stopRecording)
  const saveRecording = useHistoryStore((s) => s.saveRecording)
  const triggerEffect = useMascotStore((s) => s.triggerEffect)
  const clearEffect = useMascotStore((s) => s.clearEffect)
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const snapToGrid = useUIStore((s) => s.snapToGrid)
  const toggleSnapToGrid = useUIStore((s) => s.toggleSnapToGrid)

  const [youtubeOpen, setYoutubeOpen] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubeShake, setYoutubeShake] = useState(false)
  const [voiceRecording, setVoiceRecording] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const voiceRecorderRef = useRef<MediaRecorder | null>(null)
  const voiceStreamRef = useRef<MediaStream | null>(null)
  const voiceChunksRef = useRef<Blob[]>([])

  const isValidYouTubeUrl = (url: string): boolean =>
    url.includes('youtube.com') || url.includes('youtu.be')

  const closeYouTube = () => {
    setYoutubeOpen(false)
    setYoutubeUrl('')
  }

  useEffect(() => {
    if (!moreOpen) return
    const closeOnOutsidePress = (event: MouseEvent) => {
      if (toolbarRef.current?.contains(event.target as Node)) return
      setMoreOpen(false)
    }
    window.addEventListener('mousedown', closeOnOutsidePress)
    return () => window.removeEventListener('mousedown', closeOnOutsidePress)
  }, [moreOpen])

  const placeYouTube = () => {
    const url = youtubeUrl.trim()
    if (!url) return
    if (!isValidYouTubeUrl(url)) {
      setYoutubeShake(true)
      setTimeout(() => { setYoutubeShake(false); setYoutubeUrl('') }, 350)
      return
    }
    const vp = useCanvasStore.getState().viewport()
    const sidebarW = contextRailWidth()
    const canvasW = window.innerWidth - sidebarW
    const cx = (canvasW / 2 - vp.x) / vp.scale
    const cy = (window.innerHeight / 2 - vp.y) / vp.scale
    const boardId = useCanvasStore.getState().activeBoardId
    if (!boardId) return
    const item = {
      id: nanoid(),
      type: 'youtube' as const,
      x: cx - 240, y: cy - 135,
      width: 480, height: 270,
      rotation: 0, zIndex: Date.now(),
      locked: false, visible: true, opacity: 1,
      tags: [], src: url, meta: {},
    }
    useCanvasStore.getState().addItem(boardId, item)
    useHistoryStore.getState().push('ITEM_ADD', boardId, null, item)
    useCanvasStore.getState().setSelection([item.id])
    useUIStore.getState().setToolMode('select')
    triggerEffect('lightning-in', undefined, { x: item.x + item.width / 2, y: item.y + item.height / 2 })
    closeYouTube()
    setMoreOpen(false)
  }

  const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

  const addVoiceMemo = async (blob: Blob): Promise<void> => {
    const boardId = useCanvasStore.getState().activeBoardId
    if (!boardId) return
    const dataUrl = await blobToDataUrl(blob)
    const ipc = (window as unknown as { ipc: { invoke: (ch: string, args: unknown) => Promise<unknown> } }).ipc
    const result = await ipc.invoke('assets:saveDataUrl', {
      dataUrl,
      filename: `voice-memo-${Date.now()}.webm`,
    }) as { path?: string }
    if (!result.path) return

    const vp = useCanvasStore.getState().viewport()
    const sidebarW = contextRailWidth()
    const canvasW = window.innerWidth - sidebarW
    const cx = (canvasW / 2 - vp.x) / vp.scale
    const cy = (window.innerHeight / 2 - vp.y) / vp.scale
    const item: CanvasItem = {
      id: nanoid(),
      type: 'audio',
      x: cx - 160,
      y: cy - 40,
      width: 320,
      height: 80,
      rotation: 0,
      zIndex: Date.now(),
      locked: false,
      visible: true,
      opacity: 1,
      tags: ['voice'],
      src: result.path,
      meta: { memo: true, recordedAt: Date.now() },
    }
    useCanvasStore.getState().addItem(boardId, item)
    useHistoryStore.getState().push('ITEM_ADD', boardId, null, item)
    useCanvasStore.getState().setSelection([item.id])
    triggerEffect('lightning-in', undefined, { x: item.x + item.width / 2, y: item.y + item.height / 2 })
  }

  const stopVoiceMemo = () => {
    voiceRecorderRef.current?.stop()
  }

  const startVoiceMemo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      voiceChunksRef.current = []
      voiceStreamRef.current = stream
      voiceRecorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) voiceChunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        setVoiceRecording(false)
        voiceStreamRef.current?.getTracks().forEach((track) => track.stop())
        voiceStreamRef.current = null
        voiceRecorderRef.current = null
        const blob = new Blob(voiceChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        voiceChunksRef.current = []
        if (blob.size > 0) addVoiceMemo(blob).catch(console.error)
      }
      recorder.start()
      setVoiceRecording(true)
      triggerEffect('eye-open')
    } catch (error) {
      console.error('Voice memo recording failed:', error)
      triggerEffect('fracture')
    }
  }

  const SRC_TYPES = new Set(['image', 'gif', 'video'])
  const mergeSelectedToCompare = () => {
    const { activeBoardId, items, removeItems, addItem, setSelection } = useCanvasStore.getState()
    if (!activeBoardId || selectedIds.length !== 2) return
    const sel = items().filter((i) => selectedIds.includes(i.id))
    if (sel.length !== 2 || sel.some((i) => !i.src)) return
    const [a, b] = sel.sort((x, y) => x.x - y.x)
    const minX = Math.min(a.x, b.x)
    const minY = Math.min(a.y, b.y)
    const maxX = Math.max(a.x + a.width, b.x + b.width)
    const maxY = Math.max(a.y + a.height, b.y + b.height)
    const compare: CanvasItem = {
      id: nanoid(),
      type: 'comparison',
      x: minX, y: minY,
      width: maxX - minX, height: maxY - minY,
      rotation: 0, zIndex: Math.max(a.zIndex, b.zIndex),
      locked: false, visible: true, opacity: 1, tags: [],
      meta: { srcA: a.src, srcB: b.src, splitX: 0.5 },
    }
    useHistoryStore.getState().push('COMPARE_MERGE', activeBoardId, { items: [a, b] }, compare)
    removeItems(activeBoardId, selectedIds)
    addItem(activeBoardId, compare)
    setSelection([compare.id])
    setToolMode('select')
  }

  const canMergeToCompare = selectedIds.length === 2 &&
    allItems.filter((i) => selectedIds.includes(i.id)).every((i) => SRC_TYPES.has(i.type) && !!i.src)
  const canAutoArrange = allItems.filter((item) => selectedIds.includes(item.id) && !item.locked).length >= 2
  const hasSpecialistToolActive = SPECIALIST_TOOLS.some((tool) => tool.mode === toolMode)

  const handleRecord = () => {
    if (isRecording) {
      const session = stopRecording()
      if (session) saveRecording(session)
      clearEffect('eye-open')
      triggerEffect('eye-close')
    } else {
      startRecording(`Recording ${new Date().toLocaleTimeString()}`)
      triggerEffect('eye-open')
    }
  }

  return (
    <div
      className="citadel-toolbar"
      ref={toolbarRef}
      style={{
        position: 'absolute',
        top: 48,
        left: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '6px 4px',
        zIndex: 'var(--z-ui)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {PRIMARY_TOOLS.map(({ mode, label, key, icon }) => {
        const isMergeMode = mode === 'comparison' && canMergeToCompare
        return (
        <button
          key={mode}
          title={isMergeMode ? 'Merge to Compare item' : `${label} (${key})`}
          onClick={() => {
            if (isMergeMode) mergeSelectedToCompare()
            else setToolMode(mode)
            setMoreOpen(false)
          }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 4,
            border: isMergeMode ? '1.5px solid var(--accent)' : 'none',
            cursor: 'pointer',
            background: toolMode === mode ? 'var(--accent)' : 'transparent',
            color: toolMode === mode ? 'var(--bg-ui)' : isMergeMode ? 'var(--accent)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'var(--transition-fast)',
          }}
        >
          <ToolIcon name={icon} />
        </button>
        )
      })}

      <div style={{ height: 1, background: 'var(--border)', margin: '2px 4px' }} />

      <div className="citadel-toolbar-overflow">
        <button
          type="button"
          className="citadel-toolbar-overflow-trigger"
          title="More tools"
          aria-label="More tools"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((open) => !open)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 4,
            border: hasSpecialistToolActive || moreOpen ? '1px solid var(--accent)' : 'none',
            cursor: 'pointer',
            background: moreOpen ? 'var(--bg-hover)' : 'transparent',
            color: hasSpecialistToolActive || moreOpen ? 'var(--accent)' : 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ···
        </button>

        {moreOpen && (
          <div className="citadel-toolbar-overflow-menu">
            {SPECIALIST_TOOLS.map(({ mode, label, key, icon }) => {
              const isMergeMode = mode === 'comparison' && canMergeToCompare
              return (
                <button
                  key={mode}
                  title={isMergeMode ? 'Merge to Compare item' : `${label} (${key})`}
                  onClick={() => {
                    if (isMergeMode) mergeSelectedToCompare()
                    else setToolMode(mode)
                    setMoreOpen(false)
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 4,
                    border: isMergeMode ? '1.5px solid var(--accent)' : 'none',
                    cursor: 'pointer',
                    background: toolMode === mode ? 'var(--accent)' : 'transparent',
                    color: toolMode === mode ? 'var(--bg-ui)' : isMergeMode ? 'var(--accent)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'var(--transition-fast)',
                  }}
                >
                  <ToolIcon name={icon} />
                </button>
              )
            })}

      {/* ── YouTube ── */}
      <style>{`
        @keyframes ytShake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-4px); }
          40%      { transform: translateX(4px); }
          60%      { transform: translateX(-3px); }
          80%      { transform: translateX(3px); }
        }
      `}</style>

      <button
        title="YouTube Embed (paste URL)"
        onClick={() => youtubeOpen ? closeYouTube() : setYoutubeOpen(true)}
        style={{
          width: 36,
          height: 36,
          borderRadius: 4,
          border: 'none',
          cursor: 'pointer',
          background: youtubeOpen ? 'var(--accent)' : 'transparent',
          color: youtubeOpen ? 'var(--bg-ui)' : 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'var(--transition-fast)',
        }}
      >
        <ToolIcon name="youtube" />
      </button>

      {youtubeOpen && (
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4, padding: '2px 2px 4px' }}>
          <input
            autoFocus
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') placeYouTube()
              if (e.key === 'Escape') closeYouTube()
            }}
            placeholder="youtube.com/watch?v=…"
            style={{
              width: 148,
              background: 'var(--bg-ui)',
              border: '1px solid var(--border)',
              borderRadius: 3,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              padding: '4px 6px',
              outline: 'none',
              boxSizing: 'border-box',
              animation: youtubeShake ? 'ytShake 0.35s ease' : 'none',
            }}
          />
          <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
            Enter to place · Esc to cancel
          </span>
        </div>
      )}

      <button
        title={`Snap to Grid (Ctrl+Shift+G) — ${snapToGrid ? 'On' : 'Off'}`}
        onClick={toggleSnapToGrid}
        style={{
          width: 36,
          height: 36,
          borderRadius: 4,
          border: 'none',
          cursor: 'pointer',
          background: snapToGrid ? 'var(--accent)' : 'transparent',
          color: snapToGrid ? 'var(--bg-ui)' : 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'var(--transition-fast)',
        }}
      >
        <ToolIcon name="snap" />
      </button>

      <button
        title="Auto-arrange selection (Ctrl+Shift+A)"
        onClick={() => resolver.dispatch(Actions.AUTO_ARRANGE)}
        disabled={!canAutoArrange}
        style={{
          width: 36,
          height: 36,
          borderRadius: 4,
          border: 'none',
          cursor: canAutoArrange ? 'pointer' : 'not-allowed',
          background: 'transparent',
          color: canAutoArrange ? 'var(--text-secondary)' : 'var(--text-muted)',
          opacity: canAutoArrange ? 1 : 0.35,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'var(--transition-fast)',
        }}
      >
        <ToolIcon name="autoArrange" />
      </button>

      <div style={{ gridColumn: '1 / -1', height: 1, background: 'var(--border)', margin: '2px 4px' }} />

      <button
        title={isRecording ? 'Stop Recording' : 'Start Recording (R)'}
        onClick={handleRecord}
        style={{
          width: 36,
          height: 36,
          borderRadius: 4,
          border: 'none',
          cursor: 'pointer',
          background: isRecording ? 'rgba(139,32,32,0.25)' : 'transparent',
          color: isRecording ? 'var(--accent-danger)' : 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'var(--transition-fast)',
        }}
      >
        {isRecording ? (
          <ToolIcon name="recordStop" />
        ) : (
          <ToolIcon name="record" />
        )}
      </button>

      <button
        title={voiceRecording ? 'Stop voice memo' : 'Record voice memo'}
        onClick={() => {
          if (voiceRecording) stopVoiceMemo()
          else startVoiceMemo().catch(console.error)
        }}
        style={{
          width: 36,
          height: 36,
          borderRadius: 4,
          border: 'none',
          cursor: 'pointer',
          background: voiceRecording ? 'rgba(139,32,32,0.25)' : 'transparent',
          color: voiceRecording ? 'var(--accent-danger)' : 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'var(--transition-fast)',
        }}
      >
        <ToolIcon name="voice" />
      </button>

      <div style={{ gridColumn: '1 / -1', height: 1, background: 'var(--border)', margin: '2px 4px' }} />

      <button
        title="Presentation Mode (F5)"
        onClick={() => resolver.dispatch(Actions.PRESENTATION_TOGGLE)}
        style={{
          width: 36,
          height: 36,
          borderRadius: 4,
          border: 'none',
          cursor: 'pointer',
          background: 'transparent',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'var(--transition-fast)',
        }}
      >
        <ToolIcon name="presentation" />
      </button>

      <div style={{ gridColumn: '1 / -1', height: 1, background: 'var(--border)', margin: '2px 4px' }} />

      <button
        title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        style={{
          width: 36,
          height: 36,
          borderRadius: 4,
          border: 'none',
          cursor: 'pointer',
          background: 'transparent',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'var(--transition-fast)',
        }}
      >
        <ToolIcon name="theme" />
      </button>
          </div>
        )}
      </div>
    </div>
  )
}
