// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { normalizeThemePaletteFile, useUIStore } from './uiStore'

const mockInvoke = vi.fn().mockResolvedValue({ ok: true })

beforeEach(() => {
  Object.assign(window, {
    ipc: { invoke: mockInvoke },
  })
  mockInvoke.mockClear()
  useUIStore.setState({
    uiScale: 1.0,
    archiveRailCollapsed: false,
    exportArea: 'viewport',
    presentationMode: false,
    commentPinsVisible: true,
    includeCommentsInExport: true,
    theme: 'citadel',
    themeOverrides: {},
    savedThemePalettes: [],
    canvasBackground: { mode: 'stone', assetPath: null, opacity: 0.62, scale: 1, repeat: true },
  })
})

describe('uiStore - binding pulse', () => {
  it('tracks and clears thread binding pulses', () => {
    useUIStore.getState().triggerBindingPulse('thread-1')

    expect(useUIStore.getState().bindingPulse?.connectionId).toBe('thread-1')
    expect(typeof useUIStore.getState().bindingPulse?.startedAt).toBe('number')

    useUIStore.getState().clearBindingPulse()
    expect(useUIStore.getState().bindingPulse).toBeNull()
  })
})

describe('uiStore - archive rail', () => {
  it('collapses the persistent rail and persists the preference', () => {
    useUIStore.getState().toggleArchiveRail()

    expect(useUIStore.getState().archiveRailCollapsed).toBe(true)
    expect(mockInvoke).toHaveBeenCalledWith('settings:set', {
      key: 'ui.archiveRailCollapsed',
      value: true,
    })
  })
})

describe('uiStore - themes', () => {
  it('persists the selected theme preset', () => {
    useUIStore.getState().setTheme('graphite')

    expect(useUIStore.getState().theme).toBe('graphite')
    expect(mockInvoke).toHaveBeenCalledWith('settings:set', { key: 'ui.theme', value: 'graphite' })
  })

  it('persists only valid custom theme colours and can reset them', () => {
    useUIStore.getState().setThemeOverrides({ canvas: '#123456', accent: 'not-a-colour' })

    expect(useUIStore.getState().themeOverrides).toEqual({ canvas: '#123456' })
    expect(mockInvoke).toHaveBeenCalledWith('settings:set', {
      key: 'ui.themeOverrides',
      value: { canvas: '#123456' },
    })

    useUIStore.getState().resetThemeOverrides()
    expect(useUIStore.getState().themeOverrides).toEqual({})
  })

  it('saves and reapplies named palettes', () => {
    useUIStore.getState().setTheme('graphite')
    useUIStore.getState().setThemeOverrides({ canvas: '#123456' })

    expect(useUIStore.getState().saveThemePalette('Night study')).toBe(true)
    const [palette] = useUIStore.getState().savedThemePalettes
    expect(palette).toMatchObject({ name: 'Night study', theme: 'graphite', overrides: { canvas: '#123456' } })

    useUIStore.setState({ theme: 'citadel', themeOverrides: {} })
    useUIStore.getState().applyThemePalette(palette.id)
    expect(useUIStore.getState().theme).toBe('graphite')
    expect(useUIStore.getState().themeOverrides).toEqual({ canvas: '#123456' })
  })

  it('accepts only valid theme palette files', () => {
    expect(normalizeThemePaletteFile({
      format: 'citadel-theme', version: 1, name: 'Fog', theme: 'light', overrides: { accent: '#abcdef' },
    })).toEqual({ name: 'Fog', theme: 'light', overrides: { accent: '#abcdef' } })
    expect(normalizeThemePaletteFile({ format: 'citadel-theme', version: 2, name: 'Fog', theme: 'light' })).toBeNull()
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
    expect(mockInvoke).toHaveBeenCalledWith('settings:setMany', {
      values: {
        'export.area': 'board',
        'export.scale': 2,
        'export.includeComments': false,
      },
    })
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
