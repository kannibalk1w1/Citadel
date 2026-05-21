# Export Quality Controls Design

## Goal

Let users choose a higher export scale for sharper image and PDF exports.

## Behavior

- Settings gains an Export section with 1x, 2x, and 3x scale controls.
- The chosen scale persists in settings as `export.scale`.
- Image export renders the current canvas into an offscreen scaled canvas before creating PNG/JPG/WebP data.
- PDF export embeds the higher-resolution image while keeping the PDF page dimensions based on the visible canvas size.

## Architecture

`uiStore` owns `exportScale` and persists changes through existing settings IPC. `App.tsx` loads the persisted value at startup. `imageExport.ts` and `pdfExport.ts` read `exportScale` from the store and use a shared offscreen scaling helper local to each export module.

## Acceptance Checks

- Export scale can be changed from settings.
- Scale persists across sessions.
- Image and PDF export both use the selected scale.
- Build, typecheck, and tests pass.

