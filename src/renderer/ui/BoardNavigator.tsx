import React from 'react'
import { nanoid } from 'nanoid'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { useUIStore } from '../store/uiStore'
import { summarizeBoard } from './boardNavigatorModel'
import { boardTemplates, createBoardTemplate, type BoardTemplateId } from './boardTemplates'
import { boardMoodAccent, boardMoodId } from './boardMood'
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
import { stampRelicTemplate, type RelicTemplate } from './relicTemplates'
import { askInscription } from './prompt/inscriptionPromptStore'
import { useRelicTemplateStore } from './relicTemplateStore'
import { activeArchiveRailWidth } from './shell/shellModel'
import { ToolIcon, type ToolIconName } from './icons/ToolIcon'

function RiteLabel({ text }: { text: string }): React.ReactElement {
  return (
    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', minWidth: 40 }}>
      <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)' }}>{value}</span>
      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
    </div>
  )
}

function IconButton({
  icon,
  title,
  danger,
  disabled,
  onClick,
}: {
  icon: ToolIconName
  title: string
  danger?: boolean
  disabled?: boolean
  onClick: () => void
}): React.ReactElement {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
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
        borderRadius: 'var(--radius-sm)',
        color: danger ? 'var(--accent-danger)' : 'var(--text-secondary)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-md)',
        padding: 0,
      }}
    >
      <ToolIcon name={icon} size={14} />
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
  const relicTemplates = useRelicTemplateStore((s) => s.templates)

  React.useEffect(() => {
    if (isOpen) void useRelicTemplateStore.getState().load()
  }, [isOpen])

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
    const id = addBoard(`Chamber ${boards.length + 1}`)
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
      inscribe('This board holds no more bookmarks')
      return
    }
    pushWaystoneEvent(boardId, event)
    inscribe('Bookmark added')
  }

  const jumpToWaystone = (stone: { x: number; y: number; scale: number }) => {
    useCanvasStore.getState().updateViewport({ x: stone.x, y: stone.y, scale: stone.scale })
  }

  const renameWaystone = (boardId: string, id: string, currentName: string) => {
    void askInscription('Rename bookmark:', currentName).then((name) => {
      if (!name) return
      const board = useCanvasStore.getState().boards.find((b) => b.id === boardId)
      if (!board) return
      pushWaystoneEvent(boardId, renameWaystoneEvent(board, id, name))
    })
  }

  const stampTemplate = (template: RelicTemplate) => {
    if (!activeBoardId) return
    const canvas = useCanvasStore.getState()
    const viewport = canvas.viewport()
    const expandedRailWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-right-w') || '228')
    const sidebarW = activeArchiveRailWidth(useUIStore.getState().archiveRailCollapsed, expandedRailWidth)
    const origin = {
      x: ((window.innerWidth - sidebarW) / 2 - viewport.x) / viewport.scale,
      y: (window.innerHeight / 2 - viewport.y) / viewport.scale,
    }
    const stamped = stampRelicTemplate(template, origin)
    stamped.items.forEach((item) => {
      canvas.addItem(activeBoardId, item)
      useHistoryStore.getState().push('ITEM_ADD', activeBoardId, null, item)
    })
    stamped.connections.forEach((connection) => {
      canvas.addConnection(activeBoardId, connection)
      useHistoryStore.getState().push('CONNECTION_ADD', activeBoardId, null, connection)
    })
    canvas.setSelection(stamped.items.map((item) => item.id))
    markDirty()
    inscribe(`Template applied: ${template.name}`)
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
        right: 'calc(var(--context-rail-w) + 8px)',
        width: 360,
        maxHeight: 'calc(100vh - 72px)',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 10,
        zIndex: 'var(--z-panels)',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
        <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontFamily: 'var(--font-display)', color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Boards
        </h3>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <IconButton icon="plus" title="New board" onClick={createBoard} />
          <IconButton icon="close" title="Close" onClick={() => closePanel('boardNavigator')} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)' }}>
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
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              padding: 0,
            }}
          >
            {template.label}
          </button>
        ))}
      </div>

      {activeChamber && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 8 }}>
          <div style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-display)', color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Appearance — {activeChamber.name}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 8px', alignItems: 'center' }}>
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
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                title="Choose a floor texture for this board"
                onClick={() => pickChamberTexture(activeChamber.id)}
                style={{
                  flex: 1,
                  height: 20,
                  background: 'var(--bg-ui)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeIdentity.texture ? activeIdentity.texture.assetPath.split(/[\\/]/).pop() : 'Inherit project floor'}
              </button>
              {activeIdentity.texture && (
                <button
                  type="button"
                  title="Return to the project floor"
                  onClick={() => applyChamberPatch(activeChamber.id, { texture: null })}
                  style={{
                    width: 20,
                    height: 20,
                    background: 'var(--bg-ui)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-sm)',
                    padding: 0,
                  }}
                >
                  x
                </button>
              )}
            </div>
          </div>

          {relicTemplates.length > 0 && (
            <>
              <div style={{ marginTop: 2 }}>
                <RiteLabel text="Item templates" />
              </div>
              {relicTemplates.map((template) => (
                <div key={template.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <button
                    type="button"
                    title={`Add "${template.name}" to this board (${template.items.length} items)`}
                    onClick={() => stampTemplate(template)}
                    style={{
                      flex: 1,
                      height: 20,
                      background: 'var(--bg-ui)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-sm)',
                      overflow: 'hidden',
                      textAlign: 'left',
                      paddingLeft: 8,
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {template.name} · {template.items.length}
                  </button>
                  <IconButton icon="trash" title="Remove template" danger onClick={() => useRelicTemplateStore.getState().removeTemplate(template.id)} />
                </div>
              ))}
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <RiteLabel text="Bookmarks" />
              <IconButton icon="bookmark" title="Bookmark the current view (Alt+W)" onClick={() => plantWaystone(activeChamber.id)} />
          </div>
          {resolveWaystones(activeChamber).map((stone) => (
            <div key={stone.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <button
                type="button"
                title={`Travel to ${stone.name} (Alt+])`}
                onClick={() => jumpToWaystone(stone)}
                style={{
                  flex: 1,
                  height: 20,
                  background: 'var(--bg-ui)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-sm)',
                  overflow: 'hidden',
                  textAlign: 'left',
                  paddingLeft: 8,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {stone.name}
              </button>
              <IconButton icon="edit" title="Rename bookmark" onClick={() => renameWaystone(activeChamber.id, stone.id, stone.name)} />
              <IconButton icon="trash" title="Remove bookmark" danger onClick={() => pushWaystoneEvent(activeChamber.id, removeWaystoneEvent(activeChamber, stone.id))} />
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', overflowY: 'auto', paddingRight: 2 }}>
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
                gap: 'var(--space-4)',
                border: `1px solid ${active ? moodAccent : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                background: active ? 'var(--bg-hover)' : 'transparent',
                padding: 8,
                cursor: 'pointer',
              }}
            >
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-accent)',
                      fontSize: 'var(--text-base)',
                      fontFamily: 'var(--font-body)',
                      padding: '3px 5px',
                      outline: 'none',
                    }}
                  />
                ) : (
                  <div style={{
                    color: active ? moodAccent : 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-base)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {board.name}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--space-2)' }}>
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
                          borderRadius: 'var(--radius-sm)',
                          color: selected ? 'var(--bg-canvas)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 'var(--text-xs)',
                          padding: 0,
                          textTransform: 'uppercase',
                        }}
                      >
                        {preset.label.slice(0, 3)}
                      </button>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
                  <Stat label="items" value={summary.itemCount} />
                  <Stat label="visible" value={summary.visibleCount} />
                  <Stat label="notes" value={summary.commentCount} />
                  <Stat label="show" value={summary.presentationCount} />
                  <Stat label="links" value={summary.connectionCount} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <IconButton icon="edit" title="Rename" onClick={() => startRename(board.id, board.name)} />
                <IconButton icon="duplicate" title="Duplicate" onClick={() => cloneBoard(board.id)} />
                <IconButton icon="trash" title="Delete" danger disabled={boards.length <= 1} onClick={() => deleteBoard(board.id)} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
