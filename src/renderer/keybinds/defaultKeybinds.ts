import { Actions, ActionName } from './actions'

// Each action maps to an array of key combos (any match triggers the action).
// Format: modifier keys joined by '+', then the key. e.g. 'ctrl+shift+z', 'escape', 'delete'
//
// The key half must be what `serializeEvent` produces, not what the character
// looks like: it canonicalises ' ' to 'space', '-' to 'minus' and '+' to 'plus'.
// A literal 'ctrl+-' here never matches anything, because the event serialises
// as 'ctrl+minus' — a whole shortcut silently does nothing. `defaultKeybinds`
// is round-tripped through `serializeEvent` by its test for that reason.
//
// '+' also only reaches a keyboard event with Shift held on most layouts, which
// serialises as 'ctrl+shift+plus'. Anything bound to a bare 'plus' is therefore
// numpad-only, so combos that want the top-row key pair 'plus' with '='.

export const defaultKeybinds: Record<ActionName, string[]> = {
  // Command palette
  [Actions.PALETTE_TOGGLE]: ['ctrl+k', 'meta+k'],

  // Tool modes
  [Actions.TOOL_SELECT]:    ['v', 'escape'],
  [Actions.TOOL_PAN]:       ['h', 'space'],
  [Actions.TOOL_CONNECT]:   ['c'],
  [Actions.TOOL_LASSO]:     ['l'],
  [Actions.TOOL_TEXT]:      ['t'],
  [Actions.TOOL_CODE]:      ['d'],
  [Actions.TOOL_STICKY]:    ['n'],
  [Actions.TOOL_LINK]:      ['k'],
  [Actions.TOOL_TAG]:       ['g'],
  [Actions.TOOL_SWATCH]:    ['w'],

  // Edit
  [Actions.UNDO]:           ['ctrl+z', 'meta+z'],
  [Actions.REDO]:           ['ctrl+shift+z', 'meta+shift+z', 'ctrl+y'],
  [Actions.DELETE]:         ['delete', 'backspace'],
  [Actions.DUPLICATE]:      ['ctrl+d', 'meta+d'],
  [Actions.SELECT_ALL]:     ['ctrl+a', 'meta+a'],
  [Actions.DESELECT]:       ['escape'],
  [Actions.COPY]:           ['ctrl+c', 'meta+c'],
  [Actions.CODE_COPY]:      ['ctrl+shift+c', 'meta+shift+c'],
  [Actions.PASTE]:          ['ctrl+v', 'meta+v'],
  [Actions.CUT]:            ['ctrl+x', 'meta+x'],
  [Actions.TOGGLE_LOCK]:    ['ctrl+l', 'meta+l'],
  [Actions.FLIP_H]:         ['shift+h'],
  [Actions.FLIP_V]:         ['shift+v'],
  [Actions.FILENAME_LABELS_TOGGLE]: ['shift+f'],
  [Actions.BOARD_LOAD_TOGGLE]: ['shift+l'],
  // Grouped on Y for "your eyes": step, value, squint, mirror, and off.
  // Value is shift+G for greyscale — shift+V already flips an item vertically.
  [Actions.VISION_CYCLE]: ['y'],
  [Actions.VISION_VALUE]: ['shift+g'],
  [Actions.VISION_SQUINT]: ['shift+s'],
  [Actions.VISION_MIRROR]: ['shift+m'],
  [Actions.VISION_CLEAR]: ['shift+y'],
  // A running session is driven with one hand while the other draws.
  [Actions.STUDY_START]: ['shift+d'],
  [Actions.STUDY_PAUSE]: ['shift+space'],
  [Actions.STUDY_NEXT]: ['shift+arrowright'],
  [Actions.STUDY_PREV]: ['shift+arrowleft'],
  [Actions.STUDY_STOP]: ['shift+escape'],
  [Actions.TIME_MACHINE_TOGGLE]: ['shift+t'],
  [Actions.COMMENT_PIN_ADD]: ['ctrl+shift+m', 'meta+shift+m'],

  // Item ordering
  [Actions.BRING_FRONT]:    ['ctrl+shift+]', 'meta+shift+]'],
  [Actions.BRING_FORWARD]:  ['ctrl+]', 'meta+]'],
  [Actions.SEND_BACK]:      ['ctrl+shift+[', 'meta+shift+['],
  [Actions.SEND_BACKWARD]:  ['ctrl+[', 'meta+['],

  // Viewport
  [Actions.ZOOM_IN]:        ['ctrl+=', 'meta+=', 'ctrl+plus', 'meta+plus'],
  [Actions.ZOOM_OUT]:       ['ctrl+minus', 'meta+minus'],
  [Actions.ZOOM_FIT]:       ['f', 'ctrl+shift+h', 'meta+shift+h'],
  [Actions.ZOOM_RESET]:     ['ctrl+0', 'meta+0'],
  [Actions.PRESENTATION_TOGGLE]: ['f5'],
  [Actions.PRESENTATION_NEXT]: ['arrowright', 'pagedown'],
  [Actions.PRESENTATION_PREV]: ['arrowleft', 'pageup'],
  [Actions.QUILL_TOGGLE]:      ['q'],
  [Actions.WAYSTONE_PLANT]:    ['alt+w'],
  [Actions.WAYSTONE_NEXT]:     ['alt+]'],

  // File
  [Actions.SAVE]:           ['ctrl+s', 'meta+s'],
  [Actions.SAVE_AS]:        ['ctrl+shift+s', 'meta+shift+s'],
  [Actions.OPEN]:           ['ctrl+o', 'meta+o'],
  [Actions.NEW_PROJECT]:    ['ctrl+n', 'meta+n'],
  [Actions.OPEN_SHOWCASE]:  [],
  [Actions.EXPORT_PDF]:     [],
  [Actions.EXPORT_IMAGE]:   [],
  [Actions.EXPORT_ZIP]:     [],
  [Actions.EXPORT_MARKDOWN]: [],

  // Boards
  [Actions.BOARD_NEW]:      ['ctrl+shift+n', 'meta+shift+n'],
  [Actions.BOARD_DUPLICATE]: ['ctrl+shift+d', 'meta+shift+d'],
  [Actions.BOARD_NEXT]:     ['ctrl+pagedown', 'meta+pagedown'],
  [Actions.BOARD_PREV]:     ['ctrl+pageup', 'meta+pageup'],
  [Actions.BOARD_RENAME]:   ['f2'],
  [Actions.BOARD_DELETE]:   [],

  // Panels
  [Actions.PANEL_PROPERTIES]: ['ctrl+p', 'meta+p'],
  [Actions.PANEL_KEYBINDS]:   [],
  [Actions.PANEL_SEARCH]:     ['ctrl+f', 'meta+f'],
  [Actions.PANEL_ARCHIVE_RAIL_TOGGLE]: [],

  // Recording
  [Actions.RECORD_TOGGLE]:  ['ctrl+r', 'meta+r'],
  [Actions.RECORD_PLAY]:    [],

  // Snap / align
  [Actions.TOGGLE_SNAP]:    ['s', 'ctrl+shift+g'],

  [Actions.WINDOW_ALWAYS_ON_TOP_TOGGLE]: ['ctrl+alt+t'],
  [Actions.WINDOW_CLICK_THROUGH_TOGGLE]: ['ctrl+alt+c'],
  // The '=' half is what a laptop keyboard can actually reach; 'plus' is the
  // numpad. Down needs only 'minus' because '-' is unshifted on both.
  [Actions.WINDOW_OPACITY_DOWN]:         ['ctrl+alt+minus'],
  [Actions.WINDOW_OPACITY_UP]:           ['ctrl+alt+=', 'ctrl+alt+plus'],
  [Actions.ALIGN_LEFT]:     [],
  [Actions.ALIGN_CENTER_H]: [],
  [Actions.ALIGN_RIGHT]:    [],
  [Actions.ALIGN_TOP]:      [],
  [Actions.ALIGN_CENTER_V]: [],
  [Actions.ALIGN_BOTTOM]:   [],
  [Actions.AUTO_ARRANGE]:   ['ctrl+shift+a', 'meta+shift+a'],

  // Grouping
  [Actions.GROUP]:   ['ctrl+g'],
  [Actions.UNGROUP]: ['ctrl+u'],
}
