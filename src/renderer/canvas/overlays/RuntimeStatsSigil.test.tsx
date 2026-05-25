// @vitest-environment jsdom
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RuntimeStatsSigil } from './RuntimeStatsSigil'

describe('RuntimeStatsSigil', () => {
  it('renders the chamber load counters as a compact sigil', () => {
    render(<RuntimeStatsSigil stats={{
      totalRelics: 1200,
      mountedRelics: 42,
      awakeDOMMedia: 3,
      sleepingAnimatedRelics: 18,
    }} />)

    expect(screen.getByText('Chamber Load')).toBeTruthy()
    expect(screen.getByText('42 / 1200')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('18')).toBeTruthy()
  })
})
