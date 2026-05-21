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
