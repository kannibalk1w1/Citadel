// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Toolbar } from './Toolbar'
import { useUIStore } from '../store/uiStore'

describe('Toolbar', () => {
  afterEach(cleanup)

  beforeEach(() => {
    useUIStore.setState({ toolMode: 'select', archiveRailCollapsed: true })
  })

  it('keeps direct canvas tools visible and puts specialist tools in the overflow menu', () => {
    render(<Toolbar />)

    expect(screen.getByTitle('Select (V)')).toBeTruthy()
    expect(screen.getByTitle('Connect (C)')).toBeTruthy()
    expect(screen.getByTitle('Note (N)')).toBeTruthy()
    expect(screen.queryByTitle('Link (K)')).toBeNull()

    fireEvent.click(screen.getByLabelText('More tools'))

    expect(screen.getByTitle('Link (K)')).toBeTruthy()
    expect(screen.getByTitle('YouTube Embed (paste URL)')).toBeTruthy()
  })

  it('closes the overflow menu when focus returns to the canvas', () => {
    render(<Toolbar />)

    fireEvent.click(screen.getByLabelText('More tools'))
    fireEvent.mouseDown(document.body)

    expect(screen.queryByTitle('Link (K)')).toBeNull()
  })
})
