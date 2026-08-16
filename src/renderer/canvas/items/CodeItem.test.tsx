// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { CodeItem } from './CodeItem'

// Records the props the card hands its wrapper, so the far-zoom branch can be
// held to the same selection chrome and drag/resize affordances as the full one.
const domItemProps: Record<string, unknown>[] = []
vi.mock('./DOMItem', () => ({
  DOMItem: (props: { children: React.ReactNode } & Record<string, unknown>) => {
    domItemProps.push(props)
    return <div>{props.children}</div>
  },
}))

const item: CanvasItem = {
  id: 'code-1', type: 'code', x: 0, y: 0, width: 500, height: 300,
  rotation: 0, zIndex: 1, locked: false, visible: true, opacity: 1, tags: [],
  meta: { language: 'typescript', code: "const title = 'Citadel'\n// archive" },
}

// Below 5 / 12 the shared detail threshold puts the card into silhouette.
const FAR_ZOOM = 0.2
const NEAR_ZOOM = 1

function setViewport(scale: number, selectedIds: string[] = []): void {
  useCanvasStore.setState({
    boards: [{ id: 'board-1', name: 'Board', items: [item], connections: [], viewport: { x: 0, y: 0, scale } }],
    activeBoardId: 'board-1',
    selectedIds,
  })
}

describe('CodeItem', () => {
  afterEach(cleanup)

  beforeEach(() => {
    domItemProps.length = 0
    setViewport(NEAR_ZOOM)
  })

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

  // The card must colour by the picked language, not by one fixed grammar.
  describe('language-aware colouring', () => {
    function kindOf(text: string): string | undefined {
      return (screen.getByText(text) as HTMLElement).style.color
    }

    it('colours a python # comment as a comment', () => {
      const python = { ...item, meta: { language: 'python', code: 'def run():  # go' } }
      render(<CodeItem item={python} domOnly />)

      expect(kindOf('# go')).toBe('var(--code-comment)')
      expect(kindOf('def')).toBe('var(--code-keyword)')
    })

    it('leaves the same # alone in a language that has no such comment', () => {
      const json = { ...item, meta: { language: 'json', code: '"a": "# go"' } }
      render(<CodeItem item={json} domOnly />)

      expect(screen.queryByText('# go')).toBeNull()
      expect(kindOf('"# go"')).toBe('var(--code-string)')
    })

    it('renders plaintext with no highlighting at all', () => {
      const plain = { ...item, meta: { language: 'plaintext', code: 'const a = 1' } }
      const { container } = render(<CodeItem item={plain} domOnly />)

      const colours = [...container.querySelectorAll('code span')].map((s) => (s as HTMLElement).style.color)
      expect(new Set(colours)).toEqual(new Set(['var(--code-text)']))
    })
  })

  describe('far-zoom progressive detail', () => {
    it('drops syntax-highlighted lines for a silhouette once past the threshold', () => {
      setViewport(FAR_ZOOM)
      render(<CodeItem item={item} domOnly />)

      expect(screen.getByLabelText('typescript code snippet').dataset.silhouette).toBe('true')
      expect(screen.queryByText('const')).toBeNull()
      expect(screen.queryByRole('button', { name: 'Copy code' })).toBeNull()
    })

    it('keeps the full card at readable zoom', () => {
      render(<CodeItem item={item} domOnly />)

      expect(screen.getByLabelText('typescript code snippet').dataset.silhouette).toBeUndefined()
      expect(screen.getByText('const')).toBeTruthy()
    })

    // Selection is what makes Copy and editing reachable at any zoom, so it has
    // to wake the card rather than merely outline a silhouette.
    it('wakes a selected card even at far zoom', () => {
      setViewport(FAR_ZOOM, [item.id])
      render(<CodeItem item={item} domOnly />)

      expect(screen.getByLabelText('typescript code snippet').dataset.silhouette).toBeUndefined()
      expect(screen.getByRole('button', { name: 'Copy code' })).toBeTruthy()
    })

    it('opens the editor from the silhouette and wakes the card to do it', () => {
      setViewport(FAR_ZOOM)
      render(<CodeItem item={item} domOnly />)

      fireEvent.doubleClick(screen.getByLabelText('typescript code snippet'))

      const editor = screen.getByLabelText('Edit code snippet') as HTMLTextAreaElement
      expect(editor.value).toBe(item.meta!.code)
    })

    // The whole point of the gate: node count stops tracking snippet length.
    it('renders a constant number of nodes however long the snippet is', () => {
      setViewport(FAR_ZOOM)
      const long = { ...item, meta: { ...item.meta, code: Array.from({ length: 400 }, (_, i) => `const line${i} = ${i}`).join('\n') } }

      const { container: shortCard } = render(<CodeItem item={item} domOnly />)
      const shortNodes = shortCard.querySelectorAll('*').length
      cleanup()
      const { container: longCard } = render(<CodeItem item={long} domOnly />)

      expect(longCard.querySelectorAll('*').length).toBe(shortNodes)
    })

    it('keeps the same wrapper affordances so selection chrome and resizing survive', () => {
      setViewport(FAR_ZOOM)
      render(<CodeItem item={item} domOnly />)
      const farProps = domItemProps.at(-1)!

      cleanup()
      domItemProps.length = 0
      setViewport(NEAR_ZOOM)
      render(<CodeItem item={item} domOnly />)
      const nearProps = domItemProps.at(-1)!

      expect(farProps.editableFrame).toBe(true)
      expect(farProps.editableFrame).toBe(nearProps.editableFrame)
      expect(farProps.item).toEqual(nearProps.item)
      expect(typeof farProps.onClick).toBe('function')
    })
  })
})
