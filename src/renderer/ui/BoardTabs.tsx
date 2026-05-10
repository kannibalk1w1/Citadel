import React, { useState, useRef, useEffect } from 'react'
import { useCanvasStore } from '../store/canvasStore'

export function BoardTabs(): React.ReactElement {
  const boards = useCanvasStore((s) => s.boards)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)
  const setActiveBoard = useCanvasStore((s) => s.setActiveBoard)
  const addBoard = useCanvasStore((s) => s.addBoard)
  const removeBoard = useCanvasStore((s) => s.removeBoard)
  const renameBoard = useCanvasStore((s) => s.renameBoard)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId) inputRef.current?.select()
  }, [editingId])

  function startEdit(id: string, name: string) {
    setEditingId(id)
    setEditValue(name)
  }

  function commitEdit() {
    if (editingId && editValue.trim()) renameBoard(editingId, editValue.trim())
    setEditingId(null)
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 40,
        display: 'flex',
        alignItems: 'stretch',
        background: 'var(--bg-ui)',
        borderBottom: '1px solid var(--border)',
        zIndex: 20,
        paddingLeft: 4,
        gap: 2,
        overflow: 'hidden',
      }}
    >
      {boards.map((board) => (
        <div
          key={board.id}
          onClick={() => setActiveBoard(board.id)}
          onDoubleClick={() => startEdit(board.id, board.name)}
          style={{
            height: '100%',
            padding: '0 10px',
            borderBottom: board.id === activeBoardId ? '2px solid var(--accent)' : '2px solid transparent',
            background: board.id === activeBoardId ? 'var(--bg-panel)' : 'transparent',
            color: board.id === activeBoardId ? 'var(--text-accent)' : 'var(--text-secondary)',
            fontSize: 12,
            fontFamily: 'var(--font-body)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          {editingId === board.id ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit()
                if (e.key === 'Escape') setEditingId(null)
                e.stopPropagation()
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-ui)',
                border: '1px solid var(--accent)',
                borderRadius: 3,
                color: 'var(--text-accent)',
                fontSize: 12,
                fontFamily: 'var(--font-body)',
                padding: '1px 4px',
                outline: 'none',
                width: Math.max(60, editValue.length * 8),
              }}
            />
          ) : (
            board.name
          )}
          {boards.length > 1 && editingId !== board.id && (
            <span
              onClick={(e) => { e.stopPropagation(); removeBoard(board.id) }}
              style={{ opacity: 0.35, fontSize: 14, lineHeight: 1, marginLeft: 2, paddingBottom: 1 }}
            >
              ×
            </span>
          )}
        </div>
      ))}
      <button
        onClick={() => {
          const id = addBoard(`Board ${boards.length + 1}`)
          setActiveBoard(id)
        }}
        style={{
          padding: '0 10px',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: 18,
          cursor: 'pointer',
          lineHeight: 1,
        }}
        title="New board (Ctrl+Shift+N)"
      >
        +
      </button>
    </div>
  )
}
