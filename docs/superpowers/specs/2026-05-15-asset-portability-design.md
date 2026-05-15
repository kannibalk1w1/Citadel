# Asset Portability Design

## Goal

Saved Citadel projects should remain usable after moving the `.citadel` file, and `.citadelz` archives should contain project JSON that points at bundled asset paths instead of absolute machine-local paths.

## Behavior

- Saving a `.citadel` copies local item `src` files outside the project folder into a sibling `assets/` folder.
- Item `src` values in the saved JSON are rewritten to project-relative paths with forward slashes.
- Local files already inside the project folder are saved as relative paths without copying.
- URL/data/blob/local protocol sources are left unchanged.
- Loading a `.citadel` resolves relative item `src` paths back to absolute filesystem paths so existing renderers continue to work.
- Opening a `.citadelz` imports bundled assets into `_citadel_assets` next to the archive and resolves `assets/...` paths to that extraction folder.
- Exporting `.citadelz` rewrites bundled item `src` values to `assets/<unique-filename>` and includes the matching asset bytes.

## Architecture

The Electron main process owns all filesystem work. It parses project JSON during save/load/export/import and rewrites only `CanvasItem.src` values. The renderer remains filesystem-blind and continues to call `file:save`, `file:load`, and `export:zip`.

## Edge Cases

- Missing source files are left untouched instead of failing the whole save/export.
- Duplicate asset basenames get numeric suffixes.
- Existing relative paths are resolved against the project file folder on load.
- HTTP(S), `data:`, `blob:`, `local:`, and `file:` URL values are not copied.

## Acceptance Checks

- `.citadel` save writes relative asset paths.
- External local assets are copied into `assets/`.
- `.citadel` load resolves relative paths to usable absolute paths.
- `.citadelz` export stores bundled asset-relative paths.
- `.citadelz` open/import resolves bundled assets.
- Production build passes.

