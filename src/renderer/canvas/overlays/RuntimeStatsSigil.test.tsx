// @vitest-environment jsdom
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RuntimeStatsSigil } from './RuntimeStatsSigil'

describe('RuntimeStatsSigil', () => {
  it('renders the board load counters as a compact readout', () => {
    render(<RuntimeStatsSigil stats={{
      totalRelics: 1200,
      mountedRelics: 42,
      awakeDOMMedia: 3,
      sleepingAnimatedRelics: 18,
    }} />)

    expect(screen.getByText('Board Load')).toBeTruthy()
    expect(screen.getByText('42 / 1200')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('18')).toBeTruthy()
  })
})
