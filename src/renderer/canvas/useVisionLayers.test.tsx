// @vitest-environment jsdom
import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useUIStore } from '../store/uiStore'
import { useVisionLayers } from './useVisionLayers'
import { SQUINT_BLUR_PX } from './visionModes'

/**
 * A board is drawn across two layers that are not in the same subtree, and the
 * DOM-item layer is a portal target created outside React. Both have to receive
 * the check, or a mirrored board would leave its videos facing the other way.
 */
function Harness({ container }: { container: HTMLElement | null }): React.ReactElement {
  useVisionLayers(container)
  return <div />
}

let canvasContainer: HTMLDivElement
let domLayer: HTMLDivElement

beforeEach(() => {
  canvasContainer = document.createElement('div')
  document.body.appendChild(canvasContainer)
  domLayer = document.createElement('div')
  domLayer.id = 'dom-items-layer'
  document.body.appendChild(domLayer)
  useUIStore.setState({ visionMode: 'none', mirrorView: false })
})

afterEach(() => {
  cleanup()
  canvasContainer.remove()
  domLayer.remove()
})

describe('useVisionLayers', () => {
  it('leaves both layers untouched when no check is on', () => {
    render(<Harness container={canvasContainer} />)

    expect(canvasContainer.style.filter).toBe('')
    expect(domLayer.style.filter).toBe('')
    expect(canvasContainer.style.pointerEvents).toBe('')
  })

  it('applies a check to the canvas and the DOM-item layer alike', () => {
    useUIStore.setState({ visionMode: 'value' })
    render(<Harness container={canvasContainer} />)

    expect(canvasContainer.style.filter).toBe('grayscale(1)')
    expect(domLayer.style.filter).toBe('grayscale(1)')
  })

  it('carries the blur to both layers too', () => {
    useUIStore.setState({ visionMode: 'squint' })
    render(<Harness container={canvasContainer} />)

    expect(canvasContainer.style.filter).toBe(`blur(${SQUINT_BLUR_PX}px)`)
    expect(domLayer.style.filter).toBe(`blur(${SQUINT_BLUR_PX}px)`)
  })

  it('holds the board still while it is mirrored', () => {
    useUIStore.setState({ mirrorView: true })
    render(<Harness container={canvasContainer} />)

    expect(canvasContainer.style.transform).toBe('scaleX(-1)')
    expect(domLayer.style.transform).toBe('scaleX(-1)')
    // Konva would otherwise drag items away from the cursor.
    expect(canvasContainer.style.pointerEvents).toBe('none')
    expect(domLayer.style.pointerEvents).toBe('none')
  })

  it('puts both layers back when the checks are turned off', () => {
    useUIStore.setState({ visionMode: 'value', mirrorView: true })
    const view = render(<Harness container={canvasContainer} />)

    useUIStore.setState({ visionMode: 'none', mirrorView: false })
    view.rerender(<Harness container={canvasContainer} />)

    expect(canvasContainer.style.filter).toBe('')
    expect(canvasContainer.style.transform).toBe('')
    expect(canvasContainer.style.pointerEvents).toBe('')
    expect(domLayer.style.filter).toBe('')
    expect(domLayer.style.transform).toBe('')
    expect(domLayer.style.pointerEvents).toBe('')
  })

  it('restores the layers when the board unmounts mid-check', () => {
    useUIStore.setState({ visionMode: 'squint', mirrorView: true })
    const view = render(<Harness container={canvasContainer} />)
    view.unmount()

    expect(canvasContainer.style.filter).toBe('')
    expect(domLayer.style.pointerEvents).toBe('')
  })

  it('survives the DOM-item layer not existing yet', () => {
    domLayer.remove()
    useUIStore.setState({ visionMode: 'value' })
    expect(() => render(<Harness container={canvasContainer} />)).not.toThrow()
    expect(canvasContainer.style.filter).toBe('grayscale(1)')
  })
})
