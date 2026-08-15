import { Actions, ActionName } from './actions'

// Each action maps to an array of key combos (any match triggers the action).
// Format: modifier keys joined by '+', then the key. e.g. 'ctrl+shift+z', 'escape', 'delete'

export const defaultKeybinds: Record<ActionName, string[]> = {
  // Tool modes
  [Actions.TOOL_SELECT]:    ['v', 'escape'],
  [Actions.TOOL_PAN]:       ['h', 'space'],
  [Actions.TOOL_CONNECT]:   ['c'],
  [Actions.TOOL_LASSO]:     ['l'],
  [Actions.TOOL_TEXT]:      ['t'],
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
  [Actions.PASTE]:          ['ctrl+v', 'meta+v'],
  [Actions.CUT]:            ['ctrl+x', 'meta+x'],
  [Actions.TOGGLE_LOCK]:    ['ctrl+l', 'meta+l'],
  [Actions.FLIP_H]:         ['shift+h'],
  [Actions.FLIP_V]:         ['shift+v'],
  [Actions.FILENAME_LABELS_TOGGLE]: ['shift+f'],
  [Actions.COMMENT_PIN_ADD]: ['ctrl+shift+m', 'meta+shift+m'],

  // Item ordering
  [Actions.BRING_FRONT]:    ['ctrl+shift+]', 'meta+shift+]'],
  [Actions.BRING_FORWARD]:  ['ctrl+]', 'meta+]'],
  [Actions.SEND_BACK]:      ['ctrl+shift+[', 'meta+shift+['],
  [Actions.SEND_BACKWARD]:  ['ctrl+[', 'meta+['],

  // Viewport
  [Actions.ZOOM_IN]:        ['ctrl+=', 'meta+=', 'ctrl+shift+='],
  [Actions.ZOOM_OUT]:       ['ctrl+-', 'meta+-'],
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
  [Actions.EXPORT_PDF]:     [],
  [Actions.EXPORT_IMAGE]:   [],
  [Actions.EXPORT_ZIP]:     [],

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
