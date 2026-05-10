import React, { useEffect, useRef } from 'react'
import { useUIStore } from '../store/uiStore'
import { useCanvasStore } from '../store/canvasStore'
import { useMascotStore } from '../store/mascotStore'
import { useHistoryStore } from '../store/historyStore'
import { nanoid } from 'nanoid'

type MenuItem = { label: string; action: () => void; danger?: boolean; divider?: boolean }

export function ContextMenu(): React.ReactElement | null {
  const contextMenu = useUIStore((s) => s.contextMenu)
  const closeContextMenu = useUIStore((s) => s.closeContextMenu)
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)
  const allItems = useCanvasStore((s) => s.items())
  const selectedItems = allItems.filter((i) => selectedIds.includes(i.id))
  const canGroup = selectedIds.length >= 2 && selectedItems.some((i) => !i.groupId)
  const canUngroup = selectedItems.some((i) => !!i.groupId)
  const triggerEffect = useMascotStore((s) => s.triggerEffect)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = () => closeContextMenu()
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [closeContextMenu])

  if (!contextMenu) return null

  const hasSelection = selectedIds.length > 0

  const items: MenuItem[] = [
    ...(hasSelection ? [
      {
        label: `Delete  (${selectedIds.length})`,
        danger: true,
        action: () => {
          const canvas = useCanvasStore.getState()
          const toDelete = canvas.items().filter((i) => selectedIds.includes(i.id))
          useHistoryStore.getState().push('ITEM_DELETE', activeBoardId!, toDelete, toDelete.map((i) => ({ id: i.id })))
          canvas.removeItems(activeBoardId!, selectedIds)
          canvas.clearSelection()
          triggerEffect('crumble')
          closeContextMenu()
        },
      },
      {
        label: 'Duplicate',
        action: () => {
          const canvas = useCanvasStore.getState()
          const originals = canvas.items().filter((i) => selectedIds.includes(i.id))
          const copies = originals.map((i) => ({ ...i, id: nanoid(), x: i.x + 20, y: i.y + 20 }))
          copies.forEach((c) => {
            canvas.addItem(activeBoardId!, c)
            useHistoryStore.getState().push('ITEM_ADD', activeBoardId!, null, c)
          })
          canvas.setSelection(copies.map((c) => c.id))
          closeContextMenu()
        },
      },
      { divider: true, label: '', action: () => {} },
      {
        label: 'Bring to Front',
        action: () => {
          const canvas = useCanvasStore.getState()
          selectedIds.forEach((id) => canvas.reorderItem(activeBoardId!, id, 'front'))
          closeContextMenu()
        },
      },
      {
        label: 'Bring Forward',
        action: () => {
          const canvas = useCanvasStore.getState()
          selectedIds.forEach((id) => canvas.reorderItem(activeBoardId!, id, 'forward'))
          closeContextMenu()
        },
      },
      {
        label: 'Send Backward',
        action: () => {
          const canvas = useCanvasStore.getState()
          selectedIds.forEach((id) => canvas.reorderItem(activeBoardId!, id, 'backward'))
          closeContextMenu()
        },
      },
      {
        label: 'Send to Back',
        action: () => {
          const canvas = useCanvasStore.getState()
          selectedIds.forEach((id) => canvas.reorderItem(activeBoardId!, id, 'back'))
          closeContextMenu()
        },
      },
    ] : []),
    ...(canGroup || canUngroup ? [
      { divider: true, label: '', action: () => {} },
      ...(canGroup ? [{
        label: 'Group  (Ctrl+G)',
        action: () => {
          useCanvasStore.getState().groupItems(activeBoardId!, selectedIds)
          closeContextMenu()
        },
      }] : []),
      ...(canUngroup ? [{
        label: 'Ungroup  (Ctrl+U)',
        action: () => {
          const groupIds = new Set(
            selectedItems.filter((i) => i.groupId).map((i) => i.groupId!)
          )
          groupIds.forEach((gid) => useCanvasStore.getState().ungroupItems(activeBoardId!, gid))
          closeContextMenu()
        },
      }] : []),
    ] : []),
  ]

  if (items.length === 0) return null

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: contextMenu.x,
        top: contextMenu.y,
        zIndex: 100,
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '4px 0',
        minWidth: 160,
        boxShadow: 'var(--shadow-lg)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, i) =>
        item.divider ? (
          <div key={i} style={{ height: 1, background: 'var(--border)', margin: '3px 0' }} />
        ) : (
          <button
            key={i}
            onClick={item.action}
            style={{
              display: 'block',
              width: '100%',
              padding: '6px 14px',
              background: 'transparent',
              border: 'none',
              textAlign: 'left',
              fontSize: 12,
              fontFamily: 'var(--font-body)',
              color: item.danger ? 'var(--accent-danger)' : 'var(--text-primary)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  )
}
