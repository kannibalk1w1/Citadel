// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'
import { parseDocumentMarkdown, richDocumentText } from '../../types/documents'
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
  meta: { content: 'hello', color: '#1e1b18', fontSize: 14, align: 'left', fontStyle: 'normal' },
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
    expect(mockUpdateItem).toHaveBeenLastCalledWith(
      'board-1', 'item-1',
      expect.objectContaining({ meta: expect.objectContaining({ content: 'world' }) }),
    )
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

  it('blur after Escape does not double-commit', () => {
    const { getByRole } = render(<TextEditOverlay item={item} />)
    const ta = getByRole('textbox')
    fireEvent.keyDown(ta, { key: 'Escape' })
    fireEvent.blur(ta)
    expect(mockUpdateItem).toHaveBeenCalledOnce()
    expect(mockPush).not.toHaveBeenCalled()
  })
})


describe('TextEditOverlay — formatted documents', () => {
  const source = '# Original\n\n**bold**'
  const richDocument = parseDocumentMarkdown(source)
  const richItem = { ...item, type: 'text' as const, meta: { content: richDocumentText(richDocument), richDocument, documentMarkdown: source } }

  it('edits Markdown with normal newlines and commits formatting and plain content in one undo event', () => {
    const { getByRole } = render(<TextEditOverlay item={richItem} />)
    const textarea = getByRole('textbox', { name: 'Document Markdown' }) as HTMLTextAreaElement
    expect(textarea.value).toBe(source)
    fireEvent.change(textarea, { target: { value: '## Changed\n\n*italic*' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(mockPush).not.toHaveBeenCalled()
    fireEvent.blur(textarea)
    expect(mockPush).toHaveBeenCalledOnce()
    expect(mockPush).toHaveBeenCalledWith('ITEM_STYLE', 'board-1', { id: item.id, meta: richItem.meta }, expect.objectContaining({ meta: expect.objectContaining({ content: 'Changed\n\nitalic', documentMarkdown: '## Changed\n\n*italic*', richDocument: expect.objectContaining({ version: 1 }) }) }))
  })

  it('restores the exact original rich payload on Escape after live edits', () => {
    const { getByRole } = render(<TextEditOverlay item={richItem} />)
    const textarea = getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'new **words**' } })
    fireEvent.keyDown(textarea, { key: 'Escape' })
    fireEvent.blur(textarea)
    expect(mockUpdateItem).toHaveBeenLastCalledWith('board-1', item.id, { meta: richItem.meta })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('applies formatting tools to the selected source without an intermediate undo event', () => {
    const { getByRole } = render(<TextEditOverlay item={richItem} />)
    const textarea = getByRole('textbox') as HTMLTextAreaElement
    textarea.setSelectionRange(2, 10)
    fireEvent.click(getByRole('button', { name: 'Bold' }))
    expect(textarea.value).toContain('# **Original**')
    expect(mockPush).not.toHaveBeenCalled()
    fireEvent.blur(textarea)
    expect(mockPush).toHaveBeenCalledOnce()
  })
})
