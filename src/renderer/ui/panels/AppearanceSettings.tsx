import React, { useCallback, useEffect, useState } from 'react'
import {
  FONT_ROLES,
  FONT_ROLE_LABELS,
} from '../../../types/appearance'
import type { FontRole, UserFontsResult, UserSnippetsResult } from '../../../types/appearance'
import { refreshUserFonts, refreshUserSnippets } from '../../theme/userStyles'
import { mascotChoices, mascotLabels, useUIStore } from '../../store/uiStore'
import { CitadelMascot } from '../mascot/CitadelMascot'
import { MascotTower } from '../mascot/MascotTower'
import { inscribe } from '../toasts/inscriptionToastStore'

/**
 * Customisation, the way a vault does it: a folder of stylesheets and a folder
 * of fonts, both belonging to the person rather than to a project.
 *
 * Nothing here needs a plugin API, because the whole interface is CSS
 * variables. A snippet that sets `--accent` moves every accent in the app, the
 * canvas included.
 */

type Ipc = { invoke: (channel: string, args?: unknown) => Promise<unknown> }
const noBridge: Ipc = { invoke: async () => undefined }
const getIpc = (): Ipc => (window as unknown as { ipc?: Ipc }).ipc ?? noBridge

const buttonStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: 'var(--text-sm)',
  padding: '4px 7px',
  fontFamily: 'var(--font-body)',
  whiteSpace: 'nowrap',
}

const headingStyle: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: 'var(--text-md)',
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
}

const noteStyle: React.CSSProperties = {
  margin: '0 0 10px',
  fontSize: 'var(--text-sm)',
  fontFamily: 'var(--font-body)',
  color: 'var(--text-muted)',
}

export function formatSnippetSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}

export function AppearanceSettings(): React.ReactElement {
  const [styles, setStyles] = useState<UserSnippetsResult | null>(null)
  const [fonts, setFonts] = useState<UserFontsResult | null>(null)
  const mascot = useUIStore((s) => s.mascot)
  const setMascot = useUIStore((s) => s.setMascot)
  const setMascotImage = useUIStore((s) => s.setMascotImage)

  const reload = useCallback(async () => {
    setStyles(await refreshUserSnippets())
    setFonts(await refreshUserFonts())
  }, [])

  useEffect(() => { reload().catch(console.error) }, [reload])

  const toggle = (name: string, enabled: boolean): void => {
    void (async () => {
      await getIpc().invoke('styles:setEnabled', { name, enabled })
      await reload()
      inscribe(enabled ? `${name}.css applied` : `${name}.css switched off`)
    })()
  }

  const chooseFont = (role: FontRole, family: string): void => {
    void (async () => {
      await getIpc().invoke('fonts:setChoice', { role, family })
      await reload()
    })()
  }

  const chooseMascotImage = (): void => {
    void (async () => {
      const result = await getIpc().invoke('file:openDialog', {
        filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'] }],
      }) as { path?: string | null } | undefined
      if (result?.path) {
        setMascotImage(result.path)
        inscribe('Mascot image set')
      }
    })()
  }

  return (
    <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
      <h3 style={headingStyle}>Mascot</h3>
      <p style={noteStyle}>
        The figure on the project rail. It shows what the board is doing: lit on a save, red while a
        recording runs.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginBottom: 6 }}>
        {mascotChoices.map((choice) => (
          <button
            key={choice}
            type="button"
            aria-pressed={mascot === choice}
            onClick={() => (choice === 'custom' ? chooseMascotImage() : setMascot(choice))}
            style={{
              ...buttonStyle,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              borderColor: mascot === choice ? 'var(--accent)' : 'var(--border)',
              color: mascot === choice ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {/* Each button carries its own artwork. Two of these are towers, and
                a word is a poor way to tell them apart. Hidden from the
                accessibility tree: MascotTower is a labelled image in its own
                right, and its label would otherwise become the button's name. */}
            <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center' }}>
              {choice === 'tower' ? <CitadelMascot size={14} /> : null}
              {choice === 'rook' ? <MascotTower size={14} /> : null}
            </span>
            {mascotLabels[choice]}
          </button>
        ))}
      </div>
      <p style={{ ...noteStyle, marginBottom: 16 }}>
        Any image works for your own: it is read from where it sits, so keep it somewhere it will stay.
      </p>

      <h3 style={headingStyle}>Custom CSS</h3>
      <p style={noteStyle}>
        Every colour, size and edge in Citadel is a CSS variable, so a stylesheet of your own can
        change any of them. Drop .css files in the snippets folder and switch them on here. They are
        applied in the order you switch them on, after the theme.
      </p>

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => { void getIpc().invoke('styles:openFolder') }}
          style={buttonStyle}
        >
          Open snippets folder
        </button>
        <button type="button" onClick={() => { void reload() }} style={buttonStyle}>
          Reload
        </button>
      </div>

      {styles && styles.snippets.length === 0 ? (
        <div style={{ ...noteStyle, fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
          No .css files in {styles.folder}
        </div>
      ) : null}

      {styles?.snippets.map((snippet) => (
        <label
          key={snippet.name}
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            gap: 'var(--space-4)',
            alignItems: 'center',
            marginTop: 6,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={snippet.enabled}
            onChange={(event) => toggle(snippet.name, event.target.checked)}
          />
          <span style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
            {snippet.name}.css
          </span>
          <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {formatSnippetSize(snippet.bytes)}
          </span>
        </label>
      ))}

      <h3 style={{ ...headingStyle, marginTop: 16 }}>Fonts</h3>
      <p style={noteStyle}>
        Drop .woff2, .woff, .ttf or .otf files in the fonts folder to use them here, or type the name
        of any font already installed on this machine. Blank means the font Citadel ships with.
      </p>

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => { void getIpc().invoke('fonts:openFolder') }}
          style={buttonStyle}
        >
          Open fonts folder
        </button>
      </div>

      <datalist id="citadel-user-fonts">
        {fonts?.fonts.map((font) => <option key={font.family} value={font.family} />)}
      </datalist>

      {FONT_ROLES.map((role) => (
        <div
          key={role}
          style={{
            display: 'grid',
            gridTemplateColumns: '96px 1fr',
            gap: 'var(--space-4)',
            alignItems: 'center',
            marginTop: 6,
          }}
        >
          <label
            htmlFor={`font-role-${role}`}
            style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}
          >
            {FONT_ROLE_LABELS[role]}
          </label>
          <input
            id={`font-role-${role}`}
            list="citadel-user-fonts"
            placeholder="Citadel default"
            defaultValue={fonts?.choices?.[role] ?? ''}
            key={`${role}-${fonts?.choices?.[role] ?? ''}`}
            onBlur={(event) => chooseFont(role, event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
            style={{
              background: 'var(--bg-ui)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '5px 8px',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-base)',
              fontFamily: 'var(--font-body)',
              outline: 'none',
            }}
          />
        </div>
      ))}
    </div>
  )
}
