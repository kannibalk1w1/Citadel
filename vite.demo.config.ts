import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Standalone static renderer build for browser hosts such as itch.io. */
export default defineConfig({
  root: resolve('src/web-demo'),
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve('src/renderer'),
      '@store': resolve('src/renderer/store'),
      '@canvas': resolve('src/renderer/canvas'),
      '@ui': resolve('src/renderer/ui'),
      '@keybinds': resolve('src/renderer/keybinds'),
      '@theme': resolve('src/renderer/theme'),
      '@mascot': resolve('src/renderer/mascot'),
      '@export': resolve('src/renderer/export'),
      '@plugins': resolve('src/renderer/plugins'),
      '@types': resolve('src/types'),
    },
  },
  define: {
    'import.meta.env.VITE_CITADEL_DEMO': JSON.stringify('true'),
  },
  build: {
    outDir: resolve('dist-demo'),
    emptyOutDir: true,
  },
  server: {
    fs: { allow: [resolve('.')] },
  },
})
