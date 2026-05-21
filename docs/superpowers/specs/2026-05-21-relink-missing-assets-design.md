# Relink Missing Assets Design

## Goal

Let users repair missing local asset references from the Maintenance panel.

## Behavior

- When local asset health reports missing paths, Maintenance shows a Relink folder button.
- The user chooses a folder.
- Citadel scans that folder recursively and matches missing paths by filename.
- Matching item `src` values are rewritten to the discovered file paths.
- Unmatched paths remain missing.
- The project is marked dirty after any relink.

## Architecture

Filesystem scanning stays in the Electron main process through `assets:relinkMissing`. The renderer sends the missing path list, receives a replacement map, and updates canvas items through `canvasStore.updateItem`.

## Acceptance Checks

- Relink only appears when assets are missing.
- Folder scanning goes through IPC.
- Matching missing assets update open canvas item sources.
- Unmatched missing assets remain unchanged.
- Build, typecheck, and tests pass.

