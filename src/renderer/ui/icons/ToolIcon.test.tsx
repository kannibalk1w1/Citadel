// @vitest-environment jsdom
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TOOL_ICON_NAMES, ToolIcon, type ToolIconName } from './ToolIcon'

describe('ToolIcon', () => {
  it('covers every toolbar toolmark needed by the command spine', () => {
    expect(TOOL_ICON_NAMES).toEqual([
      'select',
      'pan',
      'lasso',
      'connect',
      'text',
      'code',
      'sticky',
      'link',
      'swatch',
      'tag',
      'comparison',
      'youtube',
      'snap',
      'autoArrange',
      'record',
      'recordStop',
      'voice',
      'presentation',
      'theme',
    ])
  })

  it('renders monochrome currentColor icons with a consistent viewbox', () => {
    render(<ToolIcon name={'select' as ToolIconName} />)

    const icon = screen.getByTestId('tool-icon-select')
    expect(icon.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(icon.getAttribute('stroke')).toBe('currentColor')
    expect(icon.getAttribute('fill')).toBe('none')
  })
})
