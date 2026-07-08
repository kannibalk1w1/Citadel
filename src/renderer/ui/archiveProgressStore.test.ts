import { afterEach, describe, expect, it } from 'vitest'
import { useArchiveProgressStore } from './archiveProgressStore'

describe('archiveProgressStore', () => {
  afterEach(() => useArchiveProgressStore.setState({ rite: null }))

  it('begins at zero percent', () => {
    useArchiveProgressStore.getState().beginRite('import')
    expect(useArchiveProgressStore.getState().rite).toEqual({ op: 'import', percent: 0 })
  })

  it('clamps updates to 0-100 and keeps the op', () => {
    const store = useArchiveProgressStore.getState()
    store.beginRite('export')
    store.updateRite(42, 'relic.png')
    expect(useArchiveProgressStore.getState().rite).toEqual({ op: 'export', percent: 42, label: 'relic.png' })
    useArchiveProgressStore.getState().updateRite(140)
    expect(useArchiveProgressStore.getState().rite?.percent).toBe(100)
  })

  it('ignores updates when no rite is active and clears on end', () => {
    useArchiveProgressStore.getState().updateRite(50)
    expect(useArchiveProgressStore.getState().rite).toBeNull()
    useArchiveProgressStore.getState().beginRite('import')
    useArchiveProgressStore.getState().endRite()
    expect(useArchiveProgressStore.getState().rite).toBeNull()
  })
})
