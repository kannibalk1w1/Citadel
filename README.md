# Citadel

An atmospheric archive for memory, research, reference, introspection, and nonlinear thought.

## What it is

Citadel is a Windows desktop app for collecting files, memories, research, fragments, and thoughts, then marking, arranging, annotating, searching, and binding them into visible patterns. It can support worldbuilding, game design, art direction, academic research, personal archives, and creative investigation, but its core identity is a dark archival canvas rather than a worldbuilding-only tool.

Drop images, GIFs, video, audio, 3D models, PDFs, and notes onto an infinite canvas. Connect them with threads, search them through the Index, and preserve the archive as a `.citadel` project or portable `.citadelz` bundle.

## Features

- **Infinite canvas** — pan, zoom, and arrange anything freely with Konva.js
- **Media types** — images, GIFs, video, YouTube embeds, audio with waveform, 3D models (Three.js), text, stickies, colour swatches, and A/B comparison widgets
- **Connections** — bezier/straight/elbow arrows between any two items with labels and arrow heads
- **Snapping** — smart alignment guides with a spatial index for performance
- **Undo/redo + session recording** — the same event log drives both; record a walkthrough and play it back
- **Multi-board** — tabbed boards within a single project file
- **Export** — PDF (jsPDF), PNG/JPG, and `.citadelz` zip archives with bundled assets
- **Plugin system** — register custom item types and hooks
- **Fully rebindable keybinds** — every action is a named string, no hardcoded shortcuts
- **Mascot** — a chess rook tower that reacts to app events with animations

## Theme

Dark fantasy. Stone tones, aged gold (`#c8a96e`) text, arcane details. Display font: Cinzel. UI font: Inter / DM Sans. Mono: JetBrains Mono. Never generic/material/flat.

## Stack

| Concern | Library |
|---|---|
| Desktop shell | Electron |
| UI | React + TypeScript |
| Canvas | Konva.js + react-konva |
| State | Zustand |
| Build | electron-vite |
| Package | electron-builder (NSIS + portable .exe) |
| Tests | Vitest + Playwright |

## Getting started

```bash
npm install
npm run dev       # Vite + Electron with HMR
npm run build     # Production build
npm run package   # Production build + Windows installer/portable artifacts
npm run test      # Unit tests (Vitest)
npm run e2e       # End-to-end tests (Playwright)
```

For local alpha packaging and smoke testing, see [Citadel Release Readiness Lite](docs/release-readiness-lite.md).

## Project file format

- `.citadel` — JSON project file, assets referenced by relative path
- `.citadelz` — zip archive with project JSON + bundled assets

## License

MIT
