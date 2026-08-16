import React from 'react'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { useUIStore } from '../../store/uiStore'
import { itemInscriptionRefs } from '../inscriptionRefs'
import { resolver } from '../../keybinds/keybindResolver'
import { Actions } from '../../keybinds/actions'
import type { CanvasItem } from '../../../types'
import { activeArchiveRailWidth } from '../shell/shellModel'
import { canvasColor, resolveCanvasColor } from '../../theme/canvasColors'
import { CODE_LANGUAGES, codeLanguageLabel, normalizeCodeLanguage } from '../../canvas/items/codeSnippet'
import { ToolIcon, type ToolIconName } from '../icons/ToolIcon'

// ── Constants ──────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-ui)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '3px 6px',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-md)',
  fontFamily: 'var(--font-mono)',
  outline: 'none',
  boxSizing: 'border-box',
}

const STICKY_COLORS = [
  '#1e1b18', '#1a211a', '#171d22', '#211721',
  '#241919', '#211e16', '#172220', '#202216',
]

const STICKY_COLORS_DISPLAY: Record<string, string> = {
  '#1e1b18': canvasColor("accent"), '#1a211a': '#6f8a5f', '#171d22': '#65798a',
  '#211721': '#8a6384', '#241919': '#8a3d3d', '#211e16': '#9a7a45',
  '#172220': '#4f8276', '#202216': '#7b8745',
}

type AlignAction = { icon: ToolIconName; action: string; title: string }
const ALIGN_ROWS: AlignAction[][] = [
  [
    { icon: 'alignLeft',     title: 'Align left',            action: Actions.ALIGN_LEFT },
    { icon: 'alignCenterH',  title: 'Center horizontally',   action: Actions.ALIGN_CENTER_H },
    { icon: 'alignRight',    title: 'Align right',           action: Actions.ALIGN_RIGHT },
  ],
  [
    { icon: 'alignTop',      title: 'Align top',             action: Actions.ALIGN_TOP },
    { icon: 'alignCenterV',  title: 'Center vertically',     action: Actions.ALIGN_CENTER_V },
    { icon: 'alignBottom',   title: 'Align bottom',          action: Actions.ALIGN_BOTTOM },
  ],
]

// ── Small helpers ──────────────────────────────────────────────────────────────

/**
 * A colour input needs a literal. Items saved before the canvas resolved its
 * own tokens hold `var(--text-primary)`, so resolve rather than guess — the
 * old guess showed one fixed swatch for every themed item.
 */
function cssVarToHex(val: string): string {
  if (val.startsWith('#')) return val
  const resolved = resolveCanvasColor(val, 'textPrimary')
  return resolved.startsWith('#') ? resolved : '#e3ded4'
}

function isCommentItem(item: CanvasItem): boolean {
  return item.type === 'sticky' && item.meta?.kind === 'comment'
}

function itemLabel(item: CanvasItem | undefined): string {
  if (!item) return 'None'
  const content = typeof item.meta?.content === 'string' ? item.meta.content.trim() : ''
  const src = item.src ? item.src.split(/[\\/]/).pop() : ''
  return content || src || `${item.type} ${item.id.slice(0, 6)}`
}

function centerViewportOnItem(item: CanvasItem): void {
  const expandedRailWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-right-w') || '228')
  const sidebarW = activeArchiveRailWidth(useUIStore.getState().archiveRailCollapsed, expandedRailWidth)
  const canvasW = window.innerWidth - sidebarW
  const viewport = useCanvasStore.getState().viewport()
  useCanvasStore.getState().setSelection([item.id])
  useCanvasStore.getState().updateViewport({
    x: canvasW / 2 - (item.x + item.width / 2) * viewport.scale,
    y: window.innerHeight / 2 - (item.y + item.height / 2) * viewport.scale,
  })
}

function Divider({ label }: { label: string }): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', margin: '2px 0' }}>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-accent)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--border), transparent)' }} />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
      <span style={{ width: 54, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

const panelChrome: React.CSSProperties = {
  position: 'absolute',
  top: 48,
  right: 'calc(var(--context-rail-w) + 8px)',
  width: 236,
  background: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: 12,
  zIndex: 'var(--z-panels)',
  boxShadow: 'var(--shadow-lg)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-5)',
}

function PanelTitle({ title, subtitle }: { title: string; subtitle?: string }): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', borderBottom: '1px solid var(--border-muted)', paddingBottom: 8 }}>
      <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontFamily: 'var(--font-display)', color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        {title}
      </h3>
      {subtitle && (
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {subtitle}
        </span>
      )}
    </div>
  )
}

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }): React.ReactElement {
  return (
    <input
      type="number"
      value={Math.round(value)}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      style={inputStyle}
    />
  )
}

function SwatchRow({ color, onColorChange, onRemove }: {
  color: string
  onColorChange: (val: string) => void
  onRemove: (() => void) | null
}): React.ReactElement {
  const [hexInput, setHexInput] = React.useState(color.toUpperCase())
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => { setHexInput(color.toUpperCase()) }, [color])

  const commitHex = (raw: string) => {
    const val = raw.trim()
    const match = val.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    if (match) {
      const hex = '#' + (match[1].length === 3
        ? match[1].split('').map((c) => c + c).join('')
        : match[1]).toUpperCase()
      onColorChange(hex)
      setHexInput(hex)
    } else {
      setHexInput(color.toUpperCase())
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(color.toUpperCase()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
      <label style={{ position: 'relative', width: 26, height: 26, flexShrink: 0, cursor: 'pointer' }}>
        <div style={{ width: 26, height: 26, borderRadius: 'var(--radius-sm)', background: color, border: '1px solid var(--border)' }} />
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
        />
      </label>

      <input
        value={hexInput}
        onChange={(e) => setHexInput(e.target.value)}
        onBlur={(e) => commitHex(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { commitHex(hexInput); e.currentTarget.blur() } }}
        maxLength={7}
        style={{ ...inputStyle, width: 72, padding: '3px 5px' }}
      />

      <button
        type="button"
        onClick={copyToClipboard}
        title={copied ? 'Copied' : 'Copy hex to clipboard'}
        aria-label={copied ? 'Copied' : 'Copy hex to clipboard'}
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          color: copied ? 'var(--accent)' : 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          padding: '2px 5px',
          flexShrink: 0,
          transition: 'color 0.2s',
        }}
      >
        <ToolIcon name={copied ? 'check' : 'duplicate'} size={14} />
      </button>

      <button
        onClick={onRemove ?? undefined}
        disabled={!onRemove}
        title="Remove"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--accent-danger)',
          cursor: onRemove ? 'pointer' : 'default',
          fontSize: 'var(--text-lg)',
          opacity: onRemove ? 1 : 0.25,
          lineHeight: 1,
          padding: '0 2px',
          flexShrink: 0,
        }}
      >×</button>
    </div>
  )
}

function AlignPanel(): React.ReactElement {
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  return (
    <div
      className="citadel-floating-panel citadel-context-inspector"
      style={panelChrome}
    >
      <PanelTitle title="Align" subtitle={`${selectedIds.length} items selected`} />
      {ALIGN_ROWS.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {row.map(({ icon, title, action }) => (
            <button
              key={action}
              type="button"
              title={title}
              aria-label={title}
              onClick={() => resolver.dispatch(action)}
              style={{
                flex: 1,
                height: 28,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-ui)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ToolIcon name={icon} size={16} />
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

type IpcApi = { invoke: (channel: string, args: unknown) => Promise<unknown> }

function ComparisonSlotRow({
  label,
  src,
  onSet,
  onClear,
}: {
  label: string
  src: string
  onSet: (path: string) => void
  onClear: () => void
}): React.ReactElement {
  const filename = src ? src.split(/[\\/]/).pop() ?? src : null

  const pickFile = async () => {
    try {
      const ipc = (window as unknown as { ipc?: IpcApi }).ipc
      if (!ipc) return
      const result = await ipc.invoke('file:openDialog', {
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }],
      })
      if (result && typeof result === 'object' && 'path' in result && typeof (result as Record<string, unknown>).path === 'string') {
        onSet((result as Record<string, unknown>).path as string)
      }
    } catch {
      // file picker dismissed or IPC unavailable
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
      <span style={{ width: 12, fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
        {label}
      </span>
      {src ? (
        <img
          src={'local:///' + src.replace(/\\/g, '/')}
          style={{ width: 26, height: 26, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0, border: '1px solid var(--border)' }}
          alt=""
        />
      ) : (
        <div style={{ width: 26, height: 26, borderRadius: 'var(--radius-sm)', background: 'var(--bg-hover)', border: '1px solid var(--border)', flexShrink: 0 }} />
      )}
      <span style={{
        flex: 1,
        fontSize: 'var(--text-sm)',
        color: filename ? 'var(--text-secondary)' : 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {filename ?? 'None'}
      </span>
      <button
        onClick={pickFile}
        style={{
          background: 'var(--bg-ui)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: 'var(--text-sm)',
          padding: '2px 6px',
          fontFamily: 'var(--font-mono)',
          flexShrink: 0,
        }}
      >
        Set…
      </button>
      {src && (
        <button
          onClick={onClear}
          title="Clear"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--accent-danger)',
            cursor: 'pointer',
            fontSize: 'var(--text-lg)',
            lineHeight: 1,
            padding: '0 2px',
            flexShrink: 0,
          }}
        >×</button>
      )}
    </div>
  )
}

function TagsSection({ item, boardId }: { item: CanvasItem; boardId: string }): React.ReactElement {
  const [input, setInput] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const allItems = useCanvasStore((s) => s.items())
  const updateItem = useCanvasStore((s) => s.updateItem)
  const pushHistory = useHistoryStore((s) => s.push)

  const suggestions = React.useMemo(() => {
    const q = input.toLowerCase()
    if (!q) return []
    return Array.from(new Set(allItems.flatMap((i) => i.tags)))
      .filter((t) => !item.tags.includes(t) && t.startsWith(q))
      .sort()
      .slice(0, 6)
  }, [input, allItems, item.tags])

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase()
    if (!t || item.tags.includes(t)) return
    const newTags = [...item.tags, t]
    pushHistory('ITEM_STYLE', boardId, { id: item.id, tags: item.tags }, { id: item.id, tags: newTags })
    updateItem(boardId, item.id, { tags: newTags })
    setInput('')
    setOpen(false)
  }

  const removeTag = (tag: string) => {
    const newTags = item.tags.filter((t) => t !== tag)
    pushHistory('ITEM_STYLE', boardId, { id: item.id, tags: item.tags }, { id: item.id, tags: newTags })
    updateItem(boardId, item.id, { tags: newTags })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {item.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {item.tags.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                background: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1px 6px 1px 7px',
                fontSize: 'var(--text-sm)',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
              }}
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: 'var(--text-md)',
                  lineHeight: 1,
                  padding: 0,
                  marginLeft: 1,
                }}
              >×</button>
            </span>
          ))}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { addTag(input); e.preventDefault() }
            if (e.key === 'Escape') { setInput(''); setOpen(false) }
          }}
          onFocus={() => { if (input) setOpen(true) }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Add tag…"
          style={{ ...inputStyle, width: '100%' }}
        />
        {open && suggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 10,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            marginTop: 2,
          }}>
            {suggestions.map((s) => (
              <div
                key={s}
                onMouseDown={() => addTag(s)}
                style={{
                  padding: '3px 8px',
                  fontSize: 'var(--text-md)',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

function CommentAttachPanel({
  comment,
  target,
  boardId,
}: {
  comment: CanvasItem
  target: CanvasItem
  boardId: string
}): React.ReactElement {
  const updateItem = useCanvasStore((s) => s.updateItem)
  const pushHistory = useHistoryStore((s) => s.push)

  const attach = () => {
    const meta = { ...comment.meta, kind: 'comment', attachedTo: target.id }
    pushHistory('ITEM_STYLE', boardId, comment, { ...comment, meta })
    updateItem(boardId, comment.id, { meta })
    useCanvasStore.getState().setSelection([comment.id])
  }

  return (
    <div
      className="citadel-floating-panel citadel-context-inspector"
      style={panelChrome}
    >
      <PanelTitle title="Attach comment" subtitle="Attach this comment to an item" />
      <div style={{ fontSize: 'var(--text-md)', fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
        Attach <span style={{ color: 'var(--text-primary)' }}>{itemLabel(comment)}</span> to <span style={{ color: 'var(--text-primary)' }}>{itemLabel(target)}</span>.
      </div>
      <button
        onClick={attach}
        style={{
          height: 26,
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          background: 'var(--bg-ui)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          fontSize: 'var(--text-md)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        Attach comment
      </button>
    </div>
  )
}

export function ItemProperties(): React.ReactElement | null {
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const items = useCanvasStore((s) => s.items())
  const updateItem = useCanvasStore((s) => s.updateItem)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)
  const pushHistory = useHistoryStore((s) => s.push)

  if (!activeBoardId) return null

  if (selectedIds.length > 1) {
    const selectedItems = items.filter((i) => selectedIds.includes(i.id))
    const comments = selectedItems.filter(isCommentItem)
    const targets = selectedItems.filter((i) => !isCommentItem(i))
    if (selectedItems.length === 2 && comments.length === 1 && targets.length === 1) {
      return <CommentAttachPanel comment={comments[0]} target={targets[0]} boardId={activeBoardId} />
    }
    return <AlignPanel />
  }
  if (selectedIds.length !== 1) return null

  const item = items.find((i) => i.id === selectedIds[0])
  if (!item) return null

  const update = (patch: Parameters<typeof updateItem>[2]) => {
    pushHistory('ITEM_STYLE', activeBoardId, item, { ...item, ...patch })
    updateItem(activeBoardId, item.id, patch)
  }

  const updateMeta = (metaPatch: Record<string, unknown>) => {
    const newMeta = { ...item.meta, ...metaPatch }
    pushHistory('ITEM_STYLE', activeBoardId, item, { ...item, meta: newMeta })
    updateItem(activeBoardId, item.id, { meta: newMeta })
  }

  const isComment = isCommentItem(item)
  const attachedTargetId = isComment && typeof item.meta?.attachedTo === 'string' ? item.meta.attachedTo : null
  const attachedTarget = attachedTargetId ? items.find((candidate) => candidate.id === attachedTargetId) : undefined
  const nearestTarget = isComment
    ? items
      .filter((candidate) => candidate.id !== item.id && !isCommentItem(candidate))
      .map((candidate) => ({
        item: candidate,
        distance: Math.hypot(
          candidate.x + candidate.width / 2 - (item.x + item.width / 2),
          candidate.y + candidate.height / 2 - (item.y + item.height / 2),
        ),
      }))
      .sort((a, b) => a.distance - b.distance)[0]?.item
    : undefined

  return (
    <div
      className="citadel-floating-panel citadel-context-inspector citadel-item-properties"
      style={panelChrome}
    >
      <PanelTitle title="Item" subtitle={`${item.type} / ${item.id.slice(0, 6)}`} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <Field label="X"><NumInput value={item.x} onChange={(v) => update({ x: v })} /></Field>
        <Field label="Y"><NumInput value={item.y} onChange={(v) => update({ y: v })} /></Field>
        <Field label="W"><NumInput value={item.width} onChange={(v) => update({ width: Math.max(1, v) })} /></Field>
        <Field label="H"><NumInput value={item.height} onChange={(v) => update({ height: Math.max(1, v) })} /></Field>
      </div>

      <Field label="Rotation">
        <NumInput value={item.rotation} onChange={(v) => update({ rotation: v })} />
      </Field>

      <Field label="Opacity">
        <input
          type="range" min={0} max={1} step={0.01}
          value={item.opacity}
          onChange={(e) => update({ opacity: parseFloat(e.target.value) })}
          style={{ width: '100%' }}
        />
      </Field>

      <Field label="Frame">
        <select
          value={(item.meta?.frameVariant as string) ?? 'auto'}
          onChange={(e) => updateMeta({ frameVariant: e.target.value === 'auto' ? undefined : e.target.value })}
          style={{ ...inputStyle, padding: '3px 5px' }}
        >
          <option value="auto">Auto</option>
          <option value="plain">Plain</option>
          <option value="relic">Relic</option>
          <option value="dossier">Dossier</option>
          <option value="sketch">Sketch</option>
          <option value="evidence">Evidence</option>
        </select>
      </Field>

      {/* ── Inscription references ── */}
      {itemInscriptionRefs(item).length > 0 && (
        <>
          <Divider label="References" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {itemInscriptionRefs(item).map((ref) => (
              <button
                key={ref}
                type="button"
                title={`Search for "${ref}"`}
                aria-label={`Search for "${ref}"`}
                onClick={() => {
                  useUIStore.getState().setSearchQuery(ref)
                  useUIStore.getState().openPanel('tagSearch')
                }}
                style={{
                  background: 'var(--bg-ui)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-accent)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-sm)',
                  padding: '2px 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-1)',
                }}
              >
                <ToolIcon name="search" size={12} />
                {ref}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Tint ── */}
      {!['video', 'youtube', 'audio', 'model3d'].includes(item.type) && (
        <>
          <Divider label="Tint" />
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <input
              type="checkbox"
              checked={!!item.tint}
              onChange={(e) => {
                if (e.target.checked) {
                  update({ tint: { color: canvasColor("accent"), opacity: 0.25 } })
                } else {
                  update({ tint: undefined })
                }
              }}
              style={{ accentColor: 'var(--accent)' }}
            />
            Enable
          </label>
          {item.tint && (
            <>
              <Field label="Color">
                <input
                  type="color"
                  value={item.tint.color}
                  onChange={(e) => update({ tint: { ...item.tint!, color: e.target.value } })}
                  style={{ ...inputStyle, padding: '2px', cursor: 'pointer', height: 24 }}
                />
              </Field>
              <Field label="Opacity">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <input
                    type="range" min={0} max={1} step={0.01}
                    value={item.tint.opacity}
                    onChange={(e) => update({ tint: { ...item.tint!, opacity: parseFloat(e.target.value) } })}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', width: 28, textAlign: 'right' }}>
                    {Math.round(item.tint.opacity * 100)}%
                  </span>
                </div>
              </Field>
            </>
          )}
        </>
      )}

      {/* ── Swatch-specific ── */}
      {item.type === 'image' && (
        <>
          <Divider label="Image" />
          <Field label="Fit">
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {[
                { value: 'stretch', label: 'Stretch' },
                { value: 'fit', label: 'Fit' },
                { value: 'fill', label: 'Fill' },
              ].map(({ value, label }) => {
                const active = ((item.meta?.fitMode as string) ?? 'stretch') === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateMeta({ fitMode: value === 'stretch' ? undefined : value })}
                    style={{
                      flex: 1,
                      height: 24,
                      fontSize: 'var(--text-xs)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      border: '1px solid var(--border)',
                      background: active ? 'var(--accent)' : 'var(--bg-ui)',
                      color: active ? 'var(--bg-ui)' : 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </Field>
        </>
      )}

      {item.type === 'swatch' && (
        <>
          <Divider label="Palette" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {((item.meta?.colors as string[]) ?? []).map((color, i) => {
              const colors = (item.meta?.colors as string[]) ?? []
              return (
                <SwatchRow
                  key={i}
                  color={color}
                  onColorChange={(val) => {
                    const next = [...colors]
                    next[i] = val
                    updateMeta({ colors: next })
                  }}
                  onRemove={colors.length > 1 ? () => updateMeta({ colors: colors.filter((_, j) => j !== i) }) : null}
                />
              )
            })}
            <button
              onClick={() => updateMeta({ colors: [...((item.meta?.colors as string[]) ?? []), '#808080'] })}
              style={{ background: 'var(--bg-ui)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 'var(--text-md)', padding: '4px 0' }}
            >
              + Add color
            </button>
          </div>
        </>
      )}

      {/* ── Sticky-specific ── */}
      {item.type === 'sticky' && (
        <>
          <Divider label="Sticky" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {STICKY_COLORS.map((bg) => (
              <button
                key={bg}
                title={bg}
                onClick={() => updateMeta({ color: bg })}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 'var(--radius-sm)',
                  border: `2px solid ${(item.meta?.color as string) === bg ? STICKY_COLORS_DISPLAY[bg] ?? canvasColor("accent") : 'transparent'}`,
                  background: bg,
                  cursor: 'pointer',
                  padding: 0,
                  outline: 'none',
                }}
              />
            ))}
            <input
              type="color"
              value={(item.meta?.color as string) ?? '#1e1b18'}
              onChange={(e) => updateMeta({ color: e.target.value })}
              title="Custom color"
              style={{ width: 22, height: 22, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer', padding: 0, background: 'none' }}
            />
          </div>
        </>
      )}

      {/* ── Text-specific ── */}
      {item.type === 'text' && (
        <>
          <Divider label="Text" />
          <Field label="Size">
            <NumInput value={(item.meta?.fontSize as number) ?? 18} onChange={(v) => updateMeta({ fontSize: Math.max(6, v) })} />
          </Field>
          <Field label="Color">
            <input
              type="color"
              value={cssVarToHex((item.meta?.color as string) ?? '#e3ded4')}
              onChange={(e) => updateMeta({ color: e.target.value })}
              style={{ ...inputStyle, padding: '2px', cursor: 'pointer', height: 24 }}
            />
          </Field>
          <Field label="Align">
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {(['left', 'center', 'right'] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => updateMeta({ align: a })}
                  style={{
                    flex: 1, height: 24, fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    border: '1px solid var(--border)',
                    background: (item.meta?.align ?? 'left') === a ? 'var(--accent)' : 'var(--bg-ui)',
                    color: (item.meta?.align ?? 'left') === a ? 'var(--bg-ui)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {a[0].toUpperCase()}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Bold">
            <input
              type="checkbox"
              checked={(item.meta?.fontStyle as string ?? '').includes('bold')}
              onChange={(e) => {
                const cur = (item.meta?.fontStyle as string) ?? 'normal'
                const next = [e.target.checked ? 'bold' : '', cur.includes('italic') ? 'italic' : ''].filter(Boolean).join(' ') || 'normal'
                updateMeta({ fontStyle: next })
              }}
            />
          </Field>
          <Field label="Italic">
            <input
              type="checkbox"
              checked={(item.meta?.fontStyle as string ?? '').includes('italic')}
              onChange={(e) => {
                const cur = (item.meta?.fontStyle as string) ?? 'normal'
                const next = [cur.includes('bold') ? 'bold' : '', e.target.checked ? 'italic' : ''].filter(Boolean).join(' ') || 'normal'
                updateMeta({ fontStyle: next })
              }}
            />
          </Field>
        </>
      )}

      {item.type === 'code' && (
        <>
          <Divider label="Code" />
          <Field label="Language">
            <select
              value={normalizeCodeLanguage(item.meta?.language)}
              onChange={(e) => updateMeta({ language: e.target.value })}
              style={inputStyle}
            >
              {CODE_LANGUAGES.map((language) => <option key={language} value={language}>{codeLanguageLabel(language)}</option>)}
            </select>
          </Field>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Snippet
            <textarea
              value={(item.meta?.code as string) ?? ''}
              onChange={(e) => updateMeta({ code: e.target.value })}
              spellCheck={false}
              style={{ ...inputStyle, minHeight: 150, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', lineHeight: 1.55, padding: 8 }}
              placeholder="Paste code here"
            />
          </label>
        </>
      )}

      {/* ── Comparison-specific ── */}
      {item.type === 'comparison' && (
        <>
          <Divider label="Comparison" />
          <ComparisonSlotRow
            label="A"
            src={(item.meta?.srcA as string) ?? ''}
            onSet={(path) => updateMeta({ srcA: path })}
            onClear={() => updateMeta({ srcA: '' })}
          />
          <ComparisonSlotRow
            label="B"
            src={(item.meta?.srcB as string) ?? ''}
            onSet={(path) => updateMeta({ srcB: path })}
            onClear={() => updateMeta({ srcB: '' })}
          />
        </>
      )}

      {isComment && (
        <>
          <Divider label="Comment" />
          <Field label="Target">
            <div style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: attachedTarget ? 'var(--text-secondary)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {attachedTarget ? itemLabel(attachedTarget) : 'Detached'}
            </div>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <button
              onClick={() => { if (attachedTarget) centerViewportOnItem(attachedTarget) }}
              disabled={!attachedTarget}
              style={{ background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: attachedTarget ? 'pointer' : 'default', opacity: attachedTarget ? 1 : 0.4, fontSize: 'var(--text-sm)', padding: '4px 0', fontFamily: 'var(--font-mono)' }}
            >
              Jump
            </button>
            <button
              onClick={() => updateMeta({ attachedTo: undefined })}
              disabled={!attachedTargetId}
              style={{ background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: attachedTargetId ? 'pointer' : 'default', opacity: attachedTargetId ? 1 : 0.4, fontSize: 'var(--text-sm)', padding: '4px 0', fontFamily: 'var(--font-mono)' }}
            >
              Detach
            </button>
          </div>
          <button
            onClick={() => { if (nearestTarget) updateMeta({ attachedTo: nearestTarget.id }) }}
            disabled={!nearestTarget}
            title={nearestTarget ? `Attach to ${itemLabel(nearestTarget)}` : 'No target item available'}
            style={{ background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: nearestTarget ? 'pointer' : 'default', opacity: nearestTarget ? 1 : 0.4, fontSize: 'var(--text-sm)', padding: '4px 0', fontFamily: 'var(--font-mono)' }}
          >
            Attach nearest
          </button>
        </>
      )}

      <Divider label="Presentation" />
      <Field label="Order">
        <NumInput
          value={(item.meta?.presentationOrder as number) ?? 0}
          onChange={(v) => updateMeta({ presentationOrder: v > 0 ? Math.round(v) : undefined })}
        />
      </Field>
      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        <input
          type="checkbox"
          checked={item.meta?.skipPresentation === true}
          onChange={(e) => updateMeta({ skipPresentation: e.target.checked ? true : undefined })}
          style={{ accentColor: 'var(--accent)' }}
        />
        Skip in presentation
      </label>

      <Divider label="Tags" />
      <TagsSection item={item} boardId={activeBoardId} />

      <Divider label="Meta" />

      <Field label="Locked">
        <input type="checkbox" checked={item.locked} onChange={(e) => update({ locked: e.target.checked })} />
      </Field>
      <Field label="Link">
        <input
          value={item.link ?? ''}
          onChange={(e) => update({ link: e.target.value || undefined })}
          style={inputStyle}
          placeholder="https://…"
        />
      </Field>
    </div>
  )
}
