import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { useArchiveProgressStore } from '../ui/archiveProgressStore'
import { inscribe } from '../ui/toasts/inscriptionToastStore'
import { projectAssetPaths } from '../../types/projectAssetPaths'

export async function exportToZip(filename = 'citadel-archive.citadelz'): Promise<void> {
  const canvas = useCanvasStore.getState()
  const history = useHistoryStore.getState()

  const projectJson = JSON.stringify({
    version: '0.1.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    boards: canvas.boards,
    activeBoardId: canvas.activeBoardId,
    recordings: history.recordings,
  }, null, 2)

  // PDF originals and transcript sources must travel with their visible items.
  const assetPaths = projectAssetPaths({ boards: canvas.boards, recordings: history.recordings })

  useArchiveProgressStore.getState().beginRite('export')
  try {
    const result = await window.ipc.invoke('export:zip', { projectJson, assetPaths, filename }) as
      { ok: boolean; reason?: string }
    if (result.ok) {
      inscribe('Archive exported (.citadelz)')
    } else if (result.reason) {
      // reason absent = user cancelled the save dialog; stay silent then.
      inscribe(`Archive export failed: ${result.reason}`, { tone: 'danger' })
    }
  } finally {
    useArchiveProgressStore.getState().endRite()
  }
}
