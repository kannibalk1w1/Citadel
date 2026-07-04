import type { CanvasBoard } from '../../types'
import { createLargeBoardFixture } from './largeBoardFixture'
import {
  createMediaPreviewProfileBoard,
  isMediaPreviewProfileEnabled,
  summarizeMediaPreviewProfile,
  type MediaPreviewProfilePaths,
  type MediaPreviewProfileResult,
} from './mediaPreviewProfile'

type IpcApi = {
  invoke: (channel: string, args?: unknown) => Promise<unknown>
}

type ProfileWindow = Window & {
  __citadelMediaPreviewProfile?: {
    run: (args: MediaPreviewProfilePaths & { timeoutMs?: number }) => Promise<MediaPreviewProfileResult>
  }
  __citadelProfileResult?: MediaPreviewProfileResult
  __citadelLargeChamber?: {
    mount: (options?: { itemCount?: number; columns?: number }) => { boardId: string; itemCount: number }
  }
}

type InstallOptions = {
  window: ProfileWindow
  isDev: boolean
  ipc: IpcApi
  setProfileBoard: (board: CanvasBoard) => void
  now?: () => number
  wait?: (ms: number) => Promise<void>
}

type CacheStats = { count: number; bytes: number }

const PROFILE_ITEM_IDS = [
  'media-preview-profile-gif',
  'media-preview-profile-video',
  'media-preview-profile-model',
]

function isCacheStats(value: unknown): value is CacheStats {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof (value as CacheStats).count === 'number' &&
    typeof (value as CacheStats).bytes === 'number',
  )
}

async function previewStats(ipc: IpcApi): Promise<CacheStats> {
  const result = await ipc.invoke('cache:previewStats')
  if (!isCacheStats(result)) return { count: 0, bytes: 0 }
  return result
}

export function installMediaPreviewProfileHarness(options: InstallOptions): void {
  const target = options.window
  if (!isMediaPreviewProfileEnabled(target.location, options.isDev)) return

  const now = options.now ?? (() => performance.now())
  const wait = options.wait ?? ((ms) => new Promise<void>((resolve) => window.setTimeout(resolve, ms)))

  // Dev-only companion: mounts the deterministic large-chamber fixture so
  // app-level profiles (e.g. ambience-on pan checks) can run on 1,000+ relics.
  target.__citadelLargeChamber = {
    mount: (fixtureOptions) => {
      const fixture = createLargeBoardFixture(fixtureOptions)
      options.setProfileBoard(fixture.board)
      return { boardId: fixture.board.id, itemCount: fixture.board.items.length }
    },
  }

  target.__citadelMediaPreviewProfile = {
    run: async ({ timeoutMs = 9000, ...paths }) => {
      const startedAt = now()
      await options.ipc.invoke('cache:clearUnusedPreviews', { preservePaths: [], assetPaths: [] })
      const cacheBefore = await previewStats(options.ipc)

      const board = createMediaPreviewProfileBoard(paths)
      options.setProfileBoard(board)

      await wait(timeoutMs)
      const cacheAfterCold = await previewStats(options.ipc)

      await wait(500)
      const cacheAfterWarm = await previewStats(options.ipc)

      const previewedCount = Math.max(0, Math.min(PROFILE_ITEM_IDS.length, cacheAfterCold.count - cacheBefore.count))
      const result = summarizeMediaPreviewProfile({
        board,
        assetPaths: paths,
        startedAt,
        finishedAt: now(),
        cacheBefore,
        cacheAfterCold,
        cacheAfterWarm,
        previewedItemIds: PROFILE_ITEM_IDS.slice(0, previewedCount),
        timedOut: previewedCount < PROFILE_ITEM_IDS.length,
      })

      target.__citadelProfileResult = result
      return result
    },
  }
}
