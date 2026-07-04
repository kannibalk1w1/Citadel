import { beforeEach, describe, expect, it } from 'vitest'
import { askInscription, useInscriptionPromptStore } from './inscriptionPromptStore'

describe('inscriptionPromptStore', () => {
  beforeEach(() => {
    useInscriptionPromptStore.setState({ request: null })
  })

  it('opens a request and resolves with the submitted value', async () => {
    const promise = askInscription('Name this template:', 'Relic set')
    const request = useInscriptionPromptStore.getState().request
    expect(request?.title).toBe('Name this template:')
    expect(request?.initial).toBe('Relic set')
    useInscriptionPromptStore.getState().submit('Tavern rig')
    await expect(promise).resolves.toBe('Tavern rig')
    expect(useInscriptionPromptStore.getState().request).toBeNull()
  })

  it('resolves null on cancel', async () => {
    const promise = askInscription('Rename board:', 'Board 1')
    useInscriptionPromptStore.getState().cancel()
    await expect(promise).resolves.toBeNull()
  })

  it('cancels an in-flight request when a new one arrives', async () => {
    const first = askInscription('One', '')
    const second = askInscription('Two', '')
    await expect(first).resolves.toBeNull()
    useInscriptionPromptStore.getState().submit('answer')
    await expect(second).resolves.toBe('answer')
  })
})
