import { Actions, type ActionName } from './actions'

// Plain-language names for every keyboard-triggerable action.
//
// `ActionName` strings are identifiers: they are persisted as the keys of
// keybinds.json, so they must never change. This map is what the keybind
// settings panel shows the user instead — the panel keeps the identifier
// beside it, dimmed, for anyone editing the file by hand.
//
// The Record type is deliberate: adding an action without a label fails the
// typecheck rather than leaking a raw id into the interface.
export const actionLabels: Record<ActionName, string> = {
  [Actions.PALETTE_TOGGLE]: 'Open the command palette',

  [Actions.TOOL_SELECT]: 'Select tool',
  [Actions.TOOL_PAN]: 'Pan tool',
  [Actions.TOOL_CONNECT]: 'Connect tool',
  [Actions.TOOL_LASSO]: 'Lasso tool',
  [Actions.TOOL_TEXT]: 'Text tool',
  [Actions.TOOL_CODE]: 'Code snippet tool',
  [Actions.TOOL_STICKY]: 'Note tool',
  [Actions.TOOL_LINK]: 'Link tool',
  [Actions.TOOL_TAG]: 'Tag tool',
  [Actions.TOOL_SWATCH]: 'Swatch tool',

  [Actions.UNDO]: 'Undo',
  [Actions.REDO]: 'Redo',
  [Actions.DELETE]: 'Delete selection',
  [Actions.DUPLICATE]: 'Duplicate selection',
  [Actions.SELECT_ALL]: 'Select all',
  [Actions.DESELECT]: 'Deselect',
  [Actions.COPY]: 'Copy',
  [Actions.CODE_COPY]: 'Copy selected code snippet',
  [Actions.PASTE]: 'Paste',
  [Actions.CUT]: 'Cut',

  [Actions.TOGGLE_LOCK]: 'Lock or unlock selection',
  [Actions.FLIP_H]: 'Flip horizontally',
  [Actions.FLIP_V]: 'Flip vertically',
  [Actions.FILENAME_LABELS_TOGGLE]: 'Show or hide filenames',
  [Actions.BOARD_LOAD_TOGGLE]: 'Show or hide the board load readout',
  [Actions.VISION_CYCLE]: 'Vision check: step through',
  [Actions.VISION_VALUE]: 'Vision check: value (greyscale)',
  [Actions.VISION_SQUINT]: 'Vision check: squint (blur)',
  [Actions.VISION_MIRROR]: 'Vision check: mirror the view',
  [Actions.VISION_CLEAR]: 'Vision check: back to normal',
  [Actions.STUDY_START]: 'Study session: start',
  [Actions.STUDY_PAUSE]: 'Study session: pause or resume',
  [Actions.STUDY_NEXT]: 'Study session: next image',
  [Actions.STUDY_PREV]: 'Study session: previous image',
  [Actions.STUDY_STOP]: 'Study session: end',
  [Actions.TIME_MACHINE_TOGGLE]: 'Time machine: scrub the board history',
  [Actions.COMMENT_PIN_ADD]: 'Add comment pin',

  [Actions.BRING_FRONT]: 'Bring to front',
  [Actions.BRING_FORWARD]: 'Bring forward',
  [Actions.SEND_BACK]: 'Send to back',
  [Actions.SEND_BACKWARD]: 'Send backward',

  [Actions.ZOOM_IN]: 'Zoom in',
  [Actions.ZOOM_OUT]: 'Zoom out',
  [Actions.ZOOM_FIT]: 'Fit board to window',
  [Actions.ZOOM_RESET]: 'Reset zoom',
  [Actions.PRESENTATION_TOGGLE]: 'Toggle presentation mode',
  [Actions.PRESENTATION_NEXT]: 'Next in sequence',
  [Actions.PRESENTATION_PREV]: 'Previous in sequence',
  [Actions.QUILL_TOGGLE]: 'Toggle presentation pen',
  [Actions.WAYSTONE_PLANT]: 'Bookmark the current view',
  [Actions.WAYSTONE_NEXT]: 'Go to next bookmark',

  [Actions.SAVE]: 'Save project',
  [Actions.SAVE_AS]: 'Save project as…',
  [Actions.OPEN]: 'Open project',
  [Actions.NEW_PROJECT]: 'New project',
  [Actions.EXPORT_PDF]: 'Export PDF',
  [Actions.EXPORT_IMAGE]: 'Export image',
  [Actions.EXPORT_ZIP]: 'Export archive (.citadelz)',
  [Actions.EXPORT_MARKDOWN]: 'Export Markdown (Obsidian)',

  [Actions.BOARD_NEW]: 'New board',
  [Actions.BOARD_DUPLICATE]: 'Duplicate board',
  [Actions.BOARD_NEXT]: 'Next board',
  [Actions.BOARD_PREV]: 'Previous board',
  [Actions.BOARD_RENAME]: 'Rename board',
  [Actions.BOARD_DELETE]: 'Delete board',

  [Actions.PANEL_PROPERTIES]: 'Focus the properties panel',
  [Actions.PANEL_KEYBINDS]: 'Open keyboard shortcuts',
  [Actions.PANEL_SEARCH]: 'Open search',
  [Actions.PANEL_ARCHIVE_RAIL_TOGGLE]: 'Show or hide the project rail',

  [Actions.WINDOW_ALWAYS_ON_TOP_TOGGLE]: 'Keep the window on top',
  [Actions.WINDOW_CLICK_THROUGH_TOGGLE]: 'Let clicks pass through the window',
  [Actions.WINDOW_OPACITY_DOWN]: 'Make the window more transparent',
  [Actions.WINDOW_OPACITY_UP]: 'Make the window more opaque',

  [Actions.RECORD_TOGGLE]: 'Start or stop recording',
  [Actions.RECORD_PLAY]: 'Play recording',

  [Actions.TOGGLE_SNAP]: 'Toggle snapping',

  [Actions.ALIGN_LEFT]: 'Align left',
  [Actions.ALIGN_CENTER_H]: 'Center horizontally',
  [Actions.ALIGN_RIGHT]: 'Align right',
  [Actions.ALIGN_TOP]: 'Align top',
  [Actions.ALIGN_CENTER_V]: 'Center vertically',
  [Actions.ALIGN_BOTTOM]: 'Align bottom',
  [Actions.AUTO_ARRANGE]: 'Auto-arrange into a grid',

  [Actions.GROUP]: 'Group selection',
  [Actions.UNGROUP]: 'Ungroup selection',
}

export function actionLabel(action: string): string {
  return actionLabels[action as ActionName] ?? action
}
