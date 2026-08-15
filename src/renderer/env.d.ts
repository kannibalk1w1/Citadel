/// <reference types="vite/client" />

// Asset module declarations live in src/types/assets.d.ts — this file is a
// module, so ambient declarations here would not be global.
import type { IPC } from '../preload/index'

declare global {
  interface Window {
    ipc: IPC
  }
}
