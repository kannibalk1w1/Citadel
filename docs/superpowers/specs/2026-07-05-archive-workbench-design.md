# Archive Workbench Design + Plan

Status: approved (user: 'build all of those') and built 2026-07-05.

The Workbench panel (Archive-section button) is the review-and-ingest mode over `archiveWorkbenchModel`: uncategorized relics (local source, no sigils, no inscription) listed with filename-derived suggested-sigil chips (one click applies, undoable via ITEM_STYLE), missing relics listed with travel buttons, and 'Ingest folder…' — a new `assets:scanFolder` IPC (directory picker, recursive depth 3, cap 500 media files) feeding `workbenchIngest.buildIngestItems` (tested) to stamp a relic grid at the viewport centre as undoable ITEM_ADDs. Asset availability is probed through the existing `assets:getThumbnail` channel (cap 200 sources).

- [x] Ingest model + 3 tests; scanFolder IPC; panel with sigil chips, travel, missing section; verified over CDP (uncategorized GIF listed with +gif/+sample chips, applying one cleared the review row). Folder-ingest dialog is native and needs a manual user pass. Suite 302 green.
