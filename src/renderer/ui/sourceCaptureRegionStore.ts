import { create } from 'zustand'
import type { ImageRegion } from '../canvas/sourceCapture'

type RegionSelectionRequest = {
  sourceItemId: string
  resolve: (region: ImageRegion | undefined | null) => void
}

type SourceCaptureRegionState = {
  request: RegionSelectionRequest | null
  choose: (sourceItemId: string) => Promise<ImageRegion | undefined | null>
  complete: (region: ImageRegion) => void
  skip: () => void
  cancel: () => void
}

// Selecting a source region happens directly on the Konva image, so it needs a
// small shared hand-off between the capture flow and that renderer.
export const useSourceCaptureRegionStore = create<SourceCaptureRegionState>((set, get) => ({
  request: null,

  choose: (sourceItemId) => {
    get().request?.resolve(null)
    return new Promise<ImageRegion | undefined | null>((resolve) => {
      set({ request: { sourceItemId, resolve } })
    })
  },

  complete: (region) => {
    get().request?.resolve(region)
    set({ request: null })
  },

  skip: () => {
    get().request?.resolve(undefined)
    set({ request: null })
  },

  cancel: () => {
    get().request?.resolve(null)
    set({ request: null })
  },
}))

export function chooseSourceCaptureRegion(sourceItemId: string): Promise<ImageRegion | undefined | null> {
  return useSourceCaptureRegionStore.getState().choose(sourceItemId)
}
