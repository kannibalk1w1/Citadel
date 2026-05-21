import React, { useState, useRef, useEffect } from 'react'
import type { CanvasBoard } from '../../types'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'

const THUMB_W = 52
const THUMB_H = 28

function itemColour(type: string, meta?: Record<string, unknown>): string {
  switch (type) {
    case 'image':
    case 'gif':
    case 'video':
    case 'youtube':   return '#2a3540'
    case 'sticky':    return (meta?.color as string) ?? '#2a2820'
    case 'text':      return '#1e2a1e'
    case 'swatch':    return '#3a2a1a'
    case 'comparison': return '#2e2420'
    case 'audio':
    case 'model3d':   return '#2a2035'
    default:          return '#2e2820'
  }
}

function BoardThumbnail({ board, active }: { board: CanvasBoard; active: boolean }): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, THUMB_W, THUMB_H)
    ctx.fillStyle = '#221d18'
    ctx.fillRect(0, 0, THUMB_W, THUMB_H)

    if (board.items.length === 0) {
      ctx.fillStyle = '#5c5040'
      ctx.font = '7px JetBrains Mono, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('empty', THUMB_W / 2, THUMB_H / 2 + 3)
      return
    }

    const allX = board.items.flatMap((i) => [i.x, i.x + i.width])
    const allY = board.items.flatMap((i) => [i.y, i.y + i.height])
    const minX = Math.min(...allX), maxX = Math.max(...allX)
    const minY = Math.min(...allY), maxY = Math.max(...allY)
    const sceneW = maxX - minX || 1
    const sceneH = maxY - minY || 1
    const scale = Math.min((THUMB_W - 8) / sceneW, (THUMB_H - 6) / sceneH)
    const ox = (THUMB_W - sceneW * scale) / 2 - minX * scale
    const oy = (THUMB_H - sceneH * scale) / 2 - minY * scale

    for (const item of board.items) {
      ctx.fillStyle = itemColour(item.type, item.meta)
      ctx.fillRect(
        item.x * scale + ox,
        item.y * scale + oy,
        Math.max(1, item.width * scale),
        Math.max(1, item.height * scale),
      )
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 0.5
      ctx.strokeRect(
        item.x * scale + ox,
        item.y * scale + oy,
        Math.max(1, item.width * scale),
        Math.max(1, item.height * scale),
      )
    }
  }, [board.items])

  return (
    <canvas
      ref={canvasRef}
      width={THUMB_W}
      height={THUMB_H}
      aria-hidden="true"
      style={{
        width: THUMB_W,
        height: THUMB_H,
        borderRadius: 3,
        border: active ? '1px solid rgba(200,169,110,0.75)' : '1px solid var(--border)',
        boxShadow: active ? '0 0 8px rgba(200,169,110,0.18)' : 'none',
        opacity: active ? 1 : 0.72,
        flexShrink: 0,
        pointerEvents: 'none',
      }}
    />
  )
}

export function BoardTabs(): React.ReactElement {
  const boards = useCanvasStore((s) => s.boards)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)
  const setActiveBoard = useCanvasStore((s) => s.setActiveBoard)
  const addBoard = useCanvasStore((s) => s.addBoard)
  const removeBoard = useCanvasStore((s) => s.removeBoard)
  const renameBoard = useCanvasStore((s) => s.renameBoard)
  const markDirty = useHistoryStore((s) => s.markDirty)

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
    if (editingId && editValue.trim()) {
      renameBoard(editingId, editValue.trim())
      markDirty()
    }
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
            padding: '0 8px',
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
            minWidth: 0,
          }}
        >
          <BoardThumbnail board={board} active={board.id === activeBoardId} />
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
              onClick={(e) => { e.stopPropagation(); removeBoard(board.id); markDirty() }}
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
          markDirty()
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
