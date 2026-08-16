import { useHistoryStore } from './historyStore'
import { replayEvent, revertEvent } from './canvasEventApply'
import { clampCursor, travelPlan } from '../ui/timeMachineModel'

/**
 * Moving the board to any point in its own history.
 *
 * Deliberately implemented as repeated undo and redo rather than as a second
 * way of applying events. The log is the same one the keyboard walks, so a
 * scrub to position N leaves the board exactly where pressing Ctrl+Z that many
 * times would have — there is no second code path to fall out of step.
 */
export function travelHistoryTo(target: number): number {
  const { events } = useHistoryStore.getState()
  const from = useHistoryStore.getState().cursor
  const { direction, steps } = travelPlan(from, target, events.length)

  for (let i = 0; i < steps; i += 1) {
    const store = useHistoryStore.getState()
    const event = direction === 1 ? store.redo() : store.undo()
    if (!event) break
    if (direction === 1) replayEvent(event)
    else revertEvent(event)
  }

  return useHistoryStore.getState().cursor
}

/** Where the scrubber can go: -1 (session start) up to the last event. */
export function historyBounds(): { min: number; max: number } {
  const total = useHistoryStore.getState().events.length
  return { min: -1, max: clampCursor(total - 1, total) }
}
