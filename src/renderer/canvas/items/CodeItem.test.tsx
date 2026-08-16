// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../../types'
import { CodeItem } from './CodeItem'

vi.mock('./DOMItem', () => ({
  DOMItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const item: CanvasItem = {
  id: 'code-1', type: 'code', x: 0, y: 0, width: 500, height: 300,
  rotation: 0, zIndex: 1, locked: false, visible: true, opacity: 1, tags: [],
  meta: { language: 'typescript', code: "const title = 'Citadel'\n// archive" },
}

describe('CodeItem', () => {
  afterEach(cleanup)

  it('renders a labelled terminal card with code and a copy control', () => {
    render(<CodeItem item={item} domOnly />)

    expect(screen.getByLabelText('typescript code snippet')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeTruthy()
    expect(screen.getByText('const')).toBeTruthy()
    expect(screen.getByText('// archive')).toBeTruthy()
  })

  it('numbers every line of the snippet', () => {
    render(<CodeItem item={item} domOnly />)

    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.queryByText('3')).toBeNull()
  })

  // The card is a DOM overlay on a Konva canvas, so a stray render of the Konva
  // half would paint the terminal twice.
  it('draws nothing on the canvas half of the item', () => {
    const { container } = render(<CodeItem item={item} />)

    expect(container.firstChild).toBeNull()
  })

  it('opens an editor on double-click, seeded with the current code', () => {
    render(<CodeItem item={item} domOnly />)

    fireEvent.doubleClick(screen.getByTitle('Double-click to edit'))

    const editor = screen.getByLabelText('Edit code snippet') as HTMLTextAreaElement
    expect(editor.value).toBe(item.meta!.code)
  })

  it('leaves the code untouched when the editor is dismissed with Escape', () => {
    render(<CodeItem item={item} domOnly />)

    fireEvent.doubleClick(screen.getByTitle('Double-click to edit'))
    const editor = screen.getByLabelText('Edit code snippet')
    fireEvent.change(editor, { target: { value: 'discarded' } })
    fireEvent.keyDown(editor, { key: 'Escape' })

    expect(screen.queryByLabelText('Edit code snippet')).toBeNull()
    expect(screen.getByText('const')).toBeTruthy()
  })
})
