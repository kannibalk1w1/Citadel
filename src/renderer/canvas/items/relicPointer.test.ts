// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUIStore } from '../../store/uiStore'
import { useInscriptionToastStore } from '../../ui/toasts/inscriptionToastStore'
import { adoptSelectTool, handleRelicToolPress, relicPressMoves } from './relicPointer'

beforeEach(() => { useUIStore.setState({ toolMode: 'select' }) })

describe('relicPressMoves', () => {
  it('lets a relic be dragged under every tool aimed at the empty ground', () => {
    for (const mode of ['select', 'pan', 'lasso', 'text', 'sticky', 'code', 'swatch', 'comparison'] as const) {
      expect(relicPressMoves(mode)).toBe(true)
    }
  })

  it('leaves the relic alone where the tool is about pressing relics', () => {
    for (const mode of ['connect', 'link', 'tag'] as const) {
      expect(relicPressMoves(mode)).toBe(false)
    }
  })
})

describe('adoptSelectTool', () => {
  it('hands the canvas back to Select when a passive tool is active', () => {
    useUIStore.setState({ toolMode: 'pan' })

    adoptSelectTool('pan')

    expect(useUIStore.getState().toolMode).toBe('select')
  })

  it('leaves a tool that is already Select alone', () => {
    adoptSelectTool('select')

    expect(useUIStore.getState().toolMode).toBe('select')
  })

  it('never steals connect, link or tag', () => {
    for (const mode of ['connect', 'link', 'tag'] as const) {
      useUIStore.setState({ toolMode: mode })

      adoptSelectTool(mode)

      expect(useUIStore.getState().toolMode).toBe(mode)
    }
  })
})

describe('handleRelicToolPress', () => {
  const relic = { id: 'relic-1', link: undefined as string | undefined }

  beforeEach(() => {
    useUIStore.setState({ toolMode: 'select', connectFromId: null })
    Object.assign(window, { ipc: { invoke: vi.fn().mockResolvedValue({ ok: true }) } })
  })

  it('lets every passive tool through to selection', () => {
    for (const mode of ['select', 'pan', 'lasso', 'text', 'sticky', 'code'] as const) {
      expect(handleRelicToolPress(mode, 'board-1', relic)).toBe(false)
    }
  })

  it('arms a thread on the connect tool', () => {
    expect(handleRelicToolPress('connect', 'board-1', relic)).toBe(true)
    expect(useUIStore.getState().connectFromId).toBe('relic-1')
  })

  it('opens the relic link through the bridge, never fs or a raw window', () => {
    const ipc = (window as unknown as { ipc: { invoke: ReturnType<typeof vi.fn> } }).ipc

    expect(handleRelicToolPress('link', 'board-1', { id: 'relic-1', link: 'https://example.com' })).toBe(true)
    expect(ipc.invoke).toHaveBeenCalledWith('shell:openURL', { url: 'https://example.com' })
  })

  it('says so rather than doing nothing when the relic has no link', () => {
    const ipc = (window as unknown as { ipc: { invoke: ReturnType<typeof vi.fn> } }).ipc

    expect(handleRelicToolPress('link', 'board-1', relic)).toBe(true)
    expect(ipc.invoke).not.toHaveBeenCalled()
    expect(useInscriptionToastStore.getState().toasts.at(-1)?.text).toContain('No link on this item')
  })

  it('opens the tag panel on the tag tool', () => {
    expect(handleRelicToolPress('tag', 'board-1', relic)).toBe(true)
    expect(useUIStore.getState().panels.tagSearch).toBe(true)
  })
})
