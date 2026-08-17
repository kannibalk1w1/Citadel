import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ mode }) => ({
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
    plugins: [
      react(),
      // Kept out of regular builds. `npm run analyze` writes a self-contained
      // report that is useful in any worktree and never needs a global tool.
      ...(mode === 'analyze'
        ? [visualizer({
          filename: resolve('reports/bundle-stats.html'),
          template: 'treemap',
          gzipSize: true,
          brotliSize: true,
          open: false,
        })]
        : []),
    ],
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
}))
