import React from 'react'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'
import { useMascotStore } from '../store/mascotStore'
import type { ToolMode } from '../../types'

type ToolDef = { mode: ToolMode; label: string; key: string; icon: React.ReactElement }

const S = { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const TOOLS: ToolDef[] = [
  {
    mode: 'select', label: 'Select', key: 'V',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
        <path d="M3.5 2 L3.5 14 L7 10.5 L9.5 16 L11.2 15.2 L8.7 9.7 L13 9.7 Z" />
      </svg>
    ),
  },
  {
    mode: 'pan', label: 'Pan', key: 'H',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" {...S}>
        <path d="M9 7V3M9 3L7 5M9 3L11 5" />
        <path d="M9 11V15M9 15L7 13M9 15L11 13" />
        <path d="M7 9H3M3 9L5 7M3 9L5 11" />
        <path d="M11 9H15M15 9L13 7M15 9L13 11" />
      </svg>
    ),
  },
  {
    mode: 'lasso', label: 'Lasso', key: 'L',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" {...S}>
        <path d="M9 4C6 4 4 6 4 8.5C4 11 6 13 9 13C12 13 14 11 14 8.5C14 6 12 4 9 4Z" strokeDasharray="2.5 2" />
        <path d="M9 13L8 17" />
        <path d="M9 13L10 17" />
      </svg>
    ),
  },
  {
    mode: 'connect', label: 'Connect', key: 'C',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" {...S}>
        <circle cx="4" cy="9" r="2.5" />
        <circle cx="14" cy="9" r="2.5" />
        <line x1="6.5" y1="9" x2="10" y2="9" />
        <polyline points="9.5,7 12,9 9.5,11" fill="currentColor" />
      </svg>
    ),
  },
  {
    mode: 'text', label: 'Text', key: 'T',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
        <rect x="3" y="3" width="12" height="2" rx="1" />
        <rect x="8" y="3" width="2" height="12" rx="1" />
      </svg>
    ),
  },
  {
    mode: 'sticky', label: 'Sticky', key: 'N',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" {...S}>
        <path d="M3 3H11L15 7V15H3Z" />
        <path d="M11 3V7H15" />
        <line x1="6" y1="10" x2="12" y2="10" />
        <line x1="6" y1="12.5" x2="10" y2="12.5" />
      </svg>
    ),
  },
  {
    mode: 'link', label: 'Link', key: 'K',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" {...S}>
        <path d="M7.5 11.5L10.5 8.5" />
        <path d="M5.5 9.5L4 11C2.5 12.5 2.5 15 4 16.5S7.5 18 9 16.5L10.5 15" />
        <path d="M12.5 8.5L14 7C15.5 5.5 15.5 3 14 1.5S10.5 0 9 1.5L7.5 3" />
      </svg>
    ),
  },
  {
    mode: 'swatch', label: 'Swatch', key: 'W',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18">
        <rect x="2" y="3" width="3.5" height="12" rx="1" fill="#c87060" />
        <rect x="6.5" y="3" width="3" height="12" rx="1" fill="#c8a060" />
        <rect x="10.5" y="3" width="3" height="12" rx="1" fill="#60a8c8" />
        <rect x="14.5" y="3" width="1.5" height="12" rx="1" fill="#80c870" />
      </svg>
    ),
  },
  {
    mode: 'tag', label: 'Tag', key: 'G',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" {...S}>
        <path d="M3 3H10L15 9L10 15H3V3Z" />
        <circle cx="6.5" cy="9" r="1.5" fill="currentColor" fillOpacity="0.6" stroke="none" />
      </svg>
    ),
  },
]

export function Toolbar(): React.ReactElement {
  const toolMode = useUIStore((s) => s.toolMode)
  const setToolMode = useUIStore((s) => s.setToolMode)
  const isRecording = useHistoryStore((s) => s.isRecording)
  const startRecording = useHistoryStore((s) => s.startRecording)
  const stopRecording = useHistoryStore((s) => s.stopRecording)
  const saveRecording = useHistoryStore((s) => s.saveRecording)
  const triggerEffect = useMascotStore((s) => s.triggerEffect)
  const clearEffect = useMascotStore((s) => s.clearEffect)
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)

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
      {TOOLS.map(({ mode, label, key, icon }) => (
        <button
          key={mode}
          title={`${label} (${key})`}
          onClick={() => setToolMode(mode)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 4,
            border: 'none',
            cursor: 'pointer',
            background: toolMode === mode ? 'var(--accent)' : 'transparent',
            color: toolMode === mode ? 'var(--bg-ui)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'var(--transition-fast)',
          }}
        >
          {icon}
        </button>
      ))}

      <div style={{ height: 1, background: 'var(--border)', margin: '2px 4px' }} />

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
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
          <circle cx="9" cy="9" r={isRecording ? 5 : 6} />
          {isRecording && <rect x="5.5" y="5.5" width="7" height="7" rx="1" fill="var(--bg-ui)" />}
        </svg>
      </button>

      <div style={{ height: 1, background: 'var(--border)', margin: '2px 4px' }} />

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
        {theme === 'dark' ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <circle cx="8" cy="8" r="3" />
            <line x1="8" y1="1" x2="8" y2="2.5" />
            <line x1="8" y1="13.5" x2="8" y2="15" />
            <line x1="1" y1="8" x2="2.5" y2="8" />
            <line x1="13.5" y1="8" x2="15" y2="8" />
            <line x1="3.05" y1="3.05" x2="4.1" y2="4.1" />
            <line x1="11.9" y1="11.9" x2="12.95" y2="12.95" />
            <line x1="12.95" y1="3.05" x2="11.9" y2="4.1" />
            <line x1="4.1" y1="11.9" x2="3.05" y2="12.95" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.5 10.5A6 6 0 0 1 5.5 2.5a6 6 0 1 0 8 8z" />
          </svg>
        )}
      </button>
    </div>
  )
}
