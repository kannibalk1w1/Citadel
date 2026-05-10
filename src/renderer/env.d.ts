/// <reference types="vite/client" />

declare module '*.mp3' {
  const src: string
  export default src
}

declare module '*.cur' {
  const src: string
  export default src
}

import type { IPC } from '../preload/index'

declare global {
  interface Window {
    ipc: IPC
  }
}
