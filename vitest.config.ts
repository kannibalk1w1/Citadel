import { defineConfig } from 'vitest/config'

// Vitest does not read electron.vite.config.ts, so anything the renderer build
// teaches Vite has to be repeated here. `.cur` is not one of Vite's built-in
// asset types, and the cursor set is imported at module scope by
// arcade/dragonCursor.ts — without this, any test that reaches CanvasStage
// fails to parse the binary as JavaScript.
export default defineConfig({
  assetsInclude: ['**/*.cur'],
})
