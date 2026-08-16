import React from 'react'
import { Actions } from '../../keybinds/actions'
import { resolver } from '../../keybinds/keybindResolver'
import { useUIStore } from '../../store/uiStore'
import { ToolIcon, type ToolIconName } from '../icons/ToolIcon'

type Step = {
  icon: ToolIconName
  title: string
  detail: string
  action?: { label: string; run: () => void }
}

function persistCompletion(): void {
  const ipc = (window as unknown as { ipc?: { invoke: (channel: string, payload: unknown) => Promise<unknown> } }).ipc
  void ipc?.invoke('settings:set', { key: 'ui.onboardingComplete', value: true })?.catch?.(() => {})
}

/**
 * First-run orientation, intentionally a small non-modal card instead of a
 * blocking tour. Existing projects remain openable with the usual menu and
 * shortcut while it is visible.
 */
export function Onboarding(): React.ReactElement | null {
  const visible = useUIStore((s) => s.panels.onboarding)
  const closePanel = useUIStore((s) => s.closePanel)

  if (!visible) return null

  const finish = () => {
    closePanel('onboarding')
    persistCompletion()
  }

  const steps: Step[] = [
    {
      icon: 'plus',
      title: 'Start with a board',
      detail: 'Pan with Space, then arrange items where they help you think.',
    },
    {
      icon: 'search',
      title: 'Bring in existing work',
      detail: 'Import files or open a saved Citadel project whenever you are ready.',
      action: { label: 'Open project', run: () => resolver.dispatch(Actions.OPEN) },
    },
    {
      icon: 'sticky',
      title: 'Write on the board',
      detail: 'Use a note for a thought, or a code card for a copyable snippet.',
      action: { label: 'Choose a tool', run: () => resolver.dispatch(Actions.TOOL_STICKY) },
    },
    {
      icon: 'search',
      title: 'Find connections',
      detail: 'Search scans every board. Ctrl/Cmd+K opens commands when you prefer the keyboard.',
      action: { label: 'Open search', run: () => resolver.dispatch(Actions.PANEL_SEARCH) },
    },
    {
      icon: 'select',
      title: 'Use overlay mode safely',
      detail: 'Window controls include opacity and click-through. Click-through always leaves a Stop panel and Ctrl+Alt+C exit.',
      action: {
        label: 'Show window controls',
        run: () => {
          if (useUIStore.getState().archiveRailCollapsed) resolver.dispatch(Actions.PANEL_ARCHIVE_RAIL_TOGGLE)
        },
      },
    },
  ]

  const run = (step: Step) => {
    step.action?.run()
    finish()
  }

  return (
    <aside
      aria-label="Getting started"
      style={{
        position: 'fixed',
        left: 20,
        bottom: 20,
        zIndex: 'var(--z-modal)' as unknown as number,
        width: 'min(400px, calc(100vw - 40px))',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        padding: 16,
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 650 }}>Welcome to Citadel</div>
          <div style={{ marginTop: 3, color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>A clear board for references, ideas, and working notes.</div>
        </div>
        <button type="button" aria-label="Dismiss getting started" title="Dismiss getting started" onClick={finish} style={{ border: 0, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}>
          <ToolIcon name="close" size={16} />
        </button>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {steps.map((step) => (
          <div key={step.title} style={{ display: 'grid', gridTemplateColumns: '18px 1fr auto', gap: 'var(--space-3)', alignItems: 'start' }}>
            <span style={{ color: 'var(--text-accent)', paddingTop: 1 }}><ToolIcon name={step.icon} size={15} /></span>
            <div>
              <div style={{ fontSize: 'var(--text-md)' }}>{step.title}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.35, marginTop: 2 }}>{step.detail}</div>
            </div>
            {step.action && <button type="button" onClick={() => run(step)} style={{ background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px 6px', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)' }}>{step.action.label}</button>}
          </div>
        ))}
      </div>
      <button type="button" onClick={finish} style={{ marginTop: 14, width: '100%', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px 8px', fontFamily: 'var(--font-body)', fontSize: 'var(--text-md)' }}>
        Continue to board
      </button>
    </aside>
  )
}
