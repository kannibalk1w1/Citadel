import { describe, expect, it } from 'vitest'
import type { CanvasItem, Connection } from '../../../types'
import { visibleConnectionIds, visibleGroupIds } from './overlayVisibility'

function item(id: string, groupId?: string): CanvasItem {
  return {
    id,
    type: 'text',
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    rotation: 0,
    zIndex: 0,
    locked: false,
    visible: true,
    opacity: 1,
    tags: [],
    groupId,
  }
}

function connection(id: string, fromId: string, toId: string): Connection {
  return {
    id,
    fromId,
    toId,
    fromAnchor: 'auto',
    toAnchor: 'auto',
    style: 'bezier',
    color: '#b8c2bd',
    width: 1.5,
    arrowHead: 'arrow',
    dashed: false,
  }
}

describe('overlay visibility model', () => {
  it('keeps visible endpoint, active, and pulsing bindings while hiding dormant offscreen threads', () => {
    const visibleItems = new Set(['near-relic'])
    const connections = [
      connection('near-thread', 'near-relic', 'far-relic'),
      connection('sleeping-thread', 'far-relic-a', 'far-relic-b'),
      connection('active-thread', 'far-relic-c', 'far-relic-d'),
      connection('pulsing-thread', 'far-relic-e', 'far-relic-f'),
    ]

    expect(visibleConnectionIds(connections, visibleItems, {
      activeConnectionId: 'active-thread',
      pulsingConnectionId: 'pulsing-thread',
    })).toEqual(new Set(['near-thread', 'active-thread', 'pulsing-thread']))
  })

  it('marks a whole group visible when any member is in the rendered relic slice', () => {
    const items = [
      item('near-member', 'visible-group'),
      item('far-member', 'visible-group'),
      item('hidden-member', 'hidden-group'),
      item('loose-relic'),
    ]

    expect(visibleGroupIds(items, new Set(['near-member']))).toEqual(new Set(['visible-group']))
  })
})
