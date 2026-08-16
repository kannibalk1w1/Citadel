import React, { useEffect, useState } from 'react'
import { useHistoryStore } from '../store/historyStore'
import { useUIStore } from '../store/uiStore'
import { resolver } from '../keybinds/keybindResolver'
import { Actions } from '../keybinds/actions'
import { getCurrentFilePath, getRecentProjects, getSaveActivity, openRecentProject, type RecentProject, type SaveActivity } from '../utils/projectFile'
import { inscribe } from './toasts/inscriptionToastStore'
import { ToolIcon } from './icons/ToolIcon'

// ── App badge ─────────────────────────────────────────────────────────────────
function AppBadge(): React.ReactElement {
  return (
    <div aria-label="Citadel" style={{ width: 38, height: 38, display: 'grid', placeItems: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16 }}>
      C
    </div>
  )
}

// ── Quick-action button ────────────────────────────────────────────────────────
// Window modes: the PureRef-style workflow of keeping references above the app
// you are drawing in. Click-through is last and marked, because it is the one
// that takes the mouse away from Citadel entirely.
function WindowModes(): React.ReactElement {
  const alwaysOnTop = useUIStore((s) => s.windowAlwaysOnTop)
  const opacity = useUIStore((s) => s.windowOpacity)
  const clickThrough = useUIStore((s) => s.windowClickThrough)
  const applyWindowMode = useUIStore((s) => s.applyWindowMode)

  return (
    <div className="citadel-sidebar-section">
      <div className="citadel-sidebar-section-title">Window</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%' }}>
        <QuickBtn
          label="On top"
          pressed={alwaysOnTop}
          title="Keep Citadel above other windows (Ctrl+Alt+T)"
          onClick={() => applyWindowMode({ alwaysOnTop: !alwaysOnTop })}
        />
        <label
          title="Window opacity — references stay readable over the app beneath"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}
        >
          <span>Opacity</span>
          <input
            type="range"
            min={30}
            max={100}
            step={5}
            value={Math.round(opacity * 100)}
            onChange={(e) => applyWindowMode({ opacity: Number(e.target.value) / 100 })}
            style={{ flex: 1, accentColor: 'var(--accent)' }}
          />
          <span style={{ minWidth: 26, textAlign: 'right' }}>{Math.round(opacity * 100)}%</span>
        </label>
        <QuickBtn
          label="Click through"
          pressed={clickThrough}
          title={clickThrough
            ? 'Clicks are passing through — press Ctrl+Alt+C to take the mouse back'
            : 'Let clicks reach the app underneath (Ctrl+Alt+C to undo)'}
          onClick={() => applyWindowMode({ clickThrough: !clickThrough })}
        />
      </div>
    </div>
  )
}

// `pressed` marks a mode that is currently on. It drives aria-pressed and a
// check mark, so the state is not carried by colour alone.
function QuickBtn({
  label, title, onClick, pressed,
}: { label: React.ReactNode; title: string; onClick: () => void; pressed?: boolean }): React.ReactElement {
  return (
    <button
      type="button"
      className="citadel-panel-button"
      title={title}
      aria-pressed={pressed}
      onClick={onClick}
      style={{
        width: '100%',
        padding: '5px 0',
        background: 'var(--bg-ui)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-secondary)',
        fontSize: 'var(--text-md)',
        fontFamily: 'var(--font-body)',
        cursor: 'pointer',
        transition: 'var(--transition-fast)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)'
        e.currentTarget.style.color = 'var(--text-accent)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.color = 'var(--text-secondary)'
      }}
    >
      {label}
      {pressed && <ToolIcon name="check" size={12} />}
    </button>
  )
}

// ── Status strip ───────────────────────────────────────────────────────────────
function StatusLine(): React.ReactElement {
  const isRecording = useHistoryStore((s) => s.isRecording)
  const isDirty = useHistoryStore((s) => s.isDirty())
  const snapToGrid = useUIStore((s) => s.snapToGrid)
  const [projectPath, setProjectPath] = useState(getCurrentFilePath())
  const [saveActivity, setSaveActivity] = useState<SaveActivity>(getSaveActivity())

  useEffect(() => {
    const refresh = () => setProjectPath(getCurrentFilePath())
    window.addEventListener('citadel:projectPathChanged', refresh)
    return () => window.removeEventListener('citadel:projectPathChanged', refresh)
  }, [])

  useEffect(() => {
    const refresh = () => setSaveActivity(getSaveActivity())
    window.addEventListener('citadel:saveActivityChanged', refresh)
    return () => window.removeEventListener('citadel:saveActivityChanged', refresh)
  }, [])

  const projectName = projectPath?.split(/[\\/]/).pop() ?? 'Unsaved'
  const needsSave = isDirty || !projectPath
  const fmtTime = (ts: number | null) => ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'not yet'
  const stateLabel = needsSave ? 'needs saving' : `saved ${fmtTime(saveActivity.lastManualSaveAt)}`

  return (
    <div className="citadel-status-strip" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {[
        { label: 'File', val: projectName, color: needsSave ? 'var(--text-accent)' : 'var(--text-secondary)' },
        { label: 'State', val: stateLabel, color: needsSave ? 'var(--accent)' : 'var(--text-muted)' },
        { label: 'Snap', val: snapToGrid ? 'on' : 'off',  color: snapToGrid ? 'var(--accent)' : 'var(--text-muted)' },
        ...(isRecording ? [{ label: 'Rec', val: 'live', color: 'var(--accent-danger)' }] : []),
      ].map(({ label, val, color }) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={statLabel}>{label}</span>
          <span style={{ ...statVal, color, maxWidth: 84, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</span>
        </div>
      ))}
    </div>
  )
}

const statLabel: React.CSSProperties = { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }
const statVal:   React.CSSProperties = { fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }

function RecentProjects(): React.ReactElement | null {
  const [projects, setProjects] = useState<RecentProject[]>([])
  const refresh = () => {
    getRecentProjects()
      .then((next) => setProjects(next.slice(0, 3)))
      .catch(() => setProjects([]))
  }

  useEffect(() => {
    refresh()
    window.addEventListener('citadel:recentProjectsChanged', refresh)
    return () => window.removeEventListener('citadel:recentProjectsChanged', refresh)
  }, [])

  if (projects.length === 0) return null

  return (
    <div className="citadel-sidebar-section">
      <div className="citadel-sidebar-section-title">Recent</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {projects.map((project) => (
          <button
            key={project.path}
            title={project.path}
            onClick={() => {
              openRecentProject(project.path).then((ok) => {
                if (ok) inscribe('Project opened')
              })
            }}
            style={{
              width: '100%',
              minHeight: 22,
              padding: '3px 5px',
              background: 'var(--bg-ui)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
              textAlign: 'left',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {project.name}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────
export function RightSidebar(): React.ReactElement {
  const commentPinsVisible = useUIStore((s) => s.commentPinsVisible)
  const toggleCommentPinsVisible = useUIStore((s) => s.toggleCommentPinsVisible)
  const filenameLabelsVisible = useUIStore((s) => s.filenameLabelsVisible)
  const archiveRailCollapsed = useUIStore((s) => s.archiveRailCollapsed)
  const [archiveToolsOpen, setArchiveToolsOpen] = useState(false)

  if (archiveRailCollapsed) {
    return (
      <aside className="citadel-archive-rail-peek">
        <button
          type="button"
          className="citadel-archive-rail-reveal"
          onClick={() => resolver.dispatch(Actions.PANEL_ARCHIVE_RAIL_TOGGLE)}
          title="Open project rail"
          aria-label="Open project rail"
        >
          <span aria-hidden="true">‹</span>
          <span>Project</span>
        </button>
      </aside>
    )
  }

  return (
    <div
      className="citadel-sidebar"
      style={{
        position: 'fixed',
        top: 40,
        right: 0,
        bottom: 0,
        width: 'var(--sidebar-right-w)',
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 10px',
        gap: 'var(--space-5)',
        zIndex: 'var(--z-ui)' as React.CSSProperties['zIndex'],
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      <button
        type="button"
        className="citadel-archive-rail-collapse"
        onClick={() => resolver.dispatch(Actions.PANEL_ARCHIVE_RAIL_TOGGLE)}
        title="Collapse project rail"
        aria-label="Collapse project rail"
      >
        ›
      </button>

      {/* App badge */}
      <AppBadge />

      {/* Label */}
      <div
        className="citadel-sidebar-title"
        style={{
          fontSize: 'var(--text-xs)',
          fontFamily: 'var(--font-display)',
          color: 'var(--text-accent)',
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          opacity: 0.72,
          marginTop: -4,
        }}
      >
        Citadel
      </div>

      {/* Divider */}
      <div className="citadel-sidebar-rule" style={{ width: '100%', height: 1, background: 'var(--border)' }} />

      {/* Quick actions */}
      <div className="citadel-sidebar-section">
        <div className="citadel-sidebar-section-title">Project</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%' }}>
          <QuickBtn label="Open project" title="Open project file" onClick={() => resolver.dispatch(Actions.OPEN)} />
          <QuickBtn label="New board" title="Add a new board (Ctrl+Shift+N)" onClick={() => resolver.dispatch(Actions.BOARD_NEW)} />
          <button
            type="button"
            className="citadel-sidebar-disclosure"
            aria-expanded={archiveToolsOpen}
            onClick={() => setArchiveToolsOpen((open) => !open)}
          >
            Project tools
            <ToolIcon name="chevronDown" size={12} className={archiveToolsOpen ? undefined : 'citadel-disclosure-collapsed'} />
          </button>
          {archiveToolsOpen && (
            <div className="citadel-sidebar-disclosure-content">
              <QuickBtn label="Index" title="Browse all items and connections" onClick={() => useUIStore.getState().togglePanel('indexLedger')} />
              <QuickBtn label="Media review" title="Review untagged and missing files, or import a folder" onClick={() => useUIStore.getState().togglePanel('archiveWorkbench')} />
              <QuickBtn label="Duplicate board" title="Duplicate the active board (Ctrl+Shift+D)" onClick={() => resolver.dispatch(Actions.BOARD_DUPLICATE)} />
            </div>
          )}
        </div>
      </div>

      <div className="citadel-sidebar-section">
        <div className="citadel-sidebar-section-title">Mark</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%' }}>
          <QuickBtn label="Comment" title="Add a comment pin (Ctrl+Shift+M)" onClick={() => resolver.dispatch(Actions.COMMENT_PIN_ADD)} />
          <QuickBtn label={commentPinsVisible ? 'Hide notes' : 'Show notes'} title="Show or hide comment pins" onClick={toggleCommentPinsVisible} />
          <QuickBtn label={filenameLabelsVisible ? 'Hide names' : 'Show names'} title="Show or hide filenames under media items (Shift+F)" onClick={() => resolver.dispatch(Actions.FILENAME_LABELS_TOGGLE)} />
          <QuickBtn label="Sequence" title="Presentation sequence" onClick={() => useUIStore.getState().togglePanel('presentationSequence')} />
        </div>
      </div>

      <div className="citadel-sidebar-section">
        <div className="citadel-sidebar-section-title">Export</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%' }}>
          <QuickBtn label="Export PDF" title="Export canvas as PDF" onClick={() => resolver.dispatch(Actions.EXPORT_PDF)} />
          <QuickBtn label="Export PNG" title="Export canvas as image" onClick={() => resolver.dispatch(Actions.EXPORT_IMAGE)} />
          <QuickBtn label="Export ZIP" title="Bundle project as .citadelz" onClick={() => resolver.dispatch(Actions.EXPORT_ZIP)} />
        </div>
      </div>

      <WindowModes />

      <RecentProjects />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Status */}
      <div style={{ width: '100%' }}>
        <StatusLine />
      </div>

      {/* Keybinds link */}
      <button
        className="citadel-keybind-link"
        onClick={() => resolver.dispatch(Actions.PANEL_KEYBINDS)}
        title="Keybind settings"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: 'var(--text-xs)',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        keybinds
      </button>
    </div>
  )
}
