import React, { useCallback, useEffect, useState } from 'react'
import { TRANSCRIPTION_MODELS } from '../../../types/transcription'
import type {
  ModelDownloadProgress,
  ModelInstallState,
  TranscriptionEngineState,
  TranscriptionModelChoice,
} from '../../../types/transcription'
import { inscribe } from '../toasts/inscriptionToastStore'

/**
 * The transcription section of Settings.
 *
 * Weights are not bundled, so this is where a person either downloads one or
 * points Citadel at a model file they already keep. Both answers are offered
 * plainly: the download is the easy path, the file picker is the offline one.
 */

type ModelsPayload = {
  states: ModelInstallState[]
  choice: TranscriptionModelChoice
  engine: TranscriptionEngineState
}

type Ipc = {
  invoke: (channel: string, args?: unknown) => Promise<unknown>
  on?: (channel: string, listener: (...args: unknown[]) => void) => () => void
}

const noBridge: Ipc = { invoke: async () => undefined }

const getIpc = (): Ipc => (window as unknown as { ipc?: Ipc }).ipc ?? noBridge

const buttonStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: 'var(--text-sm)',
  padding: '4px 7px',
  fontFamily: 'var(--font-body)',
  whiteSpace: 'nowrap',
}

export function formatModelSize(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

/** What the engine row says. A missing binary is the one state with a fix. */
export function engineSummary(engine: TranscriptionEngineState): string {
  switch (engine.source) {
    case 'bundled':
      return 'Included with Citadel'
    case 'custom':
      return engine.path ?? 'Your own build'
    default:
      return 'Not found in this install'
  }
}

export function TranscriptionSettings(): React.ReactElement {
  const [payload, setPayload] = useState<ModelsPayload | null>(null)
  const [progress, setProgress] = useState<ModelDownloadProgress | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    // The panel draws before the bridge has answered, and a stubbed bridge may
    // never answer at all, so anything but a whole reply leaves the rows in
    // their not-loaded state rather than half-populated.
    const next = await getIpc().invoke('transcription:models') as Partial<ModelsPayload> | undefined
    setPayload(next && Array.isArray(next.states) && next.choice && next.engine ? next as ModelsPayload : null)
  }, [])

  useEffect(() => { refresh().catch(console.error) }, [refresh])

  useEffect(() => {
    const ipc = getIpc()
    if (!ipc.on) return undefined
    return ipc.on('transcribe:downloadProgress', (value) => {
      setProgress(value as ModelDownloadProgress)
    })
  }, [])

  const run = useCallback(async (work: () => Promise<void>) => {
    setBusy(true)
    try {
      await work()
      await refresh()
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }, [refresh])

  const download = (id: string, label: string): void => {
    void run(async () => {
      const result = await getIpc().invoke('transcription:downloadModel', { id }) as { ok: boolean; reason?: string }
      if (result.ok) {
        // Downloading a model is a decision, so it becomes the one in use
        // rather than sitting on disk waiting to be chosen a second time.
        await getIpc().invoke('transcription:useModel', { id })
        inscribe(`${label} transcription model installed`)
      } else {
        inscribe(result.reason ?? 'The model could not be downloaded.', { tone: 'danger' })
      }
    })
  }

  const choice = payload?.choice
  const usingCustom = Boolean(choice?.customPath)

  return (
    <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
      <h3 style={{
        margin: '0 0 8px',
        fontSize: 'var(--text-md)',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        Transcription
      </h3>
      <p style={{
        margin: '0 0 10px',
        fontSize: 'var(--text-sm)',
        fontFamily: 'var(--font-body)',
        color: 'var(--text-muted)',
      }}>
        Audio is transcribed on this machine and never uploaded. Downloading a model here is the only
        time Citadel reaches the network, and only when you ask it to.
      </p>

      {TRANSCRIPTION_MODELS.map((model) => {
        const state = payload?.states.find((entry) => entry.id === model.id)
        const installed = Boolean(state?.installed)
        const inUse = !usingCustom && choice?.managedId === model.id
        const downloading = progress?.id === model.id && busy

        return (
          <div
            key={model.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
              gap: 'var(--space-4)',
              alignItems: 'center',
              marginTop: 8,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
                {model.label}
                {inUse ? <span style={{ color: 'var(--text-accent)', marginLeft: 8, fontSize: 'var(--text-sm)' }}>in use</span> : null}
              </div>
              <div style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)', color: 'var(--text-muted)', marginTop: 2 }}>
                {model.note}
              </div>
              <div style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 2 }}>
                {downloading ? `downloading ${progress?.percent ?? 0}%` : `${formatModelSize(model.bytes)}${installed ? ' / installed' : ''}`}
              </div>
            </div>

            {installed && !inUse ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(async () => { await getIpc().invoke('transcription:useModel', { id: model.id }) })}
                style={{ ...buttonStyle, opacity: busy ? 0.45 : 1 }}
              >
                Use
              </button>
            ) : <span />}

            {installed ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(async () => {
                  const result = await getIpc().invoke('transcription:removeModel', { id: model.id }) as { ok: boolean; reason?: string }
                  if (!result.ok) inscribe(result.reason ?? 'The model could not be removed.', { tone: 'danger' })
                })}
                style={{ ...buttonStyle, opacity: busy ? 0.45 : 1 }}
              >
                Remove
              </button>
            ) : downloading ? (
              <button
                type="button"
                onClick={() => { void getIpc().invoke('transcription:cancelDownload', { id: model.id }) }}
                style={buttonStyle}
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => download(model.id, model.label)}
                style={{ ...buttonStyle, opacity: busy ? 0.45 : 1 }}
              >
                Download
              </button>
            )}
          </div>
        )
      })}

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        gap: 'var(--space-4)',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 10,
        borderTop: '1px solid var(--border-muted)',
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
            A model file you already have
            {usingCustom ? <span style={{ color: 'var(--text-accent)', marginLeft: 8, fontSize: 'var(--text-sm)' }}>in use</span> : null}
          </div>
          <div style={{
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {choice?.customPath ?? 'Any whisper.cpp .bin model, downloaded nowhere'}
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(async () => {
            const result = await getIpc().invoke('transcription:chooseModelFile') as { ok: boolean; path?: string }
            if (result.ok) inscribe('Transcription model chosen')
          })}
          style={{ ...buttonStyle, opacity: busy ? 0.45 : 1 }}
        >
          Choose file
        </button>
        {usingCustom ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(async () => { await getIpc().invoke('transcription:clearCustomModel') })}
            style={{ ...buttonStyle, opacity: busy ? 0.45 : 1 }}
          >
            Clear
          </button>
        ) : <span />}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 'var(--space-4)',
        alignItems: 'center',
        marginTop: 10,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
            Recogniser
          </div>
          <div style={{
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-mono)',
            color: payload?.engine.source === 'missing' ? 'var(--accent-danger)' : 'var(--text-muted)',
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {payload ? engineSummary(payload.engine) : 'not loaded'}
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(async () => {
            const result = await getIpc().invoke('transcription:chooseEngine') as { ok: boolean; path?: string }
            if (result.ok) inscribe('Transcription engine chosen')
          })}
          style={{ ...buttonStyle, opacity: busy ? 0.45 : 1 }}
        >
          Choose binary
        </button>
      </div>
    </div>
  )
}
