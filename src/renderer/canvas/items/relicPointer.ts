import type { CanvasItem, ToolMode } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { inscribe } from '../../ui/toasts/inscriptionToastStore'
import { handleConnectRelicClick } from '../connections/connectInteraction'

/**
 * Tools whose whole purpose is what happens when you press a relic: connect
 * starts a thread from it, link opens its URL, tag opens its tags. A press in
 * one of those means what the tool says, so it never falls back to Select.
 */
const TOOLS_THAT_OWN_A_RELIC_PRESS: ReadonlySet<ToolMode> = new Set<ToolMode>(['connect', 'link', 'tag'])

/**
 * Whether a press on a relic should move it — and therefore whether the relic
 * is draggable at all under the current tool.
 *
 * Every other tool is aimed at the empty ground: Pan moves the view, the
 * placement tools drop something where you click. Pressing an actual relic in
 * one of them used to do nothing whatsoever, so the reference you were reaching
 * for simply refused to move until you noticed the toolbar.
 */
export function relicPressMoves(toolMode: ToolMode): boolean {
  return !TOOLS_THAT_OWN_A_RELIC_PRESS.has(toolMode)
}

/**
 * Hands the canvas back to Select on the way into a relic press.
 *
 * Called from the press rather than the click so the tool has already changed
 * by the time the gesture is released — the drag itself is carried by
 * `relicPressMoves`, which keeps the relic draggable under the outgoing tool.
 *
 * Only ever reached once `handleRelicToolPress` has declined the press, so the
 * tool here is always one of the passive ones.
 */
export function adoptSelectTool(toolMode: ToolMode): void {
  if (toolMode === 'select' || !relicPressMoves(toolMode)) return
  useUIStore.getState().setToolMode('select')
}

/**
 * The three tools that act on the relic you press, in one place.
 *
 * Each of these used to be written out again in every item component, which is
 * why coverage had drifted so far: connect was missing from code cards, and
 * link and tag were implemented on three of the eleven item types. On the other
 * eight both tools silently did nothing — the data is on every relic, so there
 * was never a reason for it beyond the copy never having been made.
 *
 * Returns whether the tool consumed the press. False means no tool claimed it
 * and the caller should go on to select the relic.
 */
export function handleRelicToolPress(
  toolMode: ToolMode,
  boardId: string | null | undefined,
  item: Pick<CanvasItem, 'id' | 'link'>,
): boolean {
  if (toolMode === 'connect') {
    handleConnectRelicClick(boardId, item.id)
    return true
  }

  if (toolMode === 'link') {
    if (!item.link) {
      // The tool did fire; there was just nothing to open. Saying so beats a
      // press that looks identical to the tool being broken.
      inscribe('No link on this item yet — add one in the item panel')
      return true
    }
    const ipc = (window as unknown as { ipc: { invoke: (ch: string, args: unknown) => Promise<unknown> } }).ipc
    void ipc.invoke('shell:openURL', { url: item.link })
    return true
  }

  if (toolMode === 'tag') {
    useCanvasStore.getState().setSelection([item.id])
    useUIStore.getState().openPanel('tagSearch')
    return true
  }

  return false
}
