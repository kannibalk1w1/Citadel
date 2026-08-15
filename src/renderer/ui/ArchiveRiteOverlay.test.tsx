// @vitest-environment jsdom
import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ArchiveRiteOverlay } from './ArchiveRiteOverlay'
import { useArchiveProgressStore } from './archiveProgressStore'

describe('ArchiveRiteOverlay', () => {
  afterEach(() => {
    cleanup()
    useArchiveProgressStore.setState({ rite: null })
  })

  it('renders nothing when no rite is active', () => {
    const { container } = render(<ArchiveRiteOverlay />)
    expect(container.firstChild).toBeNull()
  })

  it('shows the importing header and percent while importing', () => {
    useArchiveProgressStore.setState({ rite: { op: 'import', percent: 37 } })
    render(<ArchiveRiteOverlay />)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText(/importing archive/i)).toBeTruthy()
    expect(screen.getByText('37%')).toBeTruthy()
  })

  it('shows the exporting header while exporting', () => {
    useArchiveProgressStore.setState({ rite: { op: 'export', percent: 80 } })
    render(<ArchiveRiteOverlay />)
    expect(screen.getByText(/exporting archive/i)).toBeTruthy()
  })
})
