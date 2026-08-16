import React, { useEffect, useRef } from 'react'
import { useUIStore } from '../store/uiStore'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { nanoid } from 'nanoid'
import { copyImageSrcToClipboard } from '../utils/clipboardImage'
import { createRelicTemplate } from './relicTemplates'
import { useRelicTemplateStore } from './relicTemplateStore'
import { inscribe } from './toasts/inscriptionToastStore'
import { askInscription } from './prompt/inscriptionPromptStore'
import { resolver } from '../keybinds/keybindResolver'
import { Actions } from '../keybinds/actions'

type MenuItem = { label: string; action: () => void; danger?: boolean; divider?: boolean }

export function ContextMenu(): React.ReactElement | null {
  const contextMenu = useUIStore((s) => s.contextMenu)
  const closeContextMenu = useUIStore((s) => s.closeContextMenu)
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)
  const allItems = useCanvasStore((s) => s.items())
  const selectedItems = allItems.filter((i) => selectedIds.includes(i.id))
  const selectedUnlockedItems = selectedItems.filter((i) => !i.locked)
  const selectedLockedItems = selectedItems.filter((i) => i.locked)
  const canGroup = selectedUnlockedItems.length >= 2 && selectedUnlockedItems.some((i) => !i.groupId)
  const canUngroup = selectedUnlockedItems.some((i) => !!i.groupId)
  const canLock = selectedUnlockedItems.length > 0
  const canUnlock = selectedLockedItems.length > 0
  const copyableImage = selectedItems.length === 1 && ['image', 'gif'].includes(selectedItems[0].type) && selectedItems[0].src
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = () => closeContextMenu()
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [closeContextMenu])

  if (!contextMenu) return null

  const hasUnlockedSelection = selectedUnlockedItems.length > 0

  const items: MenuItem[] = [
    ...(hasUnlockedSelection ? [
      {
        label: `Delete  (${selectedUnlockedItems.length})`,
        danger: true,
        action: () => {
          const canvas = useCanvasStore.getState()
          const toDelete = canvas.items().filter((i) => selectedIds.includes(i.id) && !i.locked)
          if (toDelete.length === 0) return
          useHistoryStore.getState().push('ITEM_DELETE', activeBoardId!, toDelete, toDelete.map((i) => ({ id: i.id })))
          canvas.removeItems(activeBoardId!, toDelete.map((i) => i.id))
          canvas.clearSelection()
          closeContextMenu()
        },
      },
      {
        label: 'Duplicate',
        action: () => {
          const canvas = useCanvasStore.getState()
          const originals = canvas.items().filter((i) => selectedIds.includes(i.id) && !i.locked)
          if (originals.length === 0) return
          const copies = originals.map((i) => ({ ...i, id: nanoid(), x: i.x + 20, y: i.y + 20 }))
          copies.forEach((c) => {
            canvas.addItem(activeBoardId!, c)
            useHistoryStore.getState().push('ITEM_ADD', activeBoardId!, null, c)
          })
          canvas.setSelection(copies.map((c) => c.id))
          closeContextMenu()
        },
      },
      {
        label: 'Save as template…',
        action: () => {
          const canvas = useCanvasStore.getState()
          const chosen = canvas.items().filter((i) => selectedIds.includes(i.id) && !i.locked)
          if (chosen.length === 0) return
          const connections = canvas.connections()
          closeContextMenu()
          void askInscription('Name this template:', 'Item set').then((name) => {
            if (!name) return
            const template = createRelicTemplate(name, chosen, connections)
            useRelicTemplateStore.getState().saveTemplate(template)
            inscribe(`Template saved: ${template.name}`)
          })
        },
      },
      {
        label: 'Add Comment Pin  (Ctrl+Shift+M)',
        action: () => {
          resolver.dispatch(Actions.COMMENT_PIN_ADD)
          closeContextMenu()
        },
      },
      ...(copyableImage ? [{
        label: 'Copy Image',
        action: () => {
          copyImageSrcToClipboard(copyableImage)
            .then((ok) => inscribe(ok ? 'Image copied' : 'Could not copy image', ok ? undefined : { tone: 'danger' }))
            .catch((error) => {
              console.error('Failed to copy image:', error)
              inscribe('Could not copy image', { tone: 'danger' })
            })
          closeContextMenu()
        },
      }] : []),
      { divider: true, label: '', action: () => {} },
      {
        label: 'Bring to Front',
        action: () => {
          const canvas = useCanvasStore.getState()
          selectedUnlockedItems.forEach((item) => canvas.reorderItem(activeBoardId!, item.id, 'front'))
          closeContextMenu()
        },
      },
      {
        label: 'Bring Forward',
        action: () => {
          const canvas = useCanvasStore.getState()
          selectedUnlockedItems.forEach((item) => canvas.reorderItem(activeBoardId!, item.id, 'forward'))
          closeContextMenu()
        },
      },
      {
        label: 'Send Backward',
        action: () => {
          const canvas = useCanvasStore.getState()
          selectedUnlockedItems.forEach((item) => canvas.reorderItem(activeBoardId!, item.id, 'backward'))
          closeContextMenu()
        },
      },
      {
        label: 'Send to Back',
        action: () => {
          const canvas = useCanvasStore.getState()
          selectedUnlockedItems.forEach((item) => canvas.reorderItem(activeBoardId!, item.id, 'back'))
          closeContextMenu()
        },
      },
    ] : []),
    ...(canGroup || canUngroup ? [
      { divider: true, label: '', action: () => {} },
      ...(canGroup ? [{
        label: 'Group  (Ctrl+G)',
        action: () => {
          useCanvasStore.getState().groupItems(activeBoardId!, selectedUnlockedItems.map((i) => i.id))
          closeContextMenu()
        },
      }] : []),
      ...(canUngroup ? [{
        label: 'Ungroup  (Ctrl+U)',
        action: () => {
          const groupIds = new Set(
            selectedUnlockedItems.filter((i) => i.groupId).map((i) => i.groupId!)
          )
          groupIds.forEach((gid) => useCanvasStore.getState().ungroupItems(activeBoardId!, gid))
          closeContextMenu()
        },
      }] : []),
    ] : []),
    ...(canLock || canUnlock ? [
      { divider: true, label: '', action: () => {} },
      ...(canLock ? [{
        label: 'Lock  (Ctrl+L)',
        action: () => {
          const canvas = useCanvasStore.getState()
          selectedUnlockedItems.forEach((item) => {
            useHistoryStore.getState().push(
              'ITEM_STYLE',
              activeBoardId!,
              { id: item.id, locked: item.locked },
              { id: item.id, locked: true },
            )
            canvas.updateItem(activeBoardId!, item.id, { locked: true })
          })
          closeContextMenu()
        },
      }] : []),
      ...(canUnlock ? [{
        label: 'Unlock  (Ctrl+L)',
        action: () => {
          const canvas = useCanvasStore.getState()
          selectedLockedItems.forEach((item) => {
            useHistoryStore.getState().push(
              'ITEM_STYLE',
              activeBoardId!,
              { id: item.id, locked: item.locked },
              { id: item.id, locked: false },
            )
            canvas.updateItem(activeBoardId!, item.id, { locked: false })
          })
          closeContextMenu()
        },
      }] : []),
    ] : []),
  ]

  if (items.length === 0) return null

  return (
    <div
      ref={ref}
      className="citadel-context-menu citadel-motion-surface"
      style={{
        position: 'fixed',
        left: contextMenu.x,
        top: contextMenu.y,
        zIndex: 100,
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
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
              fontSize: 'var(--text-base)',
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
