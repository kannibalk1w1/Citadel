import { describe, expect, it } from 'vitest'
import type { CanvasItem, Viewport } from '../../../types'
import {
  anchorHandles,
  chromeFrameStyle,
  connectedItemIds,
  connectionQuickToolbarPosition,
  frameVariantStyle,
  frameVariant,
  itemTypeBadge,
  mediaPlaceholderLabel,
  selectedActionStripPosition,
  selectedActionStripPositionForSelection,
  selectionBounds,
} from './boardChromeViewModel'

const baseItem: CanvasItem = {
  id: 'item-1',
  type: 'image',
  x: 100,
  y: 80,
  width: 240,
  height: 120,
  rotation: 0,
  zIndex: 1,
  locked: false,
  visible: true,
  opacity: 1,
  tags: [],
}

const viewport: Viewport = { x: 20, y: 30, scale: 2 }

describe('board chrome view model', () => {
  it('returns understated gothic frame values for idle and selected items', () => {
    expect(chromeFrameStyle({ selected: false, locked: false })).toEqual({
      stroke: 'rgba(189, 150, 82, 0.34)',
      strokeWidth: 1,
      dash: undefined,
      glowOpacity: 0,
    })

    expect(chromeFrameStyle({ selected: true, locked: false })).toEqual({
      stroke: 'var(--accent)',
      strokeWidth: 1.5,
      dash: undefined,
      glowOpacity: 0.22,
    })
  })

  it('marks locked frames with a dashed muted treatment', () => {
    expect(chromeFrameStyle({ selected: true, locked: true })).toEqual({
      stroke: 'var(--text-muted)',
      strokeWidth: 1.25,
      dash: [6, 4],
      glowOpacity: 0.1,
    })
  })

  it('positions the selected action strip above the item in screen space', () => {
    expect(selectedActionStripPosition(baseItem, viewport)).toEqual({
      left: 460,
      top: 168,
      transform: 'translateX(-50%)',
    })
  })

  it('keeps the selected action strip inside the top edge of the viewport', () => {
    expect(selectedActionStripPosition({ ...baseItem, y: -10 }, viewport)).toEqual({
      left: 460,
      top: 12,
      transform: 'translateX(-50%)',
    })
  })

  it('calculates multi-item bounds with a chrome gutter', () => {
    const bounds = selectionBounds([
      baseItem,
      { ...baseItem, id: 'item-2', x: 20, y: 200, width: 50, height: 60 },
    ])

    expect(bounds).toEqual({
      x: 14,
      y: 74,
      width: 332,
      height: 192,
    })
  })

  it('positions the strip above the union bounds for a multi-selection', () => {
    const second = { ...baseItem, id: 'item-2', x: 20, y: 200, width: 50, height: 60 }
    const position = selectedActionStripPositionForSelection([baseItem, second], viewport)
    // gutter bounds {x:14, y:74, w:332}: centered above the union top
    expect(position).toEqual({
      left: (14 + 332 / 2) * 2 + 20,
      top: 74 * 2 + 30 - 22,
      transform: 'translateX(-50%)',
    })
  })

  it('multi-selection strip position matches the single-item strip for one item', () => {
    expect(selectedActionStripPositionForSelection([baseItem], viewport)).toEqual(
      selectedActionStripPosition({ ...baseItem, x: baseItem.x - 6, y: baseItem.y - 6, width: baseItem.width + 12, height: baseItem.height + 12 }, viewport),
    )
  })

  it('returns null strip position for an empty selection', () => {
    expect(selectedActionStripPositionForSelection([], viewport)).toBeNull()
  })

  it('returns compact item badges for scan-friendly token labels', () => {
    expect(itemTypeBadge(baseItem)).toBe('IMG')
    expect(itemTypeBadge({ ...baseItem, type: 'model3d' })).toBe('3D')
    expect(itemTypeBadge({ ...baseItem, type: 'comparison' })).toBe('A/B')
  })

  it('returns the four connector anchors in canvas coordinates', () => {
    expect(anchorHandles(baseItem)).toEqual([
      { side: 'top', x: 220, y: 80 },
      { side: 'right', x: 340, y: 140 },
      { side: 'bottom', x: 220, y: 200 },
      { side: 'left', x: 100, y: 140 },
    ])
  })

  it('finds ids related to a selected item through connections', () => {
    expect(connectedItemIds('a', [
      { id: 'c1', fromId: 'a', toId: 'b', fromAnchor: 'auto', toAnchor: 'auto', style: 'bezier', color: '#fff', width: 1, arrowHead: 'arrow', dashed: false },
      { id: 'c2', fromId: 'c', toId: 'a', fromAnchor: 'auto', toAnchor: 'auto', style: 'bezier', color: '#fff', width: 1, arrowHead: 'arrow', dashed: false },
    ])).toEqual(new Set(['b', 'c']))
  })

  it('positions the connector quick toolbar above the connector midpoint', () => {
    expect(connectionQuickToolbarPosition({ x: 100, y: 100 }, { x: 300, y: 180 })).toEqual({
      left: 200,
      top: 112,
      transform: 'translateX(-50%)',
    })
  })

  it('returns distinct frame variant treatments', () => {
    expect(frameVariantStyle('relic')).toEqual({ cornerSize: 12, badgeFill: '#21180e', lineOpacity: 0.52 })
    expect(frameVariantStyle('dossier')).toEqual({ cornerSize: 7, badgeFill: '#14110d', lineOpacity: 0.42 })
    expect(frameVariant({ ...baseItem, type: 'model3d', meta: { frameVariant: 'plain' } })).toBe('plain')
  })

  it('returns gothic placeholders for empty or failed media items', () => {
    expect(mediaPlaceholderLabel({ ...baseItem, type: 'model3d', src: undefined })).toBe('3D file missing')
    expect(mediaPlaceholderLabel({ ...baseItem, type: 'audio', src: undefined })).toBe('Audio source missing')
  })
})
