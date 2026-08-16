// @vitest-environment jsdom
/**
 * Konva paints to a 2D canvas context, and `ctx.fillStyle = 'var(--accent)'` is
 * an invalid assignment the browser silently ignores — the context keeps the
 * colour the *previously drawn shape* set, so the wrong colour depends on draw
 * order. Verified in Citadel's own Electron: assigning a `var()` string leaves
 * `fillStyle` untouched, and `ctx.font = '16px var(--font-body)'` is dropped
 * whole, taking the size with it.
 *
 * Nothing in a unit test renders real pixels, so this guards the inputs: no
 * `var()` string may reach a Konva prop, from a component or from item meta.
 */
import React from 'react'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../types'
import { useCanvasStore } from '../store/canvasStore'
import { refreshCanvasColors } from '../theme/canvasColors'
import { StickyItem } from './items/StickyItem'
import { TextItem } from './items/TextItem'

// Props that end up on a 2D context. `text` and `align` are not paint values.
const PAINT_PROPS = ['fill', 'stroke', 'shadowColor', 'fontFamily', 'fontSize']

const captured: Record<string, unknown>[] = []

function record(props: Record<string, unknown> | null): React.ReactElement {
  captured.push({ ...props })
  return <div />
}

vi.mock('react-konva', () => ({
  Group: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Rect: (props: Record<string, unknown>) => record(props),
  Text: (props: Record<string, unknown>) => record(props),
  Line: (props: Record<string, unknown>) => record(props),
  Transformer: () => <div />,
}))

function item(patch: Partial<CanvasItem>): CanvasItem {
  return {
    id: 'item-1', type: 'text', x: 0, y: 0, width: 300, height: 80,
    rotation: 0, zIndex: 1, locked: false, visible: true, opacity: 1, tags: [],
    ...patch,
  }
}

function setBoard(items: CanvasItem[]): void {
  useCanvasStore.setState({
    boards: [{ id: 'board-1', name: 'Board', items, connections: [], viewport: { x: 0, y: 0, scale: 1 } }],
    activeBoardId: 'board-1',
    selectedIds: [],
  })
}

function paintValues(): unknown[] {
  return captured.flatMap((props) => PAINT_PROPS.map((name) => props[name]).filter((v) => v !== undefined))
}

/** The colour actually handed to the shape that draws the words. */
function textFill(): unknown {
  return captured.map((props) => props.fill).find((fill) => fill !== undefined)
}

describe('Konva paint props', () => {
  beforeEach(() => {
    captured.length = 0
    refreshCanvasColors()
  })
  afterEach(cleanup)

  it('resolves a text item down to values a canvas accepts', () => {
    const text = item({ meta: { content: 'Some words', fontSize: 16 } })
    setBoard([text])

    render(<TextItem item={text} />)

    const values = paintValues()
    expect(values.length).toBeGreaterThan(0)
    for (const value of values) {
      expect(String(value)).not.toContain('var(')
    }
    // Concrete, so the test cannot pass by capturing nothing.
    expect(textFill()).toMatch(/^#[0-9a-f]{3,8}$/i)
    // The font size has to be a number, or Konva builds "…px" from a string
    // and throws the whole font declaration away.
    const sizes = captured.map((p) => p.fontSize).filter((s) => s !== undefined)
    expect(sizes.length).toBeGreaterThan(0)
    for (const size of sizes) expect(typeof size).toBe('number')
  })

  it('resolves a project saved with CSS variables in its meta', () => {
    // Exactly what the text tool wrote before this was fixed, and what every
    // already-saved .citadel file still holds.
    const legacy = item({ meta: { content: 'Older note', fontSize: 'var(--text-xl)', color: 'var(--text-primary)' } })
    setBoard([legacy])

    render(<TextItem item={legacy} />)

    for (const value of paintValues()) {
      expect(String(value)).not.toContain('var(')
    }
    expect(textFill()).toMatch(/^#[0-9a-f]{3,8}$/i)
    const size = captured.map((p) => p.fontSize).find((s) => s !== undefined)
    expect(typeof size).toBe('number')
    expect(size).toBeGreaterThan(0)
  })

  it('resolves a sticky note the same way', () => {
    const sticky = item({ type: 'sticky', meta: { content: 'A note', color: '#1e1b18' } })
    setBoard([sticky])

    render(<StickyItem item={sticky} />)

    for (const value of paintValues()) {
      expect(String(value)).not.toContain('var(')
    }
  })
})

/**
 * The behavioural cases above cover the two components that read item meta.
 * This covers every other Konva component at once, including ones not worth
 * mounting, and is what would have caught the original defect.
 */
describe('no react-konva component hands a CSS variable to a Konva prop', () => {
  const roots = ['items', 'overlays', 'connections', 'annotations']
    .map((dir) => join(__dirname, dir))
    .concat(__dirname)

  function sourceFiles(): string[] {
    return roots.flatMap((dir) => {
      let entries: string[] = []
      try {
        entries = readdirSync(dir)
      } catch {
        return []
      }
      return entries
        .filter((name) => name.endsWith('.tsx') && !name.includes('.test.'))
        .map((name) => join(dir, name))
    })
  }

  it('checks every Konva component in the canvas tree', () => {
    const files = sourceFiles().filter((path) => readFileSync(path, 'utf-8').includes("from 'react-konva'"))
    expect(files.length).toBeGreaterThan(5)

    const offenders: string[] = []
    for (const path of files) {
      readFileSync(path, 'utf-8').split('\n').forEach((line, index) => {
        // A JSX attribute taking a var() string: fill="var(--x)" or
        // fill={'var(--x)'}. Style objects on DOM children are fine — CSS
        // variables are exactly what those are for.
        if (/\b(fill|stroke|shadowColor|fontFamily|fontSize)\s*=\s*\{?\s*['"]var\(/.test(line)) {
          offenders.push(`${path.split('/').slice(-2).join('/')}:${index + 1}  ${line.trim()}`)
        }
      })
    }

    expect(offenders).toEqual([])
  })
})
