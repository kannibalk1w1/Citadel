import type { AnchorSide, CanvasBoard, CanvasEvent, CanvasEventType, CanvasItem, Connection, ItemType, KeybindMap, ProjectFile, RecordingSession } from '../../types'
import { ITEM_TYPES } from '../../types'
import { normalizeThreadMeaning } from '../canvas/connections/threadMeaning'
import { canvasColor } from '../theme/canvasColors'

const CURRENT_VERSION = '1.0.0'
// Derived from the shared list, never restated: a type this set does not know
// about is discarded on load, so a hand-copied list is a silent data loss.
const KNOWN_ITEM_TYPES = new Set<ItemType>(ITEM_TYPES)
const ANCHORS = new Set<AnchorSide>(['top', 'right', 'bottom', 'left', 'auto'])
const STYLES = new Set<Connection['style']>(['straight', 'bezier', 'elbow'])
const ARROWS = new Set<Connection['arrowHead']>(['none', 'arrow', 'dot', 'diamond'])
const EVENT_TYPES = new Set<CanvasEventType>([
  'ITEM_ADD', 'ITEM_DELETE', 'ITEM_MOVE', 'ITEM_RESIZE', 'ITEM_STYLE',
  'CONNECTION_ADD', 'CONNECTION_DELETE', 'CONNECTION_STYLE', 'VIEWPORT_CHANGE',
  'BOARD_ADD', 'BOARD_DELETE', 'BOARD_RENAME', 'BOARD_STYLE', 'SELECTION_CHANGE',
  'COMPARE_MERGE',
])

export type ProjectValidationResult =
  | { ok: true; project: ProjectFile }
  | { ok: false; errors: string[] }

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

// Keybind overrides come straight out of an untrusted project file. The cast
// this replaced let any shape through — a non-array value reached the resolver
// as if it were a key list. Drop anything that is not an array of key strings.
function migrateKeybindOverrides(value: unknown): Partial<KeybindMap> | undefined {
  if (!isObject(value)) return undefined
  const overrides: Partial<KeybindMap> = {}
  for (const [action, combos] of Object.entries(value)) {
    if (!Array.isArray(combos)) continue
    overrides[action] = combos.filter((combo): combo is string => typeof combo === 'string')
  }
  return overrides
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

function isFiniteNumberValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isItemRecord(value: unknown): boolean {
  if (!isObject(value)) return false
  return typeof value.id === 'string'
    && typeof value.type === 'string'
    && KNOWN_ITEM_TYPES.has(value.type as ItemType)
    && isFiniteNumberValue(value.x)
    && isFiniteNumberValue(value.y)
    && isFiniteNumberValue(value.width)
    && isFiniteNumberValue(value.height)
    && isFiniteNumberValue(value.rotation)
    && isFiniteNumberValue(value.zIndex)
    && isFiniteNumberValue(value.opacity)
    && typeof value.locked === 'boolean'
    && typeof value.visible === 'boolean'
    && Array.isArray(value.tags)
    && value.tags.every((tag) => typeof tag === 'string')
}

function isItemIdRecord(value: unknown): value is Record<string, unknown> {
  return isObject(value) && typeof value.id === 'string'
}

function isMovePatch(value: unknown): boolean {
  return isItemIdRecord(value) && isFiniteNumberValue(value.x) && isFiniteNumberValue(value.y)
}

function isStylePatch(value: unknown): boolean {
  if (!isItemIdRecord(value)) return false
  if ('groupId' in value && value.groupId !== null && typeof value.groupId !== 'string') return false
  for (const key of ['x', 'y', 'width', 'height', 'rotation', 'zIndex', 'opacity']) {
    if (key in value && !isFiniteNumberValue(value[key])) return false
  }
  for (const key of ['locked', 'visible']) {
    if (key in value && typeof value[key] !== 'boolean') return false
  }
  if ('tags' in value && (!Array.isArray(value.tags) || !value.tags.every((tag) => typeof tag === 'string'))) return false
  for (const key of ['src', 'link']) {
    if (value[key] !== undefined && typeof value[key] !== 'string') return false
  }
  return true
}

function isConnectionRecord(value: unknown): boolean {
  return isObject(value)
    && typeof value.id === 'string'
    && typeof value.fromId === 'string'
    && typeof value.toId === 'string'
}

function isArrayOf(value: unknown, predicate: (entry: unknown) => boolean): boolean {
  return Array.isArray(value) && value.every(predicate)
}

function hasSafeEventPayload(type: CanvasEventType, before: unknown, after: unknown): boolean {
  if (type === 'ITEM_ADD') return isItemRecord(after)
  if (type === 'ITEM_DELETE') return isArrayOf(before, isItemRecord) && isArrayOf(after, isItemIdRecord)
  if (type === 'ITEM_MOVE') return (isMovePatch(before) || isArrayOf(before, isMovePatch))
    && (isMovePatch(after) || isArrayOf(after, isMovePatch))
  if (type === 'ITEM_STYLE') return (isStylePatch(before) || isArrayOf(before, isStylePatch))
    && (isStylePatch(after) || isArrayOf(after, isStylePatch))
  if (type === 'CONNECTION_ADD') return isConnectionRecord(after)
  if (type === 'COMPARE_MERGE') {
    return isObject(before) && isArrayOf(before.items, isItemRecord) && isItemRecord(after)
  }
  if (type === 'BOARD_STYLE') return isObject(before) && isObject(after)
  return true
}

function migrateCanvasEvent(value: unknown, index: number): CanvasEvent | null {
  if (!isObject(value)) return null
  const type = typeof value.type === 'string' && EVENT_TYPES.has(value.type as CanvasEventType)
    ? value.type as CanvasEventType
    : null
  if (!type || typeof value.boardId !== 'string') return null
  if (!hasSafeEventPayload(type, value.before, value.after)) return null
  return {
    id: stringValue(value.id, `event-${index}`),
    timestamp: finiteNumber(value.timestamp, 0),
    boardId: value.boardId,
    type,
    before: value.before,
    after: value.after,
  }
}

function migrateRecording(value: unknown, index: number): RecordingSession | null {
  if (!isObject(value)) return null
  const events = Array.isArray(value.events)
    ? value.events.map(migrateCanvasEvent).filter((event): event is CanvasEvent => !!event)
    : []
  return {
    id: stringValue(value.id, `recording-${index + 1}`),
    name: stringValue(value.name, `Recording ${index + 1}`),
    startedAt: finiteNumber(value.startedAt, 0),
    events,
  }
}

function migrateItem(value: unknown, index: number): CanvasItem | null {
  if (!isObject(value)) return null
  const type = typeof value.type === 'string' && KNOWN_ITEM_TYPES.has(value.type as ItemType) ? value.type as ItemType : null
  if (!type) return null
  return {
    id: stringValue(value.id, `item-${index}`),
    type,
    x: finiteNumber(value.x, 0),
    y: finiteNumber(value.y, 0),
    width: Math.max(10, finiteNumber(value.width, 160)),
    height: Math.max(10, finiteNumber(value.height, 120)),
    rotation: finiteNumber(value.rotation, 0),
    zIndex: finiteNumber(value.zIndex, index),
    groupId: typeof value.groupId === 'string' ? value.groupId : undefined,
    locked: typeof value.locked === 'boolean' ? value.locked : false,
    visible: typeof value.visible === 'boolean' ? value.visible : true,
    opacity: Math.min(1, Math.max(0, finiteNumber(value.opacity, 1))),
    tint: isObject(value.tint) && typeof value.tint.color === 'string'
      ? { color: value.tint.color, opacity: Math.min(1, Math.max(0, finiteNumber(value.tint.opacity, 1))) }
      : undefined,
    link: typeof value.link === 'string' ? value.link : undefined,
    tags: stringArray(value.tags),
    src: typeof value.src === 'string' ? value.src : undefined,
    meta: isObject(value.meta) ? value.meta : undefined,
  }
}

function migrateConnection(value: unknown, itemIds: Set<string>, index: number): Connection | null {
  if (!isObject(value)) return null
  const fromId = typeof value.fromId === 'string' ? value.fromId : ''
  const toId = typeof value.toId === 'string' ? value.toId : ''
  if (!itemIds.has(fromId) || !itemIds.has(toId)) return null
  return {
    id: stringValue(value.id, `thread-${index}`),
    fromId,
    toId,
    fromAnchor: typeof value.fromAnchor === 'string' && ANCHORS.has(value.fromAnchor as AnchorSide) ? value.fromAnchor as AnchorSide : 'auto',
    toAnchor: typeof value.toAnchor === 'string' && ANCHORS.has(value.toAnchor as AnchorSide) ? value.toAnchor as AnchorSide : 'auto',
    style: typeof value.style === 'string' && STYLES.has(value.style as Connection['style']) ? value.style as Connection['style'] : 'bezier',
    color: typeof value.color === 'string' ? value.color : canvasColor("accent"),
    width: Math.max(0.5, finiteNumber(value.width, 1.5)),
    arrowHead: typeof value.arrowHead === 'string' && ARROWS.has(value.arrowHead as Connection['arrowHead']) ? value.arrowHead as Connection['arrowHead'] : 'arrow',
    label: typeof value.label === 'string' ? value.label : undefined,
    meaning: normalizeThreadMeaning(value.meaning),
    dashed: typeof value.dashed === 'boolean' ? value.dashed : false,
  }
}

function migrateBoard(value: unknown, index: number): CanvasBoard | null {
  if (!isObject(value)) return null
  const items = Array.isArray(value.items) ? value.items.map(migrateItem).filter((item): item is CanvasItem => !!item) : []
  const itemIds = new Set(items.map((item) => item.id))
  const connections = Array.isArray(value.connections)
    ? value.connections.map((connection, connectionIndex) => migrateConnection(connection, itemIds, connectionIndex)).filter((connection): connection is Connection => !!connection)
    : []
  const viewport = isObject(value.viewport) ? value.viewport : {}
  return {
    id: stringValue(value.id, `board-${index}`),
    name: stringValue(value.name, `Board ${index + 1}`),
    items,
    connections,
    viewport: {
      x: finiteNumber(viewport.x, 0),
      y: finiteNumber(viewport.y, 0),
      scale: Math.max(0.05, finiteNumber(viewport.scale, 1)),
    },
    meta: isObject(value.meta) ? value.meta : undefined,
  }
}

export function migrateProjectFile(value: unknown): ProjectFile {
  const source = isObject(value) ? value : {}
  const boards = Array.isArray(source.boards)
    ? source.boards.map(migrateBoard).filter((board): board is CanvasBoard => !!board)
    : []
  const activeBoardId = typeof source.activeBoardId === 'string' && boards.some((board) => board.id === source.activeBoardId)
    ? source.activeBoardId
    : boards[0]?.id ?? ''
  return {
    version: CURRENT_VERSION,
    createdAt: finiteNumber(source.createdAt, Date.now()),
    updatedAt: finiteNumber(source.updatedAt, Date.now()),
    boards,
    activeBoardId,
    recordings: Array.isArray(source.recordings)
      ? source.recordings.map(migrateRecording).filter((recording): recording is RecordingSession => !!recording)
      : [],
    keybindOverrides: migrateKeybindOverrides(source.keybindOverrides),
  }
}

export function validateProjectFile(value: unknown): ProjectValidationResult {
  const errors: string[] = []
  if (!isObject(value)) return { ok: false, errors: ['project must be an object'] }
  const project = value as ProjectFile
  if (typeof project.version !== 'string') errors.push('version must be a string')
  if (typeof project.createdAt !== 'number') errors.push('createdAt must be a number')
  if (typeof project.updatedAt !== 'number') errors.push('updatedAt must be a number')
  if (typeof project.activeBoardId !== 'string') errors.push('activeBoardId must be a string')
  if (!Array.isArray(project.boards)) errors.push('boards must be an array')
  project.boards?.forEach((board, index) => {
    if (!Array.isArray(board.items)) errors.push(`boards[${index}].items must be an array`)
    if (!Array.isArray(board.connections)) errors.push(`boards[${index}].connections must be an array`)
    if (!isObject(board.viewport)) errors.push(`boards[${index}].viewport must be an object`)
  })
  return errors.length ? { ok: false, errors } : { ok: true, project }
}

export function parseProjectFile(json: string): ProjectFile {
  const migrated = migrateProjectFile(JSON.parse(json))
  const validation = validateProjectFile(migrated)
  if (!validation.ok) {
    throw new Error(`Invalid Citadel project: ${validation.errors.join('; ')}`)
  }
  if (validation.project.boards.length === 0) {
    throw new Error('Invalid Citadel project: it must contain at least one board')
  }
  return validation.project
}
