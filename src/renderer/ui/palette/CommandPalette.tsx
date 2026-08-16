import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { resolver } from '../../keybinds/keybindResolver'
import { ToolIcon } from '../icons/ToolIcon'
import {
  actionCommands,
  boardCommands,
  filterCommands,
  groupCommands,
  nextPaletteIndex,
  paletteKeyAction,
  type PaletteCommand,
} from './commandPaletteModel'

/**
 * Keyboard-first launcher over the existing action system.
 *
 * Everything it can do is something the resolver already knows how to do, and
 * running a row dispatches that action rather than reimplementing it — so undo,
 * recording and tool-mode rules apply exactly as they do from the keyboard.
 */
export function CommandPalette(): React.ReactElement | null {
  const isOpen = useUIStore((s) => s.panels.commandPalette)
  const closePanel = useUIStore((s) => s.closePanel)
  const boards = useCanvasStore((s) => s.boards)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)
  const setActiveBoard = useCanvasStore((s) => s.setActiveBoard)

  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Rebuilt per open: handlers register as features mount, and the board list
  // changes underneath. Reading it fresh is what keeps the resolver the source.
  const commands = useMemo(
    () => (isOpen ? [...actionCommands(resolver), ...boardCommands(boards, activeBoardId, setActiveBoard)] : []),
    [isOpen, boards, activeBoardId, setActiveBoard],
  )
  const results = useMemo(() => filterCommands(commands, query), [commands, query])

  useEffect(() => {
    if (!isOpen) return
    setQuery('')
    setActive(0)
    inputRef.current?.focus()
  }, [isOpen])

  useEffect(() => { setActive(0) }, [query])

  useEffect(() => {
    const row = listRef.current?.querySelector('[data-active="true"]')
    // Keeping the selection visible is a nicety, and not every environment
    // implements it; never let it break driving the palette by keyboard.
    if (row && typeof (row as HTMLElement).scrollIntoView === 'function') {
      (row as HTMLElement).scrollIntoView({ block: 'nearest' })
    }
  }, [active, results])

  if (!isOpen) return null

  const close = () => closePanel('commandPalette')

  const run = (command: PaletteCommand | undefined) => {
    if (!command) return
    // Close first: a command that opens another panel should not be immediately
    // covered by the palette it was launched from.
    close()
    command.run()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    const action = paletteKeyAction(event.key)
    if (action.type === 'none') return
    event.preventDefault()
    event.stopPropagation()
    if (action.type === 'close') close()
    if (action.type === 'move') setActive((current) => nextPaletteIndex(current, results.length, action.delta))
    if (action.type === 'run') run(results[active])
  }

  const activeId = results[active] ? `palette-option-${results[active].id}` : undefined
  let renderIndex = -1

  return (
    <div
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal)' as unknown as number,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '12vh',
        background: 'color-mix(in srgb, var(--bg-canvas) 62%, transparent)',
      }}
    >
      <div
        className="citadel-motion-surface"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
        style={{
          width: 'min(560px, calc(100vw - 32px))',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
          <ToolIcon name="search" size={15} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search commands…"
            aria-label="Search commands"
            role="combobox"
            aria-expanded
            aria-controls="palette-listbox"
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            spellCheck={false}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-lg)',
            }}
          />
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>Esc</span>
        </div>

        <div
          ref={listRef}
          id="palette-listbox"
          role="listbox"
          aria-label="Commands"
          style={{ overflowY: 'auto', padding: '4px 0' }}
        >
          {results.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '10px 14px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-md)' }}>
              <ToolIcon name="search" size={14} />
              No commands found
            </div>
          )}

          {groupCommands(results).map((group) => (
            <div key={group.title} role="group" aria-label={group.title}>
              <div style={{ padding: '6px 14px 2px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {group.title}
              </div>
              {group.commands.map((command) => {
                renderIndex += 1
                const index = renderIndex
                const isActive = index === active
                return (
                  <div
                    key={command.id}
                    id={`palette-option-${command.id}`}
                    role="option"
                    aria-selected={isActive}
                    data-active={isActive}
                    onMouseMove={() => setActive(index)}
                    onClick={() => run(command)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'var(--space-4)',
                      padding: '7px 14px',
                      cursor: 'pointer',
                      background: isActive ? 'var(--bg-hover)' : 'transparent',
                      color: isActive ? 'var(--text-accent)' : 'var(--text-primary)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-md)',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{command.label}</span>
                    {command.bindings.length > 0 && (
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', flexShrink: 0 }}>
                        {command.bindings[0]}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
