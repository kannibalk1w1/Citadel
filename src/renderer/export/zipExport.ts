import { useMascotStore } from '../store/mascotStore'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { useArchiveProgressStore } from '../ui/archiveProgressStore'
import { inscribe } from '../ui/toasts/inscriptionToastStore'

export async function exportToZip(filename = 'citadel-archive.citadelz'): Promise<void> {
  const mascot = useMascotStore.getState()
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

  // Collect all asset paths (src fields from items)
  const assetPaths: string[] = canvas.boards
    .flatMap((b) => b.items)
    .map((i) => i.src)
    .filter((s): s is string => !!s && !s.startsWith('http'))

  useArchiveProgressStore.getState().beginRite('export')
  mascot.triggerEffect('progress-fill', 0)
  try {
    const result = await window.ipc.invoke('export:zip', { projectJson, assetPaths, filename }) as
      { ok: boolean; reason?: string }
    if (result.ok) {
      mascot.triggerEffect('lightning-out')
    } else if (result.reason) {
      // reason absent = user cancelled the save dialog; stay silent then.
      inscribe(`The archive resisted: ${result.reason}`, { tone: 'danger' })
      mascot.triggerEffect('fracture')
    }
  } finally {
    useArchiveProgressStore.getState().endRite()
  }
}
