/// <reference types="vite/client" />

import type { IPC } from '../preload/index'

declare global {
  interface Window {
    ipc: IPC
  }
}
