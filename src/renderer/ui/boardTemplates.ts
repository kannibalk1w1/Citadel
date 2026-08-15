import type { CanvasItem, Connection, Viewport } from '../../types'
import { canvasColor } from '../theme/canvasColors'

export type BoardTemplateId = 'blank' | 'moodboard' | 'comparison' | 'storyboard'

export type BoardTemplate = {
  id: BoardTemplateId
  label: string
  title: string
}

export type BoardTemplateContent = {
  name: string
  items: CanvasItem[]
  connections: Connection[]
  viewport: Viewport
}

export const boardTemplates: BoardTemplate[] = [
  { id: 'blank', label: 'Blank', title: 'Empty board' },
  { id: 'moodboard', label: 'Mood', title: 'Reference board with notes and palette' },
  { id: 'comparison', label: 'Compare', title: 'A/B comparison board' },
  { id: 'storyboard', label: 'Story', title: 'Presentation storyboard beats' },
]

type IdFactory = () => string

function baseItem(id: string, type: CanvasItem['type'], x: number, y: number, width: number, height: number, meta: Record<string, unknown> = {}): CanvasItem {
  return {
    id,
    type,
    x,
    y,
    width,
    height,
    rotation: 0,
    zIndex: Date.now(),
    locked: false,
    visible: true,
    opacity: 1,
    tags: [],
    meta,
  }
}

function sticky(id: string, x: number, y: number, content: string, color = '#211e16', meta: Record<string, unknown> = {}): CanvasItem {
  return baseItem(id, 'sticky', x, y, 220, 120, {
    content,
    color,
    fontSize: 14,
    align: 'left',
    fontStyle: 'normal',
    ...meta,
  })
}

function text(id: string, x: number, y: number, content: string, fontSize = 28, meta: Record<string, unknown> = {}): CanvasItem {
  return baseItem(id, 'text', x, y, 360, 60, {
    content,
    color: 'var(--text-accent)',
    fontSize,
    align: 'left',
    fontStyle: 'bold',
    ...meta,
  })
}

export function createBoardTemplate(id: BoardTemplateId, makeId: IdFactory): BoardTemplateContent {
  if (id === 'blank') {
    return { name: 'Blank board', items: [], connections: [], viewport: { x: 0, y: 0, scale: 1 } }
  }

  if (id === 'moodboard') {
    const title = text(makeId(), -360, -260, 'Moodboard')
    const hero = baseItem(makeId(), 'image', -360, -160, 320, 220, { placeholder: 'hero reference' })
    const detail = baseItem(makeId(), 'image', 0, -160, 220, 150, { placeholder: 'detail reference' })
    const note = sticky(makeId(), 260, -160, 'Notes, silhouettes, materials')
    const palette = baseItem(makeId(), 'swatch', 0, 40, 300, 90, { colors: ['#070808', canvasColor("accent"), '#6f1717', '#e3ded4'] })
    return {
      name: 'Moodboard',
      items: [title, hero, detail, note, palette],
      connections: [],
      viewport: { x: 420, y: 360, scale: 0.9 },
    }
  }

  if (id === 'comparison') {
    const title = text(makeId(), -340, -230, 'Comparison')
    const comparison = baseItem(makeId(), 'comparison', -340, -120, 460, 300, { srcA: '', srcB: '', divider: 0.5 })
    const notes = sticky(makeId(), 160, -120, 'Differences, decisions, follow-up')
    return {
      name: 'Comparison',
      items: [title, comparison, notes],
      connections: [],
      viewport: { x: 430, y: 320, scale: 0.85 },
    }
  }

  const title = text(makeId(), -380, -240, 'Storyboard')
  const beat1 = sticky(makeId(), -380, -120, 'Beat 1', '#211e16', { presentationOrder: 1 })
  const beat2 = sticky(makeId(), -100, -120, 'Beat 2', '#211e16', { presentationOrder: 2 })
  const beat3 = sticky(makeId(), 180, -120, 'Beat 3', '#211e16', { presentationOrder: 3 })
  return {
    name: 'Storyboard',
    items: [title, beat1, beat2, beat3],
    connections: [],
    viewport: { x: 460, y: 340, scale: 0.85 },
  }
}
