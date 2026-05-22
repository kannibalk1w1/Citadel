import React from 'react'
import { nanoid } from 'nanoid'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { useUIStore } from '../store/uiStore'
import { summarizeBoard } from './boardNavigatorModel'
import { boardTemplates, createBoardTemplate, type BoardTemplateId } from './boardTemplates'

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
  const markDirty = useHistoryStore((s) => s.markDirty)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [draftName, setDraftName] = React.useState('')

  if (!isOpen) return null

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, overflowY: 'auto', paddingRight: 2 }}>
        {boards.map((board) => {
          const active = board.id === activeBoardId
          const summary = summarizeBoard(board)
          return (
            <div
              key={board.id}
              className="citadel-list-row"
              onClick={() => setActiveBoard(board.id)}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 8,
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
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
                    color: active ? 'var(--text-accent)' : 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {board.name}
                  </div>
                )}
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
