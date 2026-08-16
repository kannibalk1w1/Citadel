// Every keyboard-triggerable action in Citadel.
// These are the authoritative string identifiers — never use raw key strings in handlers.

export const Actions = {
  // ── Tool modes ────────────────────────────────────────────────────────────
  TOOL_SELECT: 'tool:select',
  TOOL_PAN: 'tool:pan',
  TOOL_CONNECT: 'tool:connect',
  TOOL_LASSO: 'tool:lasso',
  TOOL_TEXT: 'tool:text',
  TOOL_CODE: 'tool:code',
  TOOL_STICKY: 'tool:sticky',
  TOOL_LINK: 'tool:link',
  TOOL_TAG: 'tool:tag',
  TOOL_SWATCH: 'tool:swatch',

  // ── Command palette ───────────────────────────────────────────────────────
  PALETTE_TOGGLE: 'palette:toggle',

  // ── Edit ──────────────────────────────────────────────────────────────────
  UNDO: 'edit:undo',
  REDO: 'edit:redo',
  DELETE: 'edit:delete',
  DUPLICATE: 'edit:duplicate',
  SELECT_ALL: 'edit:selectAll',
  DESELECT: 'edit:deselect',
  COPY: 'edit:copy',
  CODE_COPY: 'code:copy',
  PASTE: 'edit:paste',
  CUT: 'edit:cut',
  TOGGLE_LOCK: 'item:toggleLock',
  FLIP_H: 'item:flipH',
  FLIP_V: 'item:flipV',
  FILENAME_LABELS_TOGGLE: 'view:filenameLabels',
  VISION_CYCLE: 'view:visionCycle',
  VISION_VALUE: 'view:visionValue',
  VISION_SQUINT: 'view:visionSquint',
  VISION_MIRROR: 'view:visionMirror',
  VISION_CLEAR: 'view:visionClear',

  // ── Study sessions ────────────────────────────────────────────────────────
  STUDY_START: 'study:start',
  STUDY_PAUSE: 'study:pauseResume',
  STUDY_NEXT: 'study:next',
  STUDY_PREV: 'study:previous',
  STUDY_STOP: 'study:stop',
  COMMENT_PIN_ADD: 'annotation:commentPinAdd',

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
  PRESENTATION_TOGGLE: 'viewport:presentationToggle',
  PRESENTATION_NEXT: 'presentation:next',
  PRESENTATION_PREV: 'presentation:prev',
  QUILL_TOGGLE: 'presentation:quillToggle',
  WAYSTONE_PLANT: 'waystone:plant',
  WAYSTONE_NEXT: 'waystone:next',

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
  PANEL_ARCHIVE_RAIL_TOGGLE: 'panel:archiveRailToggle',

  // ── Window modes ──────────────────────────────────────────────────────────
  WINDOW_ALWAYS_ON_TOP_TOGGLE: 'window:alwaysOnTopToggle',
  WINDOW_CLICK_THROUGH_TOGGLE: 'window:clickThroughToggle',
  WINDOW_OPACITY_DOWN: 'window:opacityDown',
  WINDOW_OPACITY_UP: 'window:opacityUp',

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
  AUTO_ARRANGE: 'arrange:autoGrid',

  // ── Grouping ──────────────────────────────────────────────────────────────
  GROUP:   'group:create',
  UNGROUP: 'group:dissolve',
} as const

export type ActionName = (typeof Actions)[keyof typeof Actions]
