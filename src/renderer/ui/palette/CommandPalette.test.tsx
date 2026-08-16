// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { Actions } from '../../keybinds/actions'
import { resolver } from '../../keybinds/keybindResolver'
import { actionLabels } from '../../keybinds/actionLabels'
import { CommandPalette } from './CommandPalette'

function open(): void {
  useUIStore.setState({ panels: { ...useUIStore.getState().panels, commandPalette: true } })
}

const undoHandler = vi.fn()
const newBoardHandler = vi.fn()

describe('CommandPalette', () => {
  beforeEach(() => {
    undoHandler.mockClear()
    newBoardHandler.mockClear()
    // The palette reads whatever the app registered; register a small, real set.
    resolver.register(Actions.UNDO, undoHandler)
    resolver.register(Actions.BOARD_NEW, newBoardHandler)
    useUIStore.setState({ panels: { ...useUIStore.getState().panels, commandPalette: false } })
    useCanvasStore.setState({
      boards: [
        { id: 'b1', name: 'Shaders', items: [], connections: [], viewport: { x: 0, y: 0, scale: 1 } },
        { id: 'b2', name: 'Vault', items: [], connections: [], viewport: { x: 0, y: 0, scale: 1 } },
      ],
      activeBoardId: 'b1',
      selectedIds: [],
    })
  })

  afterEach(cleanup)

  it('stays closed until its panel is opened', () => {
    const { container } = render(<CommandPalette />)
    expect(container.firstChild).toBeNull()
  })

  it('presents itself as a modal dialog over a listbox', () => {
    open()
    render(<CommandPalette />)

    expect(screen.getByRole('dialog', { name: 'Command palette' }).getAttribute('aria-modal')).toBe('true')
    expect(screen.getByRole('listbox', { name: 'Commands' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Search commands' })).toBeTruthy()
  })

  it('takes focus so it can be driven from the keyboard immediately', () => {
    open()
    render(<CommandPalette />)

    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Search commands' }))
  })

  it('lists registered actions by their plain labels', () => {
    open()
    render(<CommandPalette />)

    expect(screen.getByText(actionLabels[Actions.UNDO])).toBeTruthy()
    expect(screen.getByText(actionLabels[Actions.BOARD_NEW])).toBeTruthy()
  })

  it('offers the other boards but not the one already open', () => {
    open()
    render(<CommandPalette />)

    expect(screen.getByText('Go to board: Vault')).toBeTruthy()
    expect(screen.queryByText('Go to board: Shaders')).toBeNull()
  })

  it('filters as the query is typed', () => {
    open()
    render(<CommandPalette />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'undo' } })

    expect(screen.getByText(actionLabels[Actions.UNDO])).toBeTruthy()
    expect(screen.queryByText('Go to board: Vault')).toBeNull()
  })

  it('says so plainly when nothing matches', () => {
    open()
    render(<CommandPalette />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzzzz' } })

    expect(screen.getByText('No commands found')).toBeTruthy()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('marks exactly one option selected and points the input at it', () => {
    open()
    render(<CommandPalette />)

    const selected = screen.getAllByRole('option').filter((o) => o.getAttribute('aria-selected') === 'true')
    expect(selected).toHaveLength(1)
    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(selected[0].id)
  })

  it('moves the selection with the arrow keys', () => {
    open()
    render(<CommandPalette />)
    const dialog = screen.getByRole('dialog')

    fireEvent.keyDown(dialog, { key: 'ArrowDown' })

    const options = screen.getAllByRole('option')
    expect(options[1].getAttribute('aria-selected')).toBe('true')
    expect(options[0].getAttribute('aria-selected')).toBe('false')
  })

  it('runs the selected command on Enter and closes', () => {
    open()
    render(<CommandPalette />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'undo' } })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' })

    expect(undoHandler).toHaveBeenCalledTimes(1)
    expect(useUIStore.getState().panels.commandPalette).toBe(false)
  })

  it('runs a command on click too', () => {
    open()
    render(<CommandPalette />)

    fireEvent.click(screen.getByText(actionLabels[Actions.BOARD_NEW]))

    expect(newBoardHandler).toHaveBeenCalledTimes(1)
  })

  it('switches board through the canvas store', () => {
    open()
    render(<CommandPalette />)

    fireEvent.click(screen.getByText('Go to board: Vault'))

    expect(useCanvasStore.getState().activeBoardId).toBe('b2')
  })

  it('closes on Escape without running anything', () => {
    open()
    render(<CommandPalette />)

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(useUIStore.getState().panels.commandPalette).toBe(false)
    expect(undoHandler).not.toHaveBeenCalled()
  })

  it('closes when the backdrop is clicked', () => {
    open()
    const { container } = render(<CommandPalette />)

    fireEvent.mouseDown(container.firstChild as Element)

    expect(useUIStore.getState().panels.commandPalette).toBe(false)
  })

  it('stays open when the dialog itself is clicked', () => {
    open()
    render(<CommandPalette />)

    fireEvent.mouseDown(screen.getByRole('dialog'))

    expect(useUIStore.getState().panels.commandPalette).toBe(true)
  })

  // Typing a query must not reach the canvas keybinds underneath.
  it('keeps its keys to itself', () => {
    open()
    render(<CommandPalette />)
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })

    screen.getByRole('dialog').dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  it('reopens with a cleared query rather than the last search', () => {
    open()
    const view = render(<CommandPalette />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'undo' } })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    view.rerender(<CommandPalette />)

    open()
    view.rerender(<CommandPalette />)

    expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('')
  })

  it('shows the keybind beside a command that has one', () => {
    open()
    render(<CommandPalette />)

    const row = screen.getByText(actionLabels[Actions.UNDO]).closest('[role="option"]')!
    expect(row.textContent).toContain('Ctrl+Z')
  })
})
