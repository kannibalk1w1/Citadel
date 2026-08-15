import React, { useEffect, useRef, useState } from 'react'
import towerImg from '../assets/CitadelTower.png'
import { useMascotStore, type MascotEffect } from '../store/mascotStore'
import { useHistoryStore } from '../store/historyStore'
import { useUIStore } from '../store/uiStore'
import { resolver } from '../keybinds/keybindResolver'
import { Actions } from '../keybinds/actions'
import { getCurrentFilePath, getRecentProjects, getSaveActivity, openRecentProject, type RecentProject, type SaveActivity } from '../utils/projectFile'
import { inscribe } from './toasts/inscriptionToastStore'

// ── Effect → CSS class map ─────────────────────────────────────────────────────
// These apply to the <img> element itself via filter/transform.
const IMG_CLASS: Partial<Record<MascotEffect, string>> = {
  'base-pulse':       'mascot-base-pulse',
  'brightness-pulse': 'mascot-brightness-pulse',
  'crumble':          'mascot-crumble',
  'rise-from-fog':    'mascot-rise-from-fog',
  'forward-surge':    'mascot-forward-surge',
  'rewind-swirl':     'mascot-rewind-swirl',
  'fracture':         'mascot-fracture',
  'lighthouse-beam':  'mascot-lighthouse',
  'banner-raise':     'mascot-banner-raise',
  // eye-open / eye-close handled by persistent state class
  // lightning-in/out, rune-seal, progress-fill use SVG overlay only
}

// ── SVG overlay effects ────────────────────────────────────────────────────────
// viewBox matches the display area (w=120, h=150 approx 4:5 ratio of the PNG)
const OW = 120
const OH = 150

function OverlaySVG({ effect, progress }: { effect: MascotEffect | null; progress: number }): React.ReactElement | null {
  if (!effect) return null

  // Spire tip is roughly at (60, 8) in our 120×150 viewBox
  // Tower mid-section centre ~(60, 70)
  // Gate arch ~(60, 120)

  switch (effect) {
    case 'lightning-out':
      return (
        <svg viewBox={`0 0 ${OW} ${OH}`} style={overlaySvgStyle}>
          <line x1="60" y1="12" x2="52" y2="-20" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="5 3">
            <animate attributeName="opacity" values="1;0.4;1;0" dur="0.7s" fill="freeze" />
          </line>
          <line x1="60" y1="12" x2="66" y2="-24" stroke="#c8c8c8" strokeWidth="1" strokeDasharray="4 3" opacity="0.5">
            <animate attributeName="opacity" values="0.5;0.1;0.5;0" dur="0.7s" fill="freeze" />
          </line>
          {[54, 62, 58].map((x, i) => (
            <circle key={i} cx={x} cy={12 - i * 6} r="1" fill="#ffffff">
              <animate attributeName="opacity" values="1;0" dur={`${0.3 + i * 0.1}s`} fill="freeze" />
              <animateTransform attributeName="transform" type="translate" values="0,0; 0,-18" dur={`${0.5 + i * 0.1}s`} fill="freeze" />
            </circle>
          ))}
        </svg>
      )

    case 'lightning-in':
      return (
        <svg viewBox={`0 0 ${OW} ${OH}`} style={overlaySvgStyle}>
          <line x1="60" y1="-20" x2="60" y2="12" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="5 3">
            <animate attributeName="opacity" values="0;1;0.4;1;0" dur="0.8s" fill="freeze" />
          </line>
          <circle cx="60" cy="12" r="6" fill="none" stroke="#c8c8c8" strokeWidth="1">
            <animate attributeName="r" values="2;10;2" dur="0.8s" fill="freeze" />
            <animate attributeName="opacity" values="0.8;0;0" dur="0.8s" fill="freeze" />
          </circle>
        </svg>
      )

    case 'rune-seal':
      return (
        <svg viewBox={`0 0 ${OW} ${OH}`} style={overlaySvgStyle}>
          <circle cx="60" cy="72" r="28" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.7">
            <animate attributeName="r" values="8;32;8" dur="1.2s" fill="freeze" />
            <animate attributeName="opacity" values="0.7;0;0" dur="1.2s" fill="freeze" />
          </circle>
          {/* 6-pointed rune marks */}
          {[0, 60, 120, 180, 240, 300].map((deg, i) => {
            const rad = (deg * Math.PI) / 180
            const x = 60 + 28 * Math.cos(rad)
            const y = 72 + 28 * Math.sin(rad)
            return (
              <line key={i} x1={x - 3} y1={y} x2={x + 3} y2={y} stroke="#c8c8c8" strokeWidth="0.8">
                <animate attributeName="opacity" values="0.8;0;0" dur="1.2s" fill="freeze" />
              </line>
            )
          })}
          <text x="60" y="76" textAnchor="middle" fontSize="9" fill="#c8c8c8" fontFamily="Cinzel" opacity="0.7">
            ⊕
            <animate attributeName="opacity" values="0.7;0;0" dur="1.2s" fill="freeze" />
          </text>
        </svg>
      )

    case 'rewind-swirl':
      return (
        <svg viewBox={`0 0 ${OW} ${OH}`} style={overlaySvgStyle}>
          <path d="M60 60 A18 18 0 1 0 42 48" fill="none" stroke="#c8c8c8" strokeWidth="1.4">
            <animate attributeName="opacity" values="0.8;0;0" dur="1.1s" fill="freeze" />
            <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="-360 60 60" dur="1.1s" fill="freeze" />
          </path>
          <polygon points="40,44 40,52 46,48" fill="#c8c8c8">
            <animate attributeName="opacity" values="0.8;0;0" dur="1.1s" fill="freeze" />
          </polygon>
        </svg>
      )

    case 'forward-surge':
      return (
        <svg viewBox={`0 0 ${OW} ${OH}`} style={overlaySvgStyle}>
          <path d="M60 60 A18 18 0 1 1 78 48" fill="none" stroke="#ffffff" strokeWidth="1.4">
            <animate attributeName="opacity" values="0.8;0;0" dur="1.1s" fill="freeze" />
            <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="1.1s" fill="freeze" />
          </path>
          <polygon points="80,44 80,52 74,48" fill="#ffffff">
            <animate attributeName="opacity" values="0.8;0;0" dur="1.1s" fill="freeze" />
          </polygon>
        </svg>
      )

    case 'lighthouse-beam':
      return (
        <svg viewBox={`0 0 ${OW} ${OH}`} style={overlaySvgStyle}>
          <line x1="60" y1="10" x2="10" y2="-15" stroke="#ffffff" strokeWidth="1.2" opacity="0.7">
            <animate attributeName="opacity" values="0;0.7;0.7;0" dur="1.2s" fill="freeze" />
            <animateTransform attributeName="transform" type="rotate" from="-30 60 10" to="50 60 10" dur="1.2s" fill="freeze" />
          </line>
          <line x1="60" y1="10" x2="10" y2="-15" stroke="#c8c8c8" strokeWidth="3" opacity="0.15">
            <animate attributeName="opacity" values="0;0.15;0.15;0" dur="1.2s" fill="freeze" />
            <animateTransform attributeName="transform" type="rotate" from="-30 60 10" to="50 60 10" dur="1.2s" fill="freeze" />
          </line>
        </svg>
      )

    case 'progress-fill': {
      const fillH = Math.round(OH * Math.min(1, Math.max(0, progress)))
      return (
        <svg viewBox={`0 0 ${OW} ${OH}`} style={{ ...overlaySvgStyle, opacity: 0.35 }}>
          <rect x="0" y={OH - fillH} width={OW} height={fillH} fill="#505050">
            <animate attributeName="opacity" values="0.8;0.5;0.8" dur="0.8s" repeatCount="indefinite" />
          </rect>
        </svg>
      )
    }

    case 'fracture':
      return (
        <svg viewBox={`0 0 ${OW} ${OH}`} style={overlaySvgStyle}>
          <path d="M55 20 L58 40 L52 52 L60 70 L64 58 L70 62 L66 42 L72 28" fill="none" stroke="#5a0000" strokeWidth="1.2">
            <animate attributeName="opacity" values="0;1;1;0" dur="1.2s" fill="freeze" />
          </path>
          <path d="M50 35 L56 44" fill="none" stroke="#5a0000" strokeWidth="0.7" opacity="0.6">
            <animate attributeName="opacity" values="0;0.6;0.6;0" dur="1.2s" fill="freeze" />
          </path>
          <path d="M68 55 L63 66" fill="none" stroke="#5a0000" strokeWidth="0.7" opacity="0.6">
            <animate attributeName="opacity" values="0;0.6;0.6;0" dur="1.2s" fill="freeze" />
          </path>
        </svg>
      )

    case 'banner-raise':
      return (
        <svg viewBox={`0 0 ${OW} ${OH}`} style={overlaySvgStyle}>
          <line x1="72" y1="8" x2="72" y2="-4" stroke="#c8c8c8" strokeWidth="0.8">
            <animate attributeName="opacity" values="0;0.8;0.8;0" dur="1.2s" fill="freeze" />
          </line>
          <rect x="72" y="-4" width="16" height="9" rx="1" fill="#505050">
            <animateTransform attributeName="transform" type="translate" values="0,12; 0,0" dur="0.5s" fill="freeze" />
            <animate attributeName="opacity" values="0;0.9;0.9;0" dur="1.2s" fill="freeze" />
          </rect>
        </svg>
      )

    case 'eye-close':
      return (
        <svg viewBox={`0 0 ${OW} ${OH}`} style={overlaySvgStyle}>
          <ellipse cx="60" cy="72" rx="12" ry="6" fill="#8b0000" opacity="0.6">
            <animate attributeName="ry" values="6;0.5;0" dur="0.4s" fill="freeze" />
            <animate attributeName="opacity" values="0.6;0.3;0" dur="0.4s" fill="freeze" />
          </ellipse>
        </svg>
      )

    default:
      return null
  }
}

const overlaySvgStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  overflow: 'visible',
  pointerEvents: 'none',
}

// ── Mascot PNG with effect layers ──────────────────────────────────────────────
function MascotPNG(): React.ReactElement {
  const { effectQueue, persistentEffects, consumeNextEffect } = useMascotStore()
  const [currentEffect, setCurrentEffect] = useState<MascotEffect | null>(null)
  const [currentProgress, setCurrentProgress] = useState(0)
  // key forces remount so CSS animation re-fires on repeated triggers
  const [animKey, setAnimKey] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (currentEffect || effectQueue.length === 0) return
    const next = consumeNextEffect()
    if (!next) return
    if (timerRef.current) clearTimeout(timerRef.current)
    setCurrentEffect(next.name)
    setCurrentProgress(next.progress ?? 0)
    setAnimKey((k) => k + 1)
    timerRef.current = setTimeout(() => setCurrentEffect(null), 1400)
  }, [effectQueue, currentEffect, consumeNextEffect])

  const hasPersistentEye = persistentEffects.has('eye-open')
  const hasEmber = persistentEffects.has('ember-drift')

  const imgClass = (currentEffect && IMG_CLASS[currentEffect]) ?? ''
  const isRecording = hasPersistentEye
  const recordingClass = isRecording ? 'mascot-recording' : ''

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
      {/* Tower image */}
      <img
        key={animKey}
        src={towerImg}
        alt="Citadel"
        className={[imgClass, recordingClass].filter(Boolean).join(' ')}
        style={{
          width: '100%',
          maxWidth: 120,
          height: 'auto',
          display: 'block',
          imageRendering: 'auto',
          // mix-blend-mode removes the white background against the dark panel
          mixBlendMode: 'multiply',
          transition: 'filter 0.15s',
        }}
        draggable={false}
      />

      {/* SVG overlay for particle / line effects */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <OverlaySVG effect={currentEffect} progress={currentProgress} />
      </div>

      {/* Ember drift particles */}
      {hasEmber && (
        <svg
          viewBox="0 0 120 150"
          style={{ ...overlaySvgStyle, position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          {[44, 60, 76].map((x, i) => (
            <circle key={i} cx={x} cy={20} r="1.2" fill="#505050">
              <animate attributeName="cy" values="20;5;-10" dur={`${2.2 + i * 0.5}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0.15;0" dur={`${2.2 + i * 0.5}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </svg>
      )}
    </div>
  )
}

// ── Quick-action button ────────────────────────────────────────────────────────
function QuickBtn({
  label, title, onClick,
}: { label: React.ReactNode; title: string; onClick: () => void }): React.ReactElement {
  return (
    <button
      className="citadel-panel-button"
      title={title}
      onClick={onClick}
      style={{
        width: '100%',
        padding: '5px 0',
        background: 'var(--bg-ui)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        color: 'var(--text-secondary)',
        fontSize: 11,
        fontFamily: 'var(--font-body)',
        cursor: 'pointer',
        transition: 'var(--transition-fast)',
        textAlign: 'center',
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
    <div className="citadel-status-strip" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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

const statLabel: React.CSSProperties = { fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }
const statVal:   React.CSSProperties = { fontSize: 9, fontFamily: 'var(--font-mono)' }

function RecentProjects(): React.ReactElement | null {
  const [projects, setProjects] = useState<RecentProject[]>([])
  const triggerEffect = useMascotStore((s) => s.triggerEffect)

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {projects.map((project) => (
          <button
            key={project.path}
            title={project.path}
            onClick={() => {
              openRecentProject(project.path).then((ok) => {
                if (ok) {
                  triggerEffect('lightning-in')
                  inscribe('Project opened')
                }
              })
            }}
            style={{
              width: '100%',
              minHeight: 22,
              padding: '3px 5px',
              background: 'var(--bg-ui)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--text-secondary)',
              fontSize: 10,
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
        gap: 10,
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

      {/* Mascot */}
      <MascotPNG />

      {/* Label */}
      <div
        className="citadel-sidebar-title"
        style={{
          fontSize: 9,
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
          <QuickBtn label="Open project" title="Open project file" onClick={() => resolver.dispatch(Actions.OPEN)} />
          <QuickBtn label="New board" title="Add a new board (Ctrl+Shift+N)" onClick={() => resolver.dispatch(Actions.BOARD_NEW)} />
          <button
            type="button"
            className="citadel-sidebar-disclosure"
            aria-expanded={archiveToolsOpen}
            onClick={() => setArchiveToolsOpen((open) => !open)}
          >
            Project tools <span aria-hidden="true">{archiveToolsOpen ? '−' : '+'}</span>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
          <QuickBtn label="Comment" title="Add a comment pin (Ctrl+Shift+M)" onClick={() => resolver.dispatch(Actions.COMMENT_PIN_ADD)} />
          <QuickBtn label={commentPinsVisible ? 'Hide notes' : 'Show notes'} title="Show or hide comment pins" onClick={toggleCommentPinsVisible} />
          <QuickBtn label={filenameLabelsVisible ? 'Hide names' : 'Show names'} title="Show or hide filenames under media items (Shift+F)" onClick={() => resolver.dispatch(Actions.FILENAME_LABELS_TOGGLE)} />
          <QuickBtn label="Sequence" title="Presentation sequence" onClick={() => useUIStore.getState().togglePanel('presentationSequence')} />
        </div>
      </div>

      <div className="citadel-sidebar-section">
        <div className="citadel-sidebar-section-title">Export</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
          <QuickBtn label="Export PDF" title="Export canvas as PDF" onClick={() => resolver.dispatch(Actions.EXPORT_PDF)} />
          <QuickBtn label="Export PNG" title="Export canvas as image" onClick={() => resolver.dispatch(Actions.EXPORT_IMAGE)} />
          <QuickBtn label="Export ZIP" title="Bundle project as .citadelz" onClick={() => resolver.dispatch(Actions.EXPORT_ZIP)} />
        </div>
      </div>

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
          fontSize: 9,
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
