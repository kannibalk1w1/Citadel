# PDF Cache Maintenance Design

## Goal

Make Citadel's generated PDF preview cache visible and maintainable from the settings panel.

## User Experience

The Keybindings/settings panel gains a small maintenance section below Fun Settings. It shows:

- PDF preview count.
- Approximate total cache size.
- How many cached preview paths are currently referenced by open boards.
- A Refresh button.
- A Clear unused button.

The clear action removes only cached PNGs that are not referenced by the current open project state. Referenced previews stay in place so visible PDF-derived image items do not break.

## Architecture

Cache filesystem access stays in the Electron main process. The renderer asks for stats via `cache:pdfStats` and requests cleanup via `cache:clearUnusedPdfPreviews`.

The renderer sends a `preservePaths` list containing current canvas item `src` values. The main process only deletes files inside `app.getPath('userData')/pdf-cache` whose absolute path is not in that preserve set.

## Error Handling

If the cache folder does not exist, stats return zero values and clear returns zero deleted files.

If a file cannot be statted or deleted, the main process skips it and continues. The UI keeps the previous displayed stats and writes the error to the console.

## Acceptance Checks

- Settings panel can display PDF cache count and total size.
- Clear unused does not delete cached images referenced by open boards.
- Cache operations go through IPC only.
- Production build passes.

