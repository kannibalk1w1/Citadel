import { useMascotStore } from '../store/mascotStore'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'

export async function exportToZip(filename = 'citadel-archive.citadelz'): Promise<void> {
  const mascot = useMascotStore.getState()
  mascot.triggerEffect('progress-fill', 0)

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

  mascot.triggerEffect('progress-fill', 0.5)

  await window.ipc.invoke('export:zip', { projectJson, assetPaths, filename })

  mascot.triggerEffect('lightning-out')
}
