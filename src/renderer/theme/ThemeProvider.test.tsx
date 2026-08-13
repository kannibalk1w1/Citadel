// @vitest-environment jsdom
import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useUIStore } from '../store/uiStore'
import { ThemeProvider } from './ThemeProvider'

const overriddenVariables = ['--bg-canvas', '--bg-ui', '--bg-panel', '--text-primary', '--accent']

describe('ThemeProvider', () => {
  beforeEach(() => {
    useUIStore.setState({ theme: 'citadel', themeOverrides: {} })
    document.documentElement.removeAttribute('data-theme')
    overriddenVariables.forEach((variable) => document.documentElement.style.removeProperty(variable))
  })

  afterEach(cleanup)

  it('applies the selected preset and its custom token overrides', () => {
    useUIStore.setState({ theme: 'ref-flow', themeOverrides: { canvas: '#123456', accent: '#abcdef' } })

    render(<ThemeProvider><div>canvas</div></ThemeProvider>)

    expect(document.documentElement.getAttribute('data-theme')).toBe('ref-flow')
    expect(document.documentElement.style.getPropertyValue('--bg-canvas')).toBe('#123456')
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#abcdef')
  })

  it('removes a previous custom token when the override is reset', () => {
    useUIStore.setState({ themeOverrides: { panel: '#123456' } })
    const view = render(<ThemeProvider><div>canvas</div></ThemeProvider>)
    expect(document.documentElement.style.getPropertyValue('--bg-panel')).toBe('#123456')

    useUIStore.setState({ themeOverrides: {} })
    view.rerender(<ThemeProvider><div>canvas</div></ThemeProvider>)

    expect(document.documentElement.style.getPropertyValue('--bg-panel')).toBe('')
  })
})
