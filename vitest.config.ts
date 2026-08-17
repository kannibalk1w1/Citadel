import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

// Vitest does not read electron.vite.config.ts, so the renderer aliases defined
// there have to be repeated. Without this a test importing through `@/…` fails
// to resolve, which is a confusing way to find out.
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve('src/renderer'),
      '@store': resolve('src/renderer/store'),
      '@canvas': resolve('src/renderer/canvas'),
      '@ui': resolve('src/renderer/ui'),
      '@keybinds': resolve('src/renderer/keybinds'),
      '@theme': resolve('src/renderer/theme'),
      '@export': resolve('src/renderer/export'),
      '@plugins': resolve('src/renderer/plugins'),
      '@types': resolve('src/types'),
    },
  },
})
