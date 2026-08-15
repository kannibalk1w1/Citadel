import { describe, expect, it } from 'vitest'
import type { CanvasItem, Connection } from '../../types'
import {
  RELIC_TEMPLATE_MAX,
  createRelicTemplate,
  normalizeRelicTemplates,
  stampRelicTemplate,
} from './relicTemplates'

function item(id: string, patch: Partial<CanvasItem> = {}): CanvasItem {
  return {
    id,
    type: 'sticky',
    x: 0, y: 0, width: 100, height: 80,
    rotation: 0, zIndex: 2,
    locked: false, visible: true, opacity: 1,
    tags: ['tavern'],
    meta: { content: 'note' },
    ...patch,
  }
}

const connection = (id: string, fromId: string, toId: string): Connection => ({
  id, fromId, toId,
  fromAnchor: 'auto', toAnchor: 'auto',
  style: 'bezier', color: '#fff', width: 1, arrowHead: 'arrow', dashed: false, label: 'serves',
})

describe('createRelicTemplate', () => {
  it('stores items relative to the selection origin and strips ids/groups', () => {
    const template = createRelicTemplate('Tavern rig', [
      item('a', { x: 100, y: 50 }),
      item('b', { x: 300, y: 250, groupId: 'g1' }),
    ], [])
    expect(template.name).toBe('Tavern rig')
    expect(template.items[0].x).toBe(0)
    expect(template.items[0].y).toBe(0)
    expect(template.items[1].x).toBe(200)
    expect(template.items[1].y).toBe(200)
    expect('id' in template.items[0]).toBe(false)
    expect('groupId' in template.items[1]).toBe(false)
  })

  it('keeps only connections whose both endpoints are in the selection, as indices', () => {
    const template = createRelicTemplate('Rig', [item('a'), item('b', { x: 10, y: 10 })], [
      connection('c1', 'a', 'b'),
      connection('c2', 'a', 'outsider'),
    ])
    expect(template.connections.length).toBe(1)
    expect(template.connections[0].fromIndex).toBe(0)
    expect(template.connections[0].toIndex).toBe(1)
    expect(template.connections[0].label).toBe('serves')
  })
})

describe('stampRelicTemplate', () => {
  it('creates fresh ids and absolute positions at the origin', () => {
    let n = 0
    const idFactory = () => `fresh-${n++}`
    const template = createRelicTemplate('Rig', [item('a', { x: 100, y: 50 }), item('b', { x: 200, y: 150 })], [connection('c1', 'a', 'b')])
    const stamped = stampRelicTemplate(template, { x: 1000, y: 2000 }, idFactory)
    expect(stamped.items[0].id).toBe('fresh-0')
    expect(stamped.items[0].x).toBe(1000)
    expect(stamped.items[1].x).toBe(1100)
    expect(stamped.items[1].y).toBe(2100)
    expect(stamped.connections[0].fromId).toBe('fresh-0')
    expect(stamped.connections[0].toId).toBe('fresh-1')
    expect(stamped.connections[0].id).toBe('fresh-2')
    expect(stamped.items[0].tags).toEqual(['tavern'])
  })

  it('deep-copies meta so stamped relics do not share state', () => {
    const template = createRelicTemplate('Rig', [item('a')], [])
    const stamped = stampRelicTemplate(template, { x: 0, y: 0 }, () => 'x')
    ;(stamped.items[0].meta as Record<string, unknown>).content = 'changed'
    expect(template.items[0].meta?.content).toBe('note')
  })
})

describe('normalizeRelicTemplates', () => {
  it('drops malformed entries and caps the list', () => {
    const good = createRelicTemplate('Rig', [item('a')], [])
    const many = Array.from({ length: RELIC_TEMPLATE_MAX + 3 }, () => good)
    expect(normalizeRelicTemplates(many).length).toBe(RELIC_TEMPLATE_MAX)
    expect(normalizeRelicTemplates([good, { junk: true }, null, 'x'])).toHaveLength(1)
    expect(normalizeRelicTemplates('not an array')).toEqual([])
  })
})
