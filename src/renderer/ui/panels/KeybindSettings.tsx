import React, { useState } from 'react'
import { useUIStore } from '../../store/uiStore'
import { defaultKeybinds } from '../../keybinds/defaultKeybinds'
import { Actions } from '../../keybinds/actions'

export function KeybindSettings(): React.ReactElement | null {
  const isOpen = useUIStore((s) => s.panels.keybindSettings)
  const [filter, setFilter] = useState('')
  const youSavedEnabled = useUIStore((s) => s.youSavedEnabled)
  const setYouSavedEnabled = useUIStore((s) => s.setYouSavedEnabled)

  if (!isOpen) return null

  const entries = Object.entries(defaultKeybinds).filter(([action]) =>
    !filter || action.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div style={{ position: 'fixed', inset: '60px 20px 20px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, zIndex: 'var(--z-modal)', overflow: 'auto', boxShadow: 'var(--shadow-lg)' }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 14, fontFamily: 'var(--font-display)', color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
        Keybindings
      </h2>
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
