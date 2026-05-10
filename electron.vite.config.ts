import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@main': resolve('src/main'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: 'src/renderer',
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
    css: {
      postcss: './postcss.config.js',
    },
  },
})
