import { contextBridge, ipcRenderer } from 'electron'

// Expose a typed IPC bridge to the renderer
const ipc = {
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_e, ...args) => listener(...args))
    return () => ipcRenderer.removeListener(channel, listener as never)
  },
  once: (channel: string, listener: (...args: unknown[]) => void) => {
    ipcRenderer.once(channel, (_e, ...args) => listener(...args))
  },
}

contextBridge.exposeInMainWorld('ipc', ipc)

export type IPC = typeof ipc
