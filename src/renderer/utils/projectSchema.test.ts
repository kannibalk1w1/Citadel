import { describe, expect, it } from 'vitest'
import type { ProjectFile } from '../../types'
import { ITEM_TYPES } from '../../types'
import { migrateProjectFile, parseProjectFile, validateProjectFile } from './projectSchema'

const validProject: ProjectFile = {
  version: '1.0.0',
  createdAt: 1,
  updatedAt: 2,
  activeBoardId: 'board-1',
  boards: [{
    id: 'board-1',
    name: 'Chamber',
    items: [],
    connections: [],
    viewport: { x: 0, y: 0, scale: 1 },
  }],
  recordings: [],
}

describe('projectSchema', () => {
  it('accepts a valid project file', () => {
    expect(validateProjectFile(validProject).ok).toBe(true)
    expect(parseProjectFile(JSON.stringify(validProject))).toEqual(validProject)
  })

  it('keeps every declared item type on load', () => {
    // The schema used to restate the type list by hand, and `code` was added to
    // `ItemType` without being added here — so saved code cards were discarded
    // on open. Reading the shared list means a new type cannot be half-added.
    const migrated = migrateProjectFile({
      boards: [{
        id: 'every-type',
        name: 'Every type',
        items: ITEM_TYPES.map((type, index) => ({ id: `item-${type}`, type, x: index * 10, y: 0 })),
        connections: [],
      }],
    })

    expect(migrated.boards[0].items.map((item) => item.type)).toEqual([...ITEM_TYPES])
  })

  it('rejects malformed project files with readable errors', () => {
    const result = validateProjectFile({ ...validProject, boards: [{ id: 'bad' }] })

    if (result.ok) throw new Error('expected the malformed project to be rejected')
    expect(result.errors.join('\n')).toContain('boards[0].items')
  })

  it('migrates legacy projects by filling safe defaults', () => {
    const migrated = migrateProjectFile({
      boards: [{
        id: 'legacy-board',
        name: 'Legacy',
        items: [{
          id: 'item-1',
          type: 'image',
          x: 10,
          y: 20,
          width: 100,
          height: 80,
          src: 'C:/refs/relic.png',
        }],
      }],
    })

    expect(migrated.version).toBe('1.0.0')
    expect(migrated.activeBoardId).toBe('legacy-board')
    expect(migrated.boards[0].viewport).toEqual({ x: 0, y: 0, scale: 1 })
    expect(migrated.boards[0].connections).toEqual([])
    expect(migrated.boards[0].items[0]).toMatchObject({
      rotation: 0,
      zIndex: 0,
      locked: false,
      visible: true,
      opacity: 1,
      tags: [],
    })
  })

  it('drops invalid connections whose endpoints are missing', () => {
    const migrated = migrateProjectFile({
      ...validProject,
      boards: [{
        ...validProject.boards[0],
        connections: [{
          id: 'thread-1',
          fromId: 'missing-a',
          toId: 'missing-b',
          fromAnchor: 'auto',
          toAnchor: 'auto',
          style: 'bezier',
          color: '#b8c2bd',
          width: 1,
          arrowHead: 'arrow',
          dashed: false,
        }],
      }],
    })

    expect(migrated.boards[0].connections).toEqual([])
  })

  it('drops unknown thread meanings during migration', () => {
    const migrated = migrateProjectFile({
      ...validProject,
      boards: [{
        ...validProject.boards[0],
        items: [
          { id: 'a', type: 'sticky', x: 0, y: 0, width: 100, height: 80 },
          { id: 'b', type: 'sticky', x: 120, y: 0, width: 100, height: 80 },
        ],
        connections: [{
          id: 'thread-1',
          fromId: 'a',
          toId: 'b',
          meaning: 'rumour',
        }],
      }],
    })

    expect(migrated.boards[0].connections[0].meaning).toBeUndefined()
  })

  it('throws when parsed JSON cannot become a valid project', () => {
    expect(() => parseProjectFile('{"boards":"bad"}')).toThrow(/Invalid Citadel project/)
  })
})
