import type { CanvasItem, Connection } from '../../../types'

type ConnectionVisibilityContext = {
  activeConnectionId?: string | null
  pulsingConnectionId?: string | null
}

export function visibleConnectionIds(
  connections: Connection[],
  visibleItemIds: ReadonlySet<string>,
  context: ConnectionVisibilityContext = {},
): Set<string> {
  const ids = new Set<string>()
  for (const connection of connections) {
    if (
      visibleItemIds.has(connection.fromId) ||
      visibleItemIds.has(connection.toId) ||
      connection.id === context.activeConnectionId ||
      connection.id === context.pulsingConnectionId
    ) {
      ids.add(connection.id)
    }
  }
  return ids
}

export function visibleGroupIds(
  items: CanvasItem[],
  visibleItemIds: ReadonlySet<string>,
): Set<string> {
  const groupIds = new Set<string>()
  for (const item of items) {
    if (item.groupId && visibleItemIds.has(item.id)) groupIds.add(item.groupId)
  }
  return groupIds
}
