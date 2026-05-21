// Every keyboard-triggerable action in Citadel.
// These are the authoritative string identifiers — never use raw key strings in handlers.

export const Actions = {
  // ── Tool modes ────────────────────────────────────────────────────────────
  TOOL_SELECT: 'tool:select',
  TOOL_PAN: 'tool:pan',
  TOOL_CONNECT: 'tool:connect',
  TOOL_LASSO: 'tool:lasso',
  TOOL_TEXT: 'tool:text',
  TOOL_STICKY: 'tool:sticky',
  TOOL_LINK: 'tool:link',
  TOOL_TAG: 'tool:tag',
  TOOL_SWATCH: 'tool:swatch',

  // ── Edit ──────────────────────────────────────────────────────────────────
  UNDO: 'edit:undo',
  REDO: 'edit:redo',
  DELETE: 'edit:delete',
  DUPLICATE: 'edit:duplicate',
  SELECT_ALL: 'edit:selectAll',
  DESELECT: 'edit:deselect',
  COPY: 'edit:copy',
  PASTE: 'edit:paste',
  CUT: 'edit:cut',
  TOGGLE_LOCK: 'item:toggleLock',

  // ── Item ordering ─────────────────────────────────────────────────────────
  BRING_FRONT: 'order:bringFront',
  BRING_FORWARD: 'order:bringForward',
  SEND_BACK: 'order:sendBack',
  SEND_BACKWARD: 'order:sendBackward',

  // ── Viewport ──────────────────────────────────────────────────────────────
  ZOOM_IN: 'viewport:zoomIn',
  ZOOM_OUT: 'viewport:zoomOut',
  ZOOM_FIT: 'viewport:zoomFit',
  ZOOM_RESET: 'viewport:zoomReset',

  // ── File ──────────────────────────────────────────────────────────────────
  SAVE: 'file:save',
  SAVE_AS: 'file:saveAs',
  OPEN: 'file:open',
  NEW_PROJECT: 'file:new',
  EXPORT_PDF: 'export:pdf',
  EXPORT_IMAGE: 'export:image',
  EXPORT_ZIP: 'export:zip',

  // ── Boards ────────────────────────────────────────────────────────────────
  BOARD_NEW: 'board:new',
  BOARD_DUPLICATE: 'board:duplicate',
  BOARD_NEXT: 'board:next',
  BOARD_PREV: 'board:prev',
  BOARD_RENAME: 'board:rename',
  BOARD_DELETE: 'board:delete',

  // ── Panels ────────────────────────────────────────────────────────────────
  PANEL_PROPERTIES: 'panel:properties',
  PANEL_KEYBINDS: 'panel:keybinds',
  PANEL_SEARCH: 'panel:search',

  // ── Recording ─────────────────────────────────────────────────────────────
  RECORD_TOGGLE: 'record:toggle',
  RECORD_PLAY: 'record:play',

  // ── Snap / align ─────────────────────────────────────────────────────────
  TOGGLE_SNAP: 'snap:toggle',
  ALIGN_LEFT: 'align:left',
  ALIGN_CENTER_H: 'align:centerH',
  ALIGN_RIGHT: 'align:right',
  ALIGN_TOP: 'align:top',
  ALIGN_CENTER_V: 'align:centerV',
  ALIGN_BOTTOM: 'align:bottom',

  // ── Grouping ──────────────────────────────────────────────────────────────
  GROUP:   'group:create',
  UNGROUP: 'group:dissolve',
} as const

export type ActionName = (typeof Actions)[keyof typeof Actions]
