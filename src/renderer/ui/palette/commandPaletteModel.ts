import type { ActionName, CanvasBoard } from '../../../types'
import { actionLabel } from '../../keybinds/actionLabels'
import type { KeybindResolver } from '../../keybinds/keybindResolver'
import { Actions } from '../../keybinds/actions'
import { formatCombo } from '../../keybinds/shortcutHint'

/**
 * The palette is a lens over the existing action system, not a catalogue of its
 * own. Rows come from the resolver's registered handlers and their labels from
 * `actionLabels`, so a command can only exist here if it already exists as an
 * `ActionName` with something bound to it — there is nothing to keep in sync.
 */

export { formatCombo }

export type PaletteCommand = {
  /** `ActionName` for an action row; `board:<id>` for a board jump. */
  id: string
  label: string
  group: 'Actions' | 'Boards'
  /** Combos the user could press instead, already formatted for reading. */
  bindings: string[]
  run: () => void
}

/** Actions the palette deliberately does not list, with the reason. */
const HIDDEN_ACTIONS = new Set<string>([
  // Listing "open the palette" inside the palette is a dead row.
  Actions.PALETTE_TOGGLE,
])

/**
 * Every dispatchable action, as palette rows. Order follows registration, which
 * groups related features together in the way the app sets them up.
 */
export function actionCommands(resolver: KeybindResolver): PaletteCommand[] {
  return resolver.registeredActions()
    .filter((action) => !HIDDEN_ACTIONS.has(action))
    .map((action) => ({
      id: action,
      label: actionLabel(action),
      group: 'Actions' as const,
      bindings: resolver.bindingsFor(action).map(formatCombo),
      // Dispatch rather than call: the action's own handler is what pushes
      // events, respects tool mode and feeds undo and recording.
      run: () => { resolver.dispatch(action as ActionName) },
    }))
}

/**
 * Jumping to a named board. Board switching is not an `ActionName` — only
 * next/previous are — so these rows call the same store method the board
 * navigator and tabs use. That path sets no canvas event by design: activating
 * a board is not an edit, so it is not something to undo.
 */
export function boardCommands(
  boards: CanvasBoard[],
  activeBoardId: string | null,
  setActiveBoard: (id: string) => void,
): PaletteCommand[] {
  return boards
    .filter((board) => board.id !== activeBoardId)
    .map((board) => ({
      id: `board:${board.id}`,
      label: `Go to board: ${board.name}`,
      group: 'Boards' as const,
      bindings: [],
      run: () => setActiveBoard(board.id),
    }))
}

/**
 * Subsequence match, so "ndbrd" finds "New board" the way a palette should,
 * while an exact substring still ranks above a scattered one.
 */
function matchScore(label: string, query: string): number | null {
  const haystack = label.toLowerCase()
  const needle = query.toLowerCase()
  if (!needle) return 0

  const direct = haystack.indexOf(needle)
  if (direct === 0) return 0
  if (direct > 0) return 1

  let index = 0
  let gaps = 0
  for (const char of needle) {
    const found = haystack.indexOf(char, index)
    if (found === -1) return null
    gaps += found - index
    index = found + 1
  }
  return 2 + gaps
}

export function filterCommands(commands: PaletteCommand[], query: string): PaletteCommand[] {
  const trimmed = query.trim()
  if (!trimmed) return commands

  const scored: { command: PaletteCommand; score: number; order: number }[] = []
  commands.forEach((command, order) => {
    // A binding is searchable too, so someone who half-remembers the shortcut
    // can find the command by typing it.
    const label = matchScore(command.label, trimmed)
    const binding = command.bindings.some((b) => b.toLowerCase().includes(trimmed.toLowerCase())) ? 1 : null
    const score = label === null ? binding : binding === null ? label : Math.min(label, binding)
    if (score !== null) scored.push({ command, score, order })
  })

  return scored
    .sort((a, b) => (a.score - b.score) || (a.order - b.order))
    .map((entry) => entry.command)
}

export type PaletteKeyAction =
  | { type: 'close' }
  | { type: 'move'; delta: number }
  | { type: 'run' }
  /** Swallowed to keep focus inside the dialog; nothing else happens. */
  | { type: 'trap' }
  | { type: 'none' }

/** Mirrors `indexKeyAction`, so the two panels answer the keyboard alike. */
export function paletteKeyAction(key: string): PaletteKeyAction {
  if (key === 'Escape') return { type: 'close' }
  if (key === 'ArrowDown') return { type: 'move', delta: 1 }
  if (key === 'ArrowUp') return { type: 'move', delta: -1 }
  if (key === 'Home') return { type: 'move', delta: -Infinity }
  if (key === 'End') return { type: 'move', delta: Infinity }
  if (key === 'Enter') return { type: 'run' }
  // The dialog says `aria-modal`, and the input is its only focusable element,
  // so Tab had nowhere to go inside and moved focus onto the canvas behind —
  // leaving an open modal that the keyboard was no longer driving. Holding Tab
  // is the whole trap: there is nothing else in here to cycle between.
  if (key === 'Tab') return { type: 'trap' }
  return { type: 'none' }
}

/** Clamped, not wrapped: the ends of a filtered list should feel like ends. */
export function nextPaletteIndex(current: number, count: number, delta: number): number {
  if (count <= 0) return -1
  if (delta === -Infinity) return 0
  if (delta === Infinity) return count - 1
  return Math.min(count - 1, Math.max(0, current + delta))
}

/** Rows in display order, grouped, for a palette that renders sections. */
export function groupCommands(commands: PaletteCommand[]): { title: string; commands: PaletteCommand[] }[] {
  const groups: { title: string; commands: PaletteCommand[] }[] = []
  for (const command of commands) {
    const existing = groups.find((group) => group.title === command.group)
    if (existing) existing.commands.push(command)
    else groups.push({ title: command.group, commands: [command] })
  }
  return groups
}
