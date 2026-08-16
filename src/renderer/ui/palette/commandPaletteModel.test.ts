import { describe, expect, it, vi } from 'vitest'
import type { CanvasBoard } from '../../../types'
import { Actions } from '../../keybinds/actions'
import { actionLabels } from '../../keybinds/actionLabels'
import { defaultKeybinds } from '../../keybinds/defaultKeybinds'
import { KeybindResolver, serializeEvent } from '../../keybinds/keybindResolver'
import {
  actionCommands,
  boardCommands,
  filterCommands,
  formatCombo,
  groupCommands,
  nextPaletteIndex,
  paletteKeyAction,
  type PaletteCommand,
} from './commandPaletteModel'

function resolverWith(actions: string[], overrides = {}): KeybindResolver {
  const resolver = new KeybindResolver(overrides)
  for (const action of actions) resolver.register(action as never, () => {})
  return resolver
}

const board = (id: string, name: string): CanvasBoard =>
  ({ id, name, items: [], connections: [], viewport: { x: 0, y: 0, scale: 1 } })

describe('the action system is the source of truth', () => {
  it('lists only actions that actually have a handler', () => {
    const resolver = resolverWith([Actions.UNDO, Actions.REDO])
    expect(actionCommands(resolver).map((c) => c.id)).toEqual([Actions.UNDO, Actions.REDO])
  })

  it('lists nothing when no feature has registered yet', () => {
    expect(actionCommands(new KeybindResolver())).toEqual([])
  })

  it('shows the plain label, never the identifier', () => {
    const [command] = actionCommands(resolverWith([Actions.BOARD_NEW]))
    expect(command.label).toBe(actionLabels[Actions.BOARD_NEW])
    expect(command.label).not.toContain(':')
  })

  it('runs a command by dispatching its action, not by calling past it', () => {
    const resolver = new KeybindResolver()
    const handler = vi.fn()
    resolver.register(Actions.UNDO, handler)

    actionCommands(resolver)[0].run()

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('shows the binding the user would actually press', () => {
    const [command] = actionCommands(resolverWith([Actions.UNDO]))
    expect(command.bindings).toContain(formatCombo(defaultKeybinds[Actions.UNDO][0]))
  })

  // The whole reason bindings are read from the resolver rather than from
  // defaultKeybinds: an override has to win here too.
  it('follows a user keybind override rather than the default', () => {
    const resolver = resolverWith([Actions.UNDO], { [Actions.UNDO]: ['alt+backspace'] })
    const [command] = actionCommands(resolver)

    expect(command.bindings).toContain('Alt+Backspace')
    expect(command.bindings).not.toContain('Ctrl+Z')
  })

  it('still lists an action nobody has bound a key to', () => {
    const resolver = resolverWith([Actions.UNDO], { [Actions.UNDO]: [] })
    const [command] = actionCommands(resolver)

    expect(command.bindings).toEqual([])
    expect(command.label).toBe(actionLabels[Actions.UNDO])
  })

  it('does not offer to open the palette from inside the palette', () => {
    const resolver = resolverWith([Actions.PALETTE_TOGGLE, Actions.UNDO])
    expect(actionCommands(resolver).map((c) => c.id)).toEqual([Actions.UNDO])
  })

  it('gives the palette a default binding that nothing else claims', () => {
    const combos = defaultKeybinds[Actions.PALETTE_TOGGLE]
    expect(combos.length).toBeGreaterThan(0)

    const others = Object.entries(defaultKeybinds)
      .filter(([action]) => action !== Actions.PALETTE_TOGGLE)
      .flatMap(([, value]) => value)
    for (const combo of combos) expect(others).not.toContain(combo)
  })
})

describe('formatCombo', () => {
  it('writes modifiers and keys the way a person reads them', () => {
    expect(formatCombo('ctrl+shift+z')).toBe('Ctrl+Shift+Z')
    expect(formatCombo('meta+k')).toBe('Cmd+K')
    expect(formatCombo('escape')).toBe('Esc')
    expect(formatCombo('arrowdown')).toBe('↓')
    expect(formatCombo('v')).toBe('V')
  })

  it('passes through a key it has no special name for', () => {
    expect(formatCombo('f5')).toBe('f5')
  })
})

describe('board commands', () => {
  const boards = [board('b1', 'Shaders'), board('b2', 'Vault')]

  it('offers every board except the one already open', () => {
    expect(boardCommands(boards, 'b1', () => {}).map((c) => c.label)).toEqual(['Go to board: Vault'])
  })

  it('switches board through the same call the navigator makes', () => {
    const setActiveBoard = vi.fn()
    boardCommands(boards, 'b1', setActiveBoard)[0].run()
    expect(setActiveBoard).toHaveBeenCalledWith('b2')
  })

  it('offers nothing when there is only one board', () => {
    expect(boardCommands([board('b1', 'Only')], 'b1', () => {})).toEqual([])
  })
})

describe('filtering', () => {
  const commands: PaletteCommand[] = [
    { id: 'a', label: 'New board', group: 'Actions', bindings: ['Ctrl+Shift+N'], run: () => {} },
    { id: 'b', label: 'Duplicate board', group: 'Actions', bindings: [], run: () => {} },
    { id: 'c', label: 'Undo', group: 'Actions', bindings: ['Ctrl+Z'], run: () => {} },
    { id: 'd', label: 'Go to board: Vault', group: 'Boards', bindings: [], run: () => {} },
  ]

  it('returns everything for an empty query', () => {
    expect(filterCommands(commands, '')).toHaveLength(4)
    expect(filterCommands(commands, '   ')).toHaveLength(4)
  })

  it('matches on the plain label, case-insensitively', () => {
    expect(filterCommands(commands, 'UNDO').map((c) => c.id)).toEqual(['c'])
  })

  it('ranks a prefix match above a match in the middle', () => {
    expect(filterCommands(commands, 'board').map((c) => c.id)[0]).toBe('a')
  })

  it('matches scattered letters, so a half-typed name still finds it', () => {
    expect(filterCommands(commands, 'dpbrd').map((c) => c.id)).toContain('b')
  })

  it('finds a command by the shortcut the user half-remembers', () => {
    expect(filterCommands(commands, 'ctrl+z').map((c) => c.id)).toEqual(['c'])
  })

  it('returns nothing rather than everything for a query that matches none', () => {
    expect(filterCommands(commands, 'zzzz')).toEqual([])
  })
})

describe('keyboard handling', () => {
  it('maps the keys a palette is expected to answer', () => {
    expect(paletteKeyAction('Escape')).toEqual({ type: 'close' })
    expect(paletteKeyAction('ArrowDown')).toEqual({ type: 'move', delta: 1 })
    expect(paletteKeyAction('ArrowUp')).toEqual({ type: 'move', delta: -1 })
    expect(paletteKeyAction('Enter')).toEqual({ type: 'run' })
  })

  it('leaves ordinary typing alone so the query can be edited', () => {
    expect(paletteKeyAction('a')).toEqual({ type: 'none' })
    expect(paletteKeyAction('Backspace')).toEqual({ type: 'none' })
  })

  it('holds Tab so focus cannot leave a dialog that claims to be modal', () => {
    expect(paletteKeyAction('Tab')).toEqual({ type: 'trap' })
  })

  it('clamps at the ends rather than wrapping around', () => {
    expect(nextPaletteIndex(0, 3, -1)).toBe(0)
    expect(nextPaletteIndex(2, 3, 1)).toBe(2)
    expect(nextPaletteIndex(1, 3, 1)).toBe(2)
  })

  it('jumps to either end', () => {
    expect(nextPaletteIndex(2, 5, -Infinity)).toBe(0)
    expect(nextPaletteIndex(0, 5, Infinity)).toBe(4)
  })

  it('has no selection in an empty list', () => {
    expect(nextPaletteIndex(0, 0, 1)).toBe(-1)
  })
})

describe('grouping', () => {
  it('keeps groups in the order they first appear, without empties', () => {
    const groups = groupCommands([
      { id: 'a', label: 'A', group: 'Actions', bindings: [], run: () => {} },
      { id: 'b', label: 'B', group: 'Boards', bindings: [], run: () => {} },
      { id: 'c', label: 'C', group: 'Actions', bindings: [], run: () => {} },
    ])

    expect(groups.map((g) => g.title)).toEqual(['Actions', 'Boards'])
    expect(groups[0].commands.map((c) => c.id)).toEqual(['a', 'c'])
  })

  it('produces no groups for no commands', () => {
    expect(groupCommands([])).toEqual([])
  })
})

/**
 * The palette must not become a second way to trigger things, nor a new way to
 * fire actions while the user is typing.
 */
describe('regression safety', () => {
  it('adds no shortcut of its own beyond the one action', () => {
    const resolver = resolverWith([Actions.UNDO, Actions.BOARD_NEW])
    for (const command of actionCommands(resolver)) {
      // Bindings are read from the resolver, never invented here.
      expect(command.bindings).toEqual(resolver.bindingsFor(command.id as never).map(formatCombo))
    }
  })

  it('opens from the binding through the ordinary resolve path', () => {
    const resolver = new KeybindResolver()
    const open = vi.fn()
    resolver.register(Actions.PALETTE_TOGGLE, open)

    const event = {
      ctrlKey: true, metaKey: false, altKey: false, shiftKey: false,
      key: 'k', preventDefault: () => {},
    } as unknown as KeyboardEvent

    expect(serializeEvent(event)).toBe('ctrl+k')
    expect(resolver.resolve(event)).toBe(true)
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('leaves every other action binding untouched', () => {
    const before = { ...defaultKeybinds }
    expect(before[Actions.UNDO]).toEqual(['ctrl+z', 'meta+z'])
    expect(before[Actions.PANEL_SEARCH]).toBeDefined()
  })

  it('keeps a board row free of any binding, since none exists to press', () => {
    const commands = boardCommands([board('b1', 'A'), board('b2', 'B')], 'b1', () => {})
    expect(commands.every((command) => command.bindings.length === 0)).toBe(true)
  })
})
