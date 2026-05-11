// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'
import { TextEditOverlay } from './TextEditOverlay'

const mockUpdateItem = vi.fn()
const mockSetEditingItemId = vi.fn()
const mockPush = vi.fn()

vi.mock('../store/canvasStore', () => ({
  useCanvasStore: (sel: (s: unknown) => unknown) =>
    sel({
      viewport: () => ({ scale: 1, x: 0, y: 0 }),
      updateItem: mockUpdateItem,
      activeBoardId: 'board-1',
    }),
}))

vi.mock('../store/historyStore', () => ({
  useHistoryStore: Object.assign(
    (sel: (s: unknown) => unknown) => sel({ push: mockPush }),
    { getState: () => ({ push: mockPush }) },
  ),
}))

vi.mock('../store/uiStore', () => ({
  useUIStore: (sel: (s: unknown) => unknown) =>
    sel({ setEditingItemId: mockSetEditingItemId }),
}))

const item = {
  id: 'item-1',
  type: 'sticky' as const,
  x: 0, y: 0, width: 200, height: 150,
  rotation: 0, zIndex: 1, locked: false, visible: true, opacity: 1,
  tags: [],
  meta: { content: 'hello', color: '#2a2820', fontSize: 14, align: 'left', fontStyle: 'normal' },
}

beforeEach(() => {
  mockUpdateItem.mockClear()
  mockPush.mockClear()
  mockSetEditingItemId.mockClear()
})

afterEach(() => {
  cleanup()
})

describe('TextEditOverlay — commit', () => {
  it('pushes ITEM_STYLE to historyStore on blur', () => {
    const { getByRole } = render(<TextEditOverlay item={item} />)
    const ta = getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(ta, { target: { value: 'world' } })
    fireEvent.blur(ta)
    expect(mockUpdateItem).toHaveBeenCalledOnce()
    expect(mockPush).toHaveBeenCalledOnce()
    expect(mockPush).toHaveBeenCalledWith(
      'ITEM_STYLE',
      'board-1',
      { id: 'item-1', meta: item.meta },
      expect.objectContaining({
        id: 'item-1',
        meta: expect.objectContaining({ content: 'world' }),
      }),
    )
  })
})

describe('TextEditOverlay — escape', () => {
  it('restores beforeMeta via updateItem and does not push history', () => {
    const { getByRole } = render(<TextEditOverlay item={item} />)
    const ta = getByRole('textbox')
    fireEvent.keyDown(ta, { key: 'Escape' })
    expect(mockUpdateItem).toHaveBeenCalledWith('board-1', 'item-1', { meta: item.meta })
    expect(mockPush).not.toHaveBeenCalled()
    expect(mockSetEditingItemId).toHaveBeenCalledWith(null)
  })
})
