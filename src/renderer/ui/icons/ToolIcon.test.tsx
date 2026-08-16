// @vitest-environment jsdom
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LOCK_PATH_D, TOOL_ICON_NAMES, ToolIcon, type ToolIconName } from './ToolIcon'

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
      'plus',
      'close',
      'minus',
      'edit',
      'duplicate',
      'bookmark',
      'trash',
      'check',
      'play',
      'pause',
      'stop',
      'chevronDown',
      'chevronLeft',
      'chevronRight',
      'sortAsc',
      'sortDesc',
      'warning',
      'lock',
      'search',
      'arrowHead',
      'diamondHead',
      'dashed',
      'alignLeft',
      'alignCenterH',
      'alignRight',
      'alignTop',
      'alignCenterV',
      'alignBottom',
    ])
  })

  it('renders monochrome currentColor icons with a consistent viewbox', () => {
    render(<ToolIcon name={'select' as ToolIconName} />)

    const icon = screen.getByTestId('tool-icon-select')
    expect(icon.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(icon.getAttribute('stroke')).toBe('currentColor')
    expect(icon.getAttribute('fill')).toBe('none')
  })

  // A name can reach the union and the roster while iconPaths still has no case
  // for it, which renders an empty <svg> that only shows up by eye. Draw them all.
  it('draws geometry for every name on the roster', () => {
    for (const name of TOOL_ICON_NAMES) {
      // Scoped to this render's own container: cleanup is not automatic here, so
      // a document-wide query would collide with icons left by earlier cases.
      const { container, unmount } = render(<ToolIcon name={name} />)
      const icon = container.querySelector(`[data-testid="tool-icon-${name}"]`)
      expect(icon, `${name} renders no icon`).not.toBeNull()
      expect(icon!.childElementCount, `${name} renders no shapes`).toBeGreaterThan(0)
      unmount()
    }
  })

  // The canvas lock badge is a Konva <Path> fed from this same string, so a
  // change here has to stay a valid single path definition.
  it('exports one lock outline both layers can draw', () => {
    expect(LOCK_PATH_D.startsWith('M')).toBe(true)
    const { container } = render(<ToolIcon name="lock" />)
    expect(container.querySelector('path')?.getAttribute('d')).toBe(LOCK_PATH_D)
  })

  // Icons are decorative; the accessible name has to come from the control that
  // wraps them, so the SVG must stay out of the accessibility tree.
  it('hides icons from assistive technology', () => {
    const { container } = render(<ToolIcon name="trash" />)
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })
})
