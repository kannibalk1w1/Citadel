import React from 'react'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { Actions } from '../../keybinds/actions'
import { resolver } from '../../keybinds/keybindResolver'
import { selectedActionStripPositionForSelection } from './boardChromeViewModel'

function Icon({ name }: { name: 'props' | 'link' | 'tag' | 'connect' | 'lock' | 'copy' | 'front' | 'delete' | 'flipH' | 'flipV' }): React.ReactElement {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'props':
      return <svg width="15" height="15" viewBox="0 0 16 16" {...common}><path d="M3 3h10M3 8h10M3 13h10" /><circle cx="6" cy="3" r="1.3" fill="currentColor" stroke="none" /><circle cx="10" cy="8" r="1.3" fill="currentColor" stroke="none" /><circle cx="7" cy="13" r="1.3" fill="currentColor" stroke="none" /></svg>
    case 'link':
      return <svg width="15" height="15" viewBox="0 0 16 16" {...common}><path d="M6.5 10 9.5 7" /><path d="M6.8 5.2 8 4a3 3 0 0 1 4.2 4.2L11 9.4" /><path d="M9.2 10.8 8 12a3 3 0 0 1-4.2-4.2L5 6.6" /></svg>
    case 'tag':
      return <svg width="15" height="15" viewBox="0 0 16 16" {...common}><path d="M3 3h6l4 5-4 5H3z" /><circle cx="6" cy="8" r="1" fill="currentColor" stroke="none" /></svg>
    case 'connect':
      return <svg width="15" height="15" viewBox="0 0 16 16" {...common}><circle cx="4" cy="8" r="2" /><circle cx="12" cy="8" r="2" /><path d="M6 8h4" /></svg>
    case 'lock':
      return <svg width="15" height="15" viewBox="0 0 16 16" {...common}><rect x="3.5" y="7" width="9" height="6" rx="1" /><path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7" /></svg>
    case 'copy':
      return <svg width="15" height="15" viewBox="0 0 16 16" {...common}><rect x="5" y="5" width="8" height="8" rx="1" /><path d="M3 10V3h7" /></svg>
    case 'front':
      return <svg width="15" height="15" viewBox="0 0 16 16" {...common}><rect x="3" y="6" width="7" height="7" rx="1" /><rect x="6" y="3" width="7" height="7" rx="1" /></svg>
    case 'delete':
      return <svg width="15" height="15" viewBox="0 0 16 16" {...common}><path d="M3 4h10M6 4V3h4v1M5 6l.5 7h5L12 6" /></svg>
    case 'flipH':
      return <svg width="15" height="15" viewBox="0 0 16 16" {...common}><path d="M8 2v12" strokeDasharray="2 2" /><path d="M6 5 3 8l3 3" /><path d="M10 5l3 3-3 3" /></svg>
    case 'flipV':
      return <svg width="15" height="15" viewBox="0 0 16 16" {...common}><path d="M2 8h12" strokeDasharray="2 2" /><path d="M5 6 8 3l3 3" /><path d="M5 10l3 3 3-3" /></svg>
  }
}

function ActionButton({ title, icon, danger = false, onClick }: {
  title: string
  icon: React.ComponentProps<typeof Icon>['name']
  danger?: boolean
  onClick: () => void
}): React.ReactElement {
  return (
    <button
      title={title}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      style={{
        width: 28,
        height: 28,
        borderRadius: 3,
        border: '1px solid var(--border-muted)',
        background: 'var(--bg-ui)',
        color: danger ? 'var(--accent-danger)' : 'var(--text-secondary)',
        display: 'grid',
        placeItems: 'center',
        cursor: 'pointer',
      }}
    >
      <Icon name={icon} />
    </button>
  )
}

export function SelectedActionStrip(): React.ReactElement | null {
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const items = useCanvasStore((s) => s.items())
  const viewport = useCanvasStore((s) => s.viewport())
  const setToolMode = useUIStore((s) => s.setToolMode)
  const openPanel = useUIStore((s) => s.openPanel)

  const selectedItems = items.filter((candidate) => selectedIds.includes(candidate.id))
  if (selectedItems.length === 0) return null
  const single = selectedItems.length === 1
  const item = selectedItems[0]

  const position = selectedActionStripPositionForSelection(selectedItems, viewport)
  if (!position) return null
  const anyUnlocked = selectedItems.some((candidate) => !candidate.locked)
  const flippable = selectedItems.some((candidate) => candidate.type === 'image' || candidate.type === 'gif')
  const startMode = (mode: 'connect' | 'link' | 'tag') => {
    setToolMode(mode)
    if (mode === 'connect') useUIStore.getState().setConnectFromId(item.id)
  }

  return (
    <div
      className="citadel-action-strip"
      style={{
        position: 'absolute',
        left: position.left,
        top: position.top,
        transform: position.transform,
        zIndex: 'var(--z-panels)',
        display: 'flex',
        gap: 4,
        padding: 4,
        border: '1px solid var(--border)',
        borderRadius: 4,
        background: 'linear-gradient(180deg, #17130f 0%, #0a0908 100%)',
        boxShadow: '0 10px 24px rgba(0,0,0,0.72)',
        pointerEvents: 'auto',
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {single && <ActionButton title="Properties" icon="props" onClick={() => openPanel('itemProperties')} />}
      {single && <ActionButton title="Connect" icon="connect" onClick={() => startMode('connect')} />}
      {single && <ActionButton title="Link" icon="link" onClick={() => startMode('link')} />}
      {single && <ActionButton title="Tag" icon="tag" onClick={() => startMode('tag')} />}
      {flippable && <ActionButton title="Flip horizontal (Shift+H)" icon="flipH" onClick={() => resolver.dispatch(Actions.FLIP_H)} />}
      {flippable && <ActionButton title="Flip vertical (Shift+V)" icon="flipV" onClick={() => resolver.dispatch(Actions.FLIP_V)} />}
      <ActionButton title={anyUnlocked ? 'Lock' : 'Unlock'} icon="lock" onClick={() => resolver.dispatch(Actions.TOGGLE_LOCK)} />
      <ActionButton title="Duplicate" icon="copy" onClick={() => resolver.dispatch(Actions.DUPLICATE)} />
      <ActionButton title="Bring to front" icon="front" onClick={() => resolver.dispatch(Actions.BRING_FRONT)} />
      <ActionButton title="Delete" icon="delete" danger onClick={() => resolver.dispatch(Actions.DELETE)} />
    </div>
  )
}

