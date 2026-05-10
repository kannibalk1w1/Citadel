# Citadel

An infinite canvas creative reference tool for Windows — a spiritual clone of Ref Flow with major extensions, built on a dark fantasy aesthetic.

## What it is

Citadel is a desktop app for artists, game designers, and creatives who want a single place to collect and arrange visual reference material. Drop images, GIFs, video, audio, 3D models, and sticky notes onto an infinite canvas, connect them with arrows, and export the whole board as a PDF or image.

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
npm run test      # Unit tests (Vitest)
npm run e2e       # End-to-end tests (Playwright)
```

## Project file format

- `.citadel` — JSON project file, assets referenced by relative path
- `.citadelz` — zip archive with project JSON + bundled assets

## License

MIT
