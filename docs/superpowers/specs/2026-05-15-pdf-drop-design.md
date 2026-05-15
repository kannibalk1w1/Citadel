# PDF Drop Design

## Goal

Allow users to drag a PDF onto the canvas and get a normal image item showing page 1 of that PDF.

## UX

- Dropping a `.pdf` creates an image item at the drop point.
- The image shows page 1 of the PDF.
- Multiple PDFs dropped together create multiple image items with the existing stack offset behavior.
- The image item stores metadata:

```ts
meta: {
  sourcePdf: originalPdfPath,
  sourcePdfPage: 1
}
```

- If rendering fails, the PDF is skipped and the mascot triggers `fracture`.

## Architecture

The renderer renders the PDF page through PDF.js using browser canvas APIs. The renderer does not write files directly. After rendering, it sends a PNG data URL to a new IPC channel, `pdf:cachePageImage`, and the main process writes the PNG into an app-cache folder under `app.getPath('userData')`.

The returned cached PNG path is used as `CanvasItem.src` for a normal `image` item. This keeps all existing image behavior: resize, tint, tags, search, export, selection, and undo.

## Why Renderer Rendering

PDF.js rendering naturally depends on browser canvas APIs. Rendering in the Electron renderer avoids adding native Node canvas dependencies while still obeying the rule that filesystem writes go through IPC.

## Files

- `package.json`
- `package-lock.json`
- `src/main/ipc.ts`
- `src/renderer/canvas/useFileDrop.ts`
- `src/renderer/utils/pdfPreview.ts`

## Acceptance Criteria

- Dropping a PDF creates one image item.
- The image item source points to a cached PNG file.
- The item metadata records original PDF path and page 1.
- Dropping multiple PDFs creates multiple image items.
- Existing non-PDF file drop behavior still works.
- Build passes.
