import { nanoid } from 'nanoid'
import type { CanvasItem, Connection } from '../../types'

// Reusable relic-set templates: any selection can be sealed as a template and
// stamped into any chamber. Stored in user settings (`templates.relics`), so
// they cross projects; item src paths are kept as-is.

export const RELIC_TEMPLATE_MAX = 24

export type TemplateItem = Omit<CanvasItem, 'id' | 'groupId'>

export type TemplateConnection = Omit<Connection, 'id' | 'fromId' | 'toId'> & {
  fromIndex: number
  toIndex: number
}

export type RelicTemplate = {
  id: string
  name: string
  items: TemplateItem[]
  connections: TemplateConnection[]
}

export function createRelicTemplate(
  name: string,
  items: CanvasItem[],
  connections: Connection[],
): RelicTemplate {
  const minX = Math.min(...items.map((item) => item.x))
  const minY = Math.min(...items.map((item) => item.y))
  const ids = items.map((item) => item.id)

  const templateItems: TemplateItem[] = items.map((item) => {
    const { id: _id, groupId: _groupId, ...rest } = item
    return {
      ...structuredClone(rest),
      x: item.x - minX,
      y: item.y - minY,
    }
  })

  const templateConnections: TemplateConnection[] = connections
    .filter((c) => ids.includes(c.fromId) && ids.includes(c.toId))
    .map((c) => {
      const { id: _id, fromId, toId, ...rest } = c
      return {
        ...structuredClone(rest),
        fromIndex: ids.indexOf(fromId),
        toIndex: ids.indexOf(toId),
      }
    })

  return { id: nanoid(), name, items: templateItems, connections: templateConnections }
}

export function stampRelicTemplate(
  template: RelicTemplate,
  origin: { x: number; y: number },
  idFactory: () => string = nanoid,
): { items: CanvasItem[]; connections: Connection[] } {
  const items: CanvasItem[] = template.items.map((item) => ({
    ...structuredClone(item),
    id: idFactory(),
    x: origin.x + item.x,
    y: origin.y + item.y,
  }))

  const connections: Connection[] = template.connections.map((c) => {
    const { fromIndex, toIndex, ...rest } = structuredClone(c)
    return {
      ...rest,
      fromId: items[fromIndex]?.id ?? '',
      toId: items[toIndex]?.id ?? '',
      id: idFactory(),
    }
  }).filter((c) => c.fromId && c.toId)

  return { items, connections }
}

export function normalizeRelicTemplates(raw: unknown): RelicTemplate[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((value): value is RelicTemplate =>
      Boolean(value && typeof value === 'object' &&
        typeof (value as RelicTemplate).id === 'string' &&
        typeof (value as RelicTemplate).name === 'string' &&
        Array.isArray((value as RelicTemplate).items) &&
        Array.isArray((value as RelicTemplate).connections)))
    .slice(0, RELIC_TEMPLATE_MAX)
}
