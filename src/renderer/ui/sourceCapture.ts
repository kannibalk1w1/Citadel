import type { CanvasItem } from '../../types'
import { createSourceCapture, sourceCaptureConnection } from '../canvas/sourceCapture'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { canvasColor } from '../theme/canvasColors'
import { askInscription } from './prompt/inscriptionPromptStore'
import { chooseSourceCaptureRegion } from './sourceCaptureRegionStore'
import { inscribe } from './toasts/inscriptionToastStore'

function placementFor(source: CanvasItem | undefined): { x: number; y: number } {
  if (source) return { x: source.x + source.width + 24, y: source.y }
  const viewport = useCanvasStore.getState().viewport()
  return {
    x: (window.innerWidth / 2 - viewport.x) / viewport.scale - 140,
    y: (window.innerHeight / 2 - viewport.y) / viewport.scale - 90,
  }
}

/** Captures a short excerpt or observation while preserving where it came from. */
export async function startSourceCapture(source?: CanvasItem): Promise<void> {
  const content = await askInscription('Capture text or description:', '', { multiline: true })
  if (!content) return
  const reference = await askInscription('Source URL or file path (optional):', source?.src ?? '')
  if (reference === null) return
  const locator = await askInscription('Page, section, or time (optional):')
  if (locator === null) return

  const region = source?.type === 'image'
    ? await chooseSourceCaptureRegion(source.id)
    : undefined
  if (region === null) return

  const canvas = useCanvasStore.getState()
  const boardId = canvas.activeBoardId
  if (!boardId) return
  const liveSource = source ? canvas.items().find((item) => item.id === source.id) : undefined
  const capture = createSourceCapture(content, {
    reference,
    locator: locator || undefined,
    sourceItemId: liveSource?.id,
    region,
  }, placementFor(liveSource))

  canvas.addItem(boardId, capture)
  useHistoryStore.getState().push('ITEM_ADD', boardId, null, capture)
  if (liveSource) {
    const connection = sourceCaptureConnection(capture.id, liveSource.id, canvasColor('accent'))
    canvas.addConnection(boardId, connection)
    useHistoryStore.getState().push('CONNECTION_ADD', boardId, null, connection)
  }
  canvas.setSelection([capture.id])
  inscribe(liveSource ? 'Source capture added and linked' : 'Source capture added')
}
