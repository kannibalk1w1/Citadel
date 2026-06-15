import { describe, expect, it } from 'vitest'
import type { CanvasBoard } from '../../types'
import { createIndexTrail, restoreIndexTrail } from './indexTrails'

const board = (id: string, name: string, content: string): CanvasBoard => ({
  id,
  name,
  items: [{
    id: `${id}-item`,
    type: 'sticky',
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    rotation: 0,
    zIndex: 1,
    locked: false,
    visible: true,
    opacity: 1,
    tags: ['memory'],
    meta: { content },
  }],
  connections: [],
  viewport: { x: 0, y: 0, scale: 1 },
})

describe('indexTrails', () => {
  it('saves a chamber-aware trail from current archive results', () => {
    const trail = createIndexTrail({
      id: 'trail-1',
      name: 'Gate trail',
      query: 'gate',
      boards: [board('hall', 'Hall', 'gate note'), board('vault', 'Vault', 'gate memory')],
      activeBoardId: 'hall',
      now: () => 123,
    })

    expect(trail).toMatchObject({
      id: 'trail-1',
      name: 'Gate trail',
      query: 'gate',
      createdAt: 123,
      resultRefs: [
        { id: 'hall-item', kind: 'item', chamberId: 'hall' },
        { id: 'vault-item', kind: 'item', chamberId: 'vault' },
      ],
    })
  })

  it('restores trail results against current archive state', () => {
    const boards = [board('hall', 'Hall', 'gate note'), board('vault', 'Vault', 'gate memory')]
    const trail = createIndexTrail({
      id: 'trail-1',
      name: 'Gate trail',
      query: 'gate',
      boards,
      activeBoardId: 'hall',
      now: () => 123,
    })

    const restored = restoreIndexTrail(trail, boards, 'hall')

    expect(restored.map((result) => result.id)).toEqual(['hall-item', 'vault-item'])
    expect(restored[1].chamber).toEqual({ id: 'vault', name: 'Vault' })
  })
})
