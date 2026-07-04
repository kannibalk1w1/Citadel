import React from 'react'
import { nanoid } from 'nanoid'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { useUIStore } from '../store/uiStore'
import { summarizeBoard } from './boardNavigatorModel'
import { boardTemplates, createBoardTemplate, type BoardTemplateId } from './boardTemplates'
import { boardMoodAccent, boardMoodId } from './boardMood'
import { useMascotStore } from '../store/mascotStore'
import {
  CHAMBER_MOOD_PRESETS,
  chamberIdentityEvent,
  resolveChamberIdentity,
  type ChamberIdentityPatch,
  type ChamberMoodPreset,
} from '../canvas/chamberIdentity'
import {
  plantWaystoneEvent,
  removeWaystoneEvent,
  renameWaystoneEvent,
  resolveWaystones,
} from '../canvas/chamberWaystones'
import { inscribe } from './toasts/inscriptionToastStore'

function RiteLabel({ text }: { text: string }): React.ReactElement {
  return (
    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {text}
    </span>
  )
}

// Commits on release (not every drag tick) so one adjustment = one undo step.
function RiteSlider({
  value,
  disabled,
  onCommit,
}: {
  value: number
  disabled?: boolean
  onCommit: (value: number) => void
}): React.ReactElement {
  const [draft, setDraft] = React.useState<number | null>(null)
  return (
    <input
      type="range"
      min={0}
      max={1}
      step={0.05}
      disabled={disabled}
      value={draft ?? value}
      onChange={(e) => setDraft(Number(e.target.value))}
      onMouseUp={() => {
        if (draft !== null && draft !== value) onCommit(draft)
        setDraft(null)
      }}
      onKeyUp={() => {
        if (draft !== null && draft !== value) onCommit(draft)
        setDraft(null)
      }}
      style={{ width: '100%', accentColor: 'var(--accent)', opacity: disabled ? 0.35 : 1 }}
    />
  )
}

function Stat({ label, value }: { label: string; value: number }): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 40 }}>
      <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{value}</span>
      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
    </div>
  )
}

function IconButton({
  label,
  title,
  danger,
  disabled,
  onClick,
}: {
  label: string
  title: string
  danger?: boolean
  disabled?: boolean
  onClick: () => void
}): React.ReactElement {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      style={{
        width: 24,
        height: 22,
        background: 'var(--bg-ui)',
        border: '1px solid var(--border)',
        borderRadius: 3,
        color: danger ? 'var(--accent-danger)' : 'var(--text-secondary)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        padding: 0,
      }}
    >
      {label}
    </button>
  )
}

export function BoardNavigator(): React.ReactElement | null {
  const isOpen = useUIStore((s) => s.panels.boardNavigator)
  const closePanel = useUIStore((s) => s.closePanel)
  const boards = useCanvasStore((s) => s.boards)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)
  const setActiveBoard = useCanvasStore((s) => s.setActiveBoard)
  const addBoard = useCanvasStore((s) => s.addBoard)
  const addItem = useCanvasStore((s) => s.addItem)
  const addConnection = useCanvasStore((s) => s.addConnection)
  const setViewport = useCanvasStore((s) => s.setViewport)
  const duplicateBoard = useCanvasStore((s) => s.duplicateBoard)
  const removeBoard = useCanvasStore((s) => s.removeBoard)
  const renameBoard = useCanvasStore((s) => s.renameBoard)
  const updateBoardMeta = useCanvasStore((s) => s.updateBoardMeta)
  const markDirty = useHistoryStore((s) => s.markDirty)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [draftName, setDraftName] = React.useState('')

  if (!isOpen) return null

  const activeChamber = boards.find((b) => b.id === activeBoardId) ?? null
  const activeIdentity = activeChamber ? resolveChamberIdentity(activeChamber) : resolveChamberIdentity({ id: '', name: '', items: [], connections: [], viewport: { x: 0, y: 0, scale: 1 } })

  const startRename = (id: string, name: string) => {
    setEditingId(id)
    setDraftName(name)
  }

  const commitRename = () => {
    if (editingId && draftName.trim()) {
      renameBoard(editingId, draftName.trim())
      markDirty()
    }
    setEditingId(null)
  }

  const createBoard = () => {
    const id = addBoard(`Board ${boards.length + 1}`)
    setActiveBoard(id)
    markDirty()
  }

  const createTemplateBoard = (templateId: BoardTemplateId) => {
    const template = createBoardTemplate(templateId, nanoid)
    const id = addBoard(template.name)
    template.items.forEach((item) => addItem(id, item))
    template.connections.forEach((connection) => addConnection(id, connection))
    setViewport(id, template.viewport)
    setActiveBoard(id)
    markDirty()
  }

  const cloneBoard = (id: string) => {
    const nextId = duplicateBoard(id)
    if (nextId) markDirty()
  }

  const deleteBoard = (id: string) => {
    if (boards.length <= 1) return
    removeBoard(id)
    markDirty()
  }

  const applyChamberPatch = (id: string, patch: ChamberIdentityPatch) => {
    const board = boards.find((b) => b.id === id)
    if (!board) return
    const { before, after } = chamberIdentityEvent(board, patch)
    useHistoryStore.getState().push('BOARD_STYLE', id, before, after)
    updateBoardMeta(id, after)
    markDirty()
  }

  const setBoardMood = (id: string, preset: ChamberMoodPreset) => {
    applyChamberPatch(id, { mood: preset.id, accent: preset.accent })
    useMascotStore.getState().triggerEffect('rune-seal')
  }

  const pushWaystoneEvent = (boardId: string, event: { before: Record<string, unknown>; after: Record<string, unknown> } | null) => {
    if (!event) return
    useHistoryStore.getState().push('BOARD_STYLE', boardId, event.before, event.after)
    updateBoardMeta(boardId, event.after)
    markDirty()
  }

  const plantWaystone = (boardId: string) => {
    const board = boards.find((b) => b.id === boardId)
    if (!board) return
    const viewport = useCanvasStore.getState().viewport()
    const stones = resolveWaystones(board)
    const event = plantWaystoneEvent(board, {
      id: nanoid(),
      name: `Waystone ${stones.length + 1}`,
      x: viewport.x,
      y: viewport.y,
      scale: viewport.scale,
    })
    if (!event) {
      inscribe('The chamber holds no more waystones')
      return
    }
    pushWaystoneEvent(boardId, event)
    inscribe('Waystone planted')
  }

  const jumpToWaystone = (stone: { x: number; y: number; scale: number }) => {
    useCanvasStore.getState().updateViewport({ x: stone.x, y: stone.y, scale: stone.scale })
  }

  const renameWaystone = (boardId: string, id: string, currentName: string) => {
    const board = boards.find((b) => b.id === boardId)
    if (!board) return
    const name = window.prompt('Rename waystone:', currentName)
    if (!name || !name.trim()) return
    pushWaystoneEvent(boardId, renameWaystoneEvent(board, id, name.trim()))
  }

  const pickChamberTexture = async (id: string) => {
    const ipc = (window as unknown as { ipc: { invoke: (ch: string, args?: unknown) => Promise<unknown> } }).ipc
    const result = (await ipc.invoke('file:openDialog', {
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    })) as { path?: string | null } | null
    if (!result?.path) return
    applyChamberPatch(id, { texture: { assetPath: result.path, opacity: 0.62, scale: 1, repeat: true } })
  }

  return (
    <div
      className="citadel-floating-panel"
      style={{
        position: 'absolute',
        top: 48,
        right: 'calc(var(--sidebar-right-w) + 8px)',
        width: 360,
        maxHeight: 'calc(100vh - 72px)',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: 10,
        zIndex: 'var(--z-panels)',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Boards
        </h3>
        <div style={{ display: 'flex', gap: 4 }}>
          <IconButton label="+" title="New board" onClick={createBoard} />
          <IconButton label="x" title="Close" onClick={() => closePanel('boardNavigator')} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
        {boardTemplates.map((template) => (
          <button
            key={template.id}
            type="button"
            title={template.title}
            onClick={() => createTemplateBoard(template.id)}
            style={{
              height: 24,
              background: 'var(--bg-ui)',
              border: '1px solid var(--border)',
              borderRadius: 3,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              padding: 0,
            }}
          >
            {template.label}
          </button>
        ))}
      </div>

      {activeChamber && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid var(--border)', borderRadius: 5, padding: 8 }}>
          <div style={{ fontSize: 9, fontFamily: 'var(--font-display)', color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Chamber Rite — {activeChamber.name}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 8px', alignItems: 'center' }}>
            <RiteLabel text="Ambience" />
            <select
              value={activeIdentity.ambience}
              onChange={(e) => applyChamberPatch(activeChamber.id, { ambience: e.target.value as 'none' | 'motes' | 'fog' })}
              style={{
                background: 'var(--bg-ui)',
                border: '1px solid var(--border)',
                borderRadius: 3,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                padding: '2px 4px',
              }}
            >
              <option value="none">Still</option>
              <option value="motes">Motes</option>
              <option value="fog">Fog</option>
            </select>
            <RiteLabel text="Presence" />
            <RiteSlider
              value={activeIdentity.ambienceIntensity}
              disabled={activeIdentity.ambience === 'none'}
              onCommit={(value) => applyChamberPatch(activeChamber.id, { ambienceIntensity: value })}
            />
            <RiteLabel text="Vignette" />
            <RiteSlider
              value={activeIdentity.vignette}
              onCommit={(value) => applyChamberPatch(activeChamber.id, { vignette: value })}
            />
            <RiteLabel text="Glow" />
            <RiteSlider
              value={activeIdentity.glow}
              onCommit={(value) => applyChamberPatch(activeChamber.id, { glow: value })}
            />
            <RiteLabel text="Floor" />
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                title="Choose a floor texture for this chamber"
                onClick={() => pickChamberTexture(activeChamber.id)}
                style={{
                  flex: 1,
                  height: 20,
                  background: 'var(--bg-ui)',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeIdentity.texture ? activeIdentity.texture.assetPath.split(/[\\/]/).pop() : 'Inherit archive floor'}
              </button>
              {activeIdentity.texture && (
                <button
                  type="button"
                  title="Return to the archive floor"
                  onClick={() => applyChamberPatch(activeChamber.id, { texture: null })}
                  style={{
                    width: 20,
                    height: 20,
                    background: 'var(--bg-ui)',
                    border: '1px solid var(--border)',
                    borderRadius: 3,
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    padding: 0,
                  }}
                >
                  x
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <RiteLabel text="Waystones" />
            <IconButton label="+" title="Plant a waystone at the current view (Alt+W)" onClick={() => plantWaystone(activeChamber.id)} />
          </div>
          {resolveWaystones(activeChamber).map((stone) => (
            <div key={stone.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                title={`Travel to ${stone.name} (Alt+])`}
                onClick={() => jumpToWaystone(stone)}
                style={{
                  flex: 1,
                  height: 20,
                  background: 'var(--bg-ui)',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  overflow: 'hidden',
                  textAlign: 'left',
                  paddingLeft: 8,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {stone.name}
              </button>
              <IconButton label="r" title="Rename waystone" onClick={() => renameWaystone(activeChamber.id, stone.id, stone.name)} />
              <IconButton label="-" title="Remove waystone" danger onClick={() => pushWaystoneEvent(activeChamber.id, removeWaystoneEvent(activeChamber, stone.id))} />
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, overflowY: 'auto', paddingRight: 2 }}>
        {boards.map((board) => {
          const active = board.id === activeBoardId
          const summary = summarizeBoard(board)
          const mood = boardMoodId(board)
          const moodAccent = boardMoodAccent(board)
          return (
            <div
              key={board.id}
              className="citadel-list-row"
              onClick={() => setActiveBoard(board.id)}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 8,
                border: `1px solid ${active ? moodAccent : 'var(--border)'}`,
                borderRadius: 5,
                background: active ? 'var(--bg-hover)' : 'transparent',
                padding: 8,
                cursor: 'pointer',
              }}
            >
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {editingId === board.id ? (
                  <input
                    autoFocus
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') commitRename()
                      if (event.key === 'Escape') setEditingId(null)
                      event.stopPropagation()
                    }}
                    onClick={(event) => event.stopPropagation()}
                    style={{
                      background: 'var(--bg-ui)',
                      border: '1px solid var(--accent)',
                      borderRadius: 3,
                      color: 'var(--text-accent)',
                      fontSize: 12,
                      fontFamily: 'var(--font-body)',
                      padding: '3px 5px',
                      outline: 'none',
                    }}
                  />
                ) : (
                  <div style={{
                    color: active ? moodAccent : 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {board.name}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 3 }}>
                  {CHAMBER_MOOD_PRESETS.map((preset) => {
                    const selected = mood === preset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        title={`${preset.label} mood`}
                        onClick={(event) => {
                          event.stopPropagation()
                          setBoardMood(board.id, preset)
                        }}
                        style={{
                          height: 18,
                          background: selected ? preset.accent : 'var(--bg-ui)',
                          border: `1px solid ${selected ? preset.accent : 'var(--border)'}`,
                          borderRadius: 3,
                          color: selected ? 'var(--bg-canvas)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 8,
                          padding: 0,
                          textTransform: 'uppercase',
                        }}
                      >
                        {preset.label.slice(0, 3)}
                      </button>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Stat label="items" value={summary.itemCount} />
                  <Stat label="visible" value={summary.visibleCount} />
                  <Stat label="notes" value={summary.commentCount} />
                  <Stat label="show" value={summary.presentationCount} />
                  <Stat label="links" value={summary.connectionCount} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <IconButton label="r" title="Rename" onClick={() => startRename(board.id, board.name)} />
                <IconButton label="d" title="Duplicate" onClick={() => cloneBoard(board.id)} />
                <IconButton label="-" title="Delete" danger disabled={boards.length <= 1} onClick={() => deleteBoard(board.id)} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
