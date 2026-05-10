import React from 'react'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { resolver } from '../../keybinds/keybindResolver'
import { Actions } from '../../keybinds/actions'
import type { CanvasItem } from '../../../types'

// ── Constants ──────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-ui)',
  border: '1px solid var(--border)',
  borderRadius: 3,
  padding: '3px 6px',
  color: 'var(--text-primary)',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  outline: 'none',
  boxSizing: 'border-box',
}

const STICKY_COLORS = [
  '#2a2820', '#1e2a1e', '#1e1e2a', '#2a1e2a',
  '#2a1e1e', '#2a241a', '#1a2428', '#282a1e',
]

const STICKY_COLORS_DISPLAY: Record<string, string> = {
  '#2a2820': '#c8a150', '#1e2a1e': '#5aad6e', '#1e1e2a': '#6e7acc',
  '#2a1e2a': '#a06aac', '#2a1e1e': '#b04040', '#2a241a': '#c89050',
  '#1a2428': '#4098b0', '#282a1e': '#8aaa40',
}

type AlignAction = { label: string; action: string; title: string }
const ALIGN_ROWS: AlignAction[][] = [
  [
    { label: '←', title: 'Align Left',           action: Actions.ALIGN_LEFT },
    { label: '⇔', title: 'Center Horizontal',    action: Actions.ALIGN_CENTER_H },
    { label: '→', title: 'Align Right',          action: Actions.ALIGN_RIGHT },
  ],
  [
    { label: '↑', title: 'Align Top',            action: Actions.ALIGN_TOP },
    { label: '⇕', title: 'Center Vertical',      action: Actions.ALIGN_CENTER_V },
    { label: '↓', title: 'Align Bottom',         action: Actions.ALIGN_BOTTOM },
  ],
]

// ── Small helpers ──────────────────────────────────────────────────────────────

function cssVarToHex(val: string): string {
  if (val.startsWith('#')) return val
  return '#e8ddd0'
}

function Divider({ label }: { label: string }): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '2px 0' }}>
      <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 50, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1 }}>{children}</div>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <label style={{ position: 'relative', width: 26, height: 26, flexShrink: 0, cursor: 'pointer' }}>
        <div style={{ width: 26, height: 26, borderRadius: 3, background: color, border: '1px solid var(--border)' }} />
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
        onClick={copyToClipboard}
        title="Copy hex to clipboard"
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 3,
          color: copied ? 'var(--accent)' : 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: 10,
          padding: '2px 5px',
          fontFamily: 'var(--font-mono)',
          flexShrink: 0,
          transition: 'color 0.2s',
        }}
      >
        {copied ? '✓' : 'copy'}
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
          fontSize: 14,
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
      style={{
        position: 'absolute',
        top: 48,
        right: 'calc(var(--sidebar-right-w) + 8px)',
        width: 224,
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: 12,
        zIndex: 'var(--z-panels)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Align ({selectedIds.length} items)
      </h3>
      {ALIGN_ROWS.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 4 }}>
          {row.map(({ label, title, action }) => (
            <button
              key={action}
              title={title}
              onClick={() => resolver.dispatch(action)}
              style={{
                flex: 1,
                height: 28,
                borderRadius: 4,
                border: '1px solid var(--border)',
                background: 'var(--bg-ui)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: 14,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {label}
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
      const result = await ipc.invoke('file:openDialog', {})
      if (result && typeof result === 'object' && 'path' in result && typeof (result as Record<string, unknown>).path === 'string') {
        onSet((result as Record<string, unknown>).path as string)
      }
    } catch {
      // file picker dismissed or IPC unavailable
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 12, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
        {label}
      </span>
      {src ? (
        <img
          src={'local:///' + src.replace(/\\/g, '/')}
          style={{ width: 26, height: 26, objectFit: 'cover', borderRadius: 2, flexShrink: 0, border: '1px solid var(--border)' }}
          alt=""
        />
      ) : (
        <div style={{ width: 26, height: 26, borderRadius: 2, background: 'var(--bg-hover)', border: '1px solid var(--border)', flexShrink: 0 }} />
      )}
      <span style={{
        flex: 1,
        fontSize: 10,
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
          borderRadius: 3,
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: 10,
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
            fontSize: 14,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {item.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {item.tags.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                background: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '1px 6px 1px 7px',
                fontSize: 10,
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
                  fontSize: 11,
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
            borderRadius: 3,
            marginTop: 2,
          }}>
            {suggestions.map((s) => (
              <div
                key={s}
                onMouseDown={() => addTag(s)}
                style={{
                  padding: '3px 8px',
                  fontSize: 11,
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

export function ItemProperties(): React.ReactElement | null {
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const items = useCanvasStore((s) => s.items())
  const updateItem = useCanvasStore((s) => s.updateItem)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)
  const pushHistory = useHistoryStore((s) => s.push)

  if (selectedIds.length > 1) return <AlignPanel />
  if (selectedIds.length !== 1) return null

  const item = items.find((i) => i.id === selectedIds[0])
  if (!item || !activeBoardId) return null

  const update = (patch: Parameters<typeof updateItem>[2]) => {
    pushHistory('ITEM_STYLE', activeBoardId, item, { ...item, ...patch })
    updateItem(activeBoardId, item.id, patch)
  }

  const updateMeta = (metaPatch: Record<string, unknown>) => {
    const newMeta = { ...item.meta, ...metaPatch }
    pushHistory('ITEM_STYLE', activeBoardId, item, { ...item, meta: newMeta })
    updateItem(activeBoardId, item.id, { meta: newMeta })
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 48,
        right: 'calc(var(--sidebar-right-w) + 8px)',
        width: 224,
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: 12,
        zIndex: 'var(--z-panels)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Properties
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
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

      {/* ── Swatch-specific ── */}
      {item.type === 'swatch' && (
        <>
          <Divider label="Palette" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
              style={{ background: 'var(--bg-ui)', border: '1px dashed var(--border)', borderRadius: 3, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, padding: '4px 0' }}
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {STICKY_COLORS.map((bg) => (
              <button
                key={bg}
                title={bg}
                onClick={() => updateMeta({ color: bg })}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 3,
                  border: `2px solid ${(item.meta?.color as string) === bg ? STICKY_COLORS_DISPLAY[bg] ?? '#c8a96e' : 'transparent'}`,
                  background: bg,
                  cursor: 'pointer',
                  padding: 0,
                  outline: 'none',
                }}
              />
            ))}
            <input
              type="color"
              value={(item.meta?.color as string) ?? '#2a2820'}
              onChange={(e) => updateMeta({ color: e.target.value })}
              title="Custom color"
              style={{ width: 22, height: 22, borderRadius: 3, border: '1px solid var(--border)', cursor: 'pointer', padding: 0, background: 'none' }}
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
              value={cssVarToHex((item.meta?.color as string) ?? '#e8ddd0')}
              onChange={(e) => updateMeta({ color: e.target.value })}
              style={{ ...inputStyle, padding: '2px', cursor: 'pointer', height: 24 }}
            />
          </Field>
          <Field label="Align">
            <div style={{ display: 'flex', gap: 4 }}>
              {(['left', 'center', 'right'] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => updateMeta({ align: a })}
                  style={{
                    flex: 1, height: 24, fontSize: 9, borderRadius: 3, cursor: 'pointer',
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
