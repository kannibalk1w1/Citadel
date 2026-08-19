import React, { useEffect, useRef, useState } from 'react'
import { Actions } from '../keybinds/actions'
import { resolver } from '../keybinds/keybindResolver'
import { useUIStore } from '../store/uiStore'
import { ToolIcon } from './icons/ToolIcon'
import { isBrowserDemo } from '../platform/runtime'

type ProjectDestination = 'boardNavigator' | 'assetLibrary'

export function ProjectMenu(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const closeOnOutsidePress = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return
      setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('mousedown', closeOnOutsidePress)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('mousedown', closeOnOutsidePress)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  const openPanel = (panel: ProjectDestination) => {
    useUIStore.getState().openPanel(panel)
    setIsOpen(false)
  }

  return (
    <div className="citadel-project-menu" ref={menuRef}>
      <button
        type="button"
        className="citadel-project-menu-trigger"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((open) => !open)}
      >
        Project
        <ToolIcon name="chevronDown" size={12} />
      </button>

      {isOpen && (
        <div className="citadel-project-menu-popover" role="menu" aria-label="Project">
          <button type="button" role="menuitem" onClick={() => { resolver.dispatch(Actions.BOARD_NEW); setIsOpen(false) }}>
            New board
          </button>
          <button type="button" role="menuitem" onClick={() => openPanel('boardNavigator')}>
            Boards
          </button>
          <button type="button" role="menuitem" onClick={() => openPanel('assetLibrary')}>
            Items
          </button>
          <div className="citadel-project-menu-divider" role="separator" />
          {isBrowserDemo ? (
            <button type="button" role="menuitem" onClick={() => { resolver.dispatch(Actions.OPEN_SHOWCASE); setIsOpen(false) }}>
              Reset demo
            </button>
          ) : (
            <button type="button" role="menuitem" onClick={() => { resolver.dispatch(Actions.OPEN); setIsOpen(false) }}>
              Open project…
            </button>
          )}
        </div>
      )}
    </div>
  )
}
