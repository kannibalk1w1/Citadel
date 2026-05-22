// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useUIStore } from './uiStore'

const mockInvoke = vi.fn().mockResolvedValue({ ok: true })

beforeEach(() => {
  Object.assign(window, {
    ipc: { invoke: mockInvoke },
  })
  mockInvoke.mockClear()
  useUIStore.setState({
    uiScale: 1.0,
    exportArea: 'viewport',
    presentationMode: false,
    commentPinsVisible: true,
    includeCommentsInExport: true,
    canvasBackground: { mode: 'stone', assetPath: null, opacity: 0.62, scale: 1, repeat: true },
  })
})

describe('uiStore - comment pins', () => {
  it('shows comment pins by default', () => {
    expect(useUIStore.getState().commentPinsVisible).toBe(true)
  })

  it('toggles comment pin visibility', () => {
    useUIStore.getState().toggleCommentPinsVisible()
    expect(useUIStore.getState().commentPinsVisible).toBe(false)
    useUIStore.getState().toggleCommentPinsVisible()
    expect(useUIStore.getState().commentPinsVisible).toBe(true)
  })

  it('persists export comment inclusion', () => {
    useUIStore.getState().setIncludeCommentsInExport(false)
    expect(useUIStore.getState().includeCommentsInExport).toBe(false)
    expect(mockInvoke).toHaveBeenCalledWith('settings:set', { key: 'export.includeComments', value: false })
  })
})

describe('uiStore - canvas background', () => {
  it('defaults to the built-in stone background', () => {
    expect(useUIStore.getState().canvasBackground).toEqual({
      mode: 'stone',
      assetPath: null,
      opacity: 0.62,
      scale: 1,
      repeat: true,
    })
  })

  it('persists custom background settings with clamped values', () => {
    useUIStore.getState().setCanvasBackground({
      mode: 'custom',
      assetPath: 'C:/textures/stone.png',
      opacity: 2,
      scale: 0.1,
      repeat: false,
    })

    expect(useUIStore.getState().canvasBackground).toEqual({
      mode: 'custom',
      assetPath: 'C:/textures/stone.png',
      opacity: 1,
      scale: 0.25,
      repeat: false,
    })
    expect(mockInvoke).toHaveBeenCalledWith('settings:set', {
      key: 'ui.canvasBackground',
      value: {
        mode: 'custom',
        assetPath: 'C:/textures/stone.png',
        opacity: 1,
        scale: 0.25,
        repeat: false,
      },
    })
  })
})

describe('uiStore — uiScale', () => {
  it('defaults to 1.0', () => {
    expect(useUIStore.getState().uiScale).toBe(1.0)
  })

  it('setUiScale updates uiScale', () => {
    useUIStore.getState().setUiScale(1.25)
    expect(useUIStore.getState().uiScale).toBe(1.25)
  })

  it('setUiScale clamps values below 0.75 to 0.75', () => {
    useUIStore.getState().setUiScale(0.5)
    expect(useUIStore.getState().uiScale).toBe(0.75)
  })

  it('setUiScale clamps values above 1.5 to 1.5', () => {
    useUIStore.getState().setUiScale(2.0)
    expect(useUIStore.getState().uiScale).toBe(1.5)
  })

  it('setUiScale calls zoom:set IPC with clamped factor', () => {
    useUIStore.getState().setUiScale(1.5)
    expect(mockInvoke).toHaveBeenCalledWith('zoom:set', { factor: 1.5 })
  })
})

describe('uiStore — exportArea', () => {
  it('defaults to viewport export', () => {
    expect(useUIStore.getState().exportArea).toBe('viewport')
  })

  it('setExportArea persists the selected export area', () => {
    useUIStore.getState().setExportArea('board')
    expect(useUIStore.getState().exportArea).toBe('board')
    expect(mockInvoke).toHaveBeenCalledWith('settings:set', { key: 'export.area', value: 'board' })
  })

  it('applies export presets as area, scale, and comment settings', () => {
    useUIStore.getState().applyExportPreset('clean')

    expect(useUIStore.getState().exportArea).toBe('board')
    expect(useUIStore.getState().exportScale).toBe(2)
    expect(useUIStore.getState().includeCommentsInExport).toBe(false)
    expect(mockInvoke).toHaveBeenCalledWith('settings:set', { key: 'export.area', value: 'board' })
    expect(mockInvoke).toHaveBeenCalledWith('settings:set', { key: 'export.scale', value: 2 })
    expect(mockInvoke).toHaveBeenCalledWith('settings:set', { key: 'export.includeComments', value: false })
  })
})

describe('uiStore — presentationMode', () => {
  it('defaults to off', () => {
    expect(useUIStore.getState().presentationMode).toBe(false)
  })

  it('toggles presentation mode', () => {
    useUIStore.getState().togglePresentationMode()
    expect(useUIStore.getState().presentationMode).toBe(true)
    useUIStore.getState().togglePresentationMode()
    expect(useUIStore.getState().presentationMode).toBe(false)
  })
})
