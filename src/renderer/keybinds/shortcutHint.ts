import type { ActionName } from '../../types'
import { resolver } from './keybindResolver'

const MODIFIER_LABELS: Record<string, string> = {
  ctrl: 'Ctrl',
  meta: 'Cmd',
  alt: 'Alt',
  shift: 'Shift',
}

const KEY_LABELS: Record<string, string> = {
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  ' ': 'Space',
  space: 'Space',
  escape: 'Esc',
  delete: 'Delete',
  backspace: 'Backspace',
  enter: 'Enter',
  pageup: 'PageUp',
  pagedown: 'PageDown',
}

/** `ctrl+shift+z` as a person would read it. */
export function formatCombo(combo: string): string {
  return combo
    .split('+')
    .map((part) => MODIFIER_LABELS[part] ?? KEY_LABELS[part] ?? (part.length === 1 ? part.toUpperCase() : part))
    .join('+')
}

/**
 * A control's shortcut, ready to append to its label — ` (Ctrl+R)`, or an empty
 * string when nothing is bound.
 *
 * Read from the resolver, never written out by hand. A typed-in hint is a claim
 * about a binding that no test can check: the record button promised `(R)` for
 * as long as the action was on Ctrl+R, so pressing the advertised key did
 * nothing at all. It also cannot follow a user's override, which is the whole
 * point of the keybind editor.
 */
export function shortcutHint(action: ActionName): string {
  const combo = resolver.bindingsFor(action)[0]
  return combo ? ` (${formatCombo(combo)})` : ''
}
