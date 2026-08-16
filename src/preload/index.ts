import { contextBridge, ipcRenderer } from 'electron'

// Expose a typed IPC bridge to the renderer
const ipc = {
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    // The wrapper is what gets registered, so the wrapper is what has to be
    // removed. Passing `listener` here removed nothing at all: every returned
    // unsubscribe was inert, so a re-subscribed channel accumulated listeners
    // and fired its handler once per past subscription.
    const subscription = (_e: Electron.IpcRendererEvent, ...args: unknown[]): void => listener(...args)
    ipcRenderer.on(channel, subscription)
    return () => { ipcRenderer.removeListener(channel, subscription) }
  },
  once: (channel: string, listener: (...args: unknown[]) => void) => {
    ipcRenderer.once(channel, (_e, ...args) => listener(...args))
  },
}

contextBridge.exposeInMainWorld('ipc', ipc)

export type IPC = typeof ipc
