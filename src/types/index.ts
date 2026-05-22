// ─── Item Types ──────────────────────────────────────────────────────────────

export type ItemType =
  | 'image'
  | 'gif'
  | 'video'
  | 'youtube'
  | 'audio'
  | 'model3d'
  | 'text'
  | 'sticky'
  | 'comparison'
  | 'swatch'

export type CanvasItem = {
  id: string
  type: ItemType
  x: number
  y: number
  width: number
  height: number
  rotation: number      // degrees
  zIndex: number
  groupId?: string
  locked: boolean
  visible: boolean
  opacity: number
  tint?: { color: string; opacity: number }
  link?: string         // opens in system browser on click
  tags: string[]
  src?: string          // file path or YouTube URL
  meta?: Record<string, unknown>
}

// ─── Connection Types ─────────────────────────────────────────────────────────

export type AnchorSide = 'top' | 'right' | 'bottom' | 'left' | 'auto'

export type Connection = {
  id: string
  fromId: string
  toId: string
  fromAnchor: AnchorSide
  toAnchor: AnchorSide
  style: 'straight' | 'bezier' | 'elbow'
  color: string
  width: number
  arrowHead: 'none' | 'arrow' | 'dot' | 'diamond'
  label?: string
  dashed: boolean
}

// ─── Board ────────────────────────────────────────────────────────────────────

export type CanvasBoard = {
  id: string
  name: string
  items: CanvasItem[]
  connections: Connection[]
  viewport: Viewport
  meta?: Record<string, unknown>
}

// ─── Viewport ─────────────────────────────────────────────────────────────────

export type Viewport = {
  x: number
  y: number
  scale: number
}

// ─── Project File ─────────────────────────────────────────────────────────────

export type ProjectFile = {
  version: string
  createdAt: number
  updatedAt: number
  boards: CanvasBoard[]
  activeBoardId: string
  recordings?: RecordingSession[]
  keybindOverrides?: Partial<KeybindMap>
}

// ─── Event Log (Undo + Recording) ────────────────────────────────────────────

export type CanvasEventType =
  | 'ITEM_ADD'
  | 'ITEM_DELETE'
  | 'ITEM_MOVE'
  | 'ITEM_RESIZE'
  | 'ITEM_STYLE'
  | 'CONNECTION_ADD'
  | 'CONNECTION_DELETE'
  | 'CONNECTION_STYLE'
  | 'VIEWPORT_CHANGE'
  | 'BOARD_ADD'
  | 'BOARD_DELETE'
  | 'BOARD_RENAME'
  | 'SELECTION_CHANGE'
  | 'COMPARE_MERGE'

export type CanvasEvent = {
  id: string
  timestamp: number     // ms since recording epoch
  boardId: string
  type: CanvasEventType
  before: unknown
  after: unknown
}

export type RecordingSession = {
  id: string
  name: string
  startedAt: number
  events: CanvasEvent[]
}

// ─── Tool Modes ───────────────────────────────────────────────────────────────

export type ToolMode =
  | 'select'
  | 'connect'
  | 'pan'
  | 'lasso'
  | 'text'
  | 'sticky'
  | 'link'
  | 'tag'
  | 'swatch'
  | 'record'
  | 'comparison'

// ─── Keybinds ─────────────────────────────────────────────────────────────────

export type ActionName = string

export type KeybindMap = Record<ActionName, string[]>

// ─── Plugin API ───────────────────────────────────────────────────────────────

export type Plugin = {
  id: string
  name: string
  version: string
  description?: string
  activate: (api: PluginAPI) => void
  deactivate?: () => void
}

export type PluginAPI = {
  registerItemType: (type: string, component: unknown) => void
  onEvent: (type: CanvasEventType, handler: (event: CanvasEvent) => void) => () => void
  triggerMascotEffect: (name: string) => void
}

// ─── DOM Layer Helpers ────────────────────────────────────────────────────────

export function canvasToScreen(item: Pick<CanvasItem, 'x' | 'y' | 'width' | 'height'>, viewport: Viewport): DOMRect {
  return new DOMRect(
    item.x * viewport.scale + viewport.x,
    item.y * viewport.scale + viewport.y,
    item.width * viewport.scale,
    item.height * viewport.scale,
  )
}
