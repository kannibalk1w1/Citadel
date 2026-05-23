# Citadel Capabilities Guide

Citadel is an infinite-canvas desktop reference tool for collecting, arranging, annotating, comparing, and exporting creative material. It is designed for visual development, art direction, worldbuilding, game design reference, moodboards, and project planning.

## Quick Start

1. Launch Citadel and use the main canvas as your workspace.
2. Drag files from Windows onto the canvas to add reference material.
3. Use the left toolbar to switch between select, pan, lasso, connect, text, sticky note, swatch, tag, and comparison tools.
4. Use the right sidebar for project actions, board tools, assets, comments, presentation sequence, exports, recent projects, and keybind settings.
5. Save work as a `.citadel` project, or export a portable `.citadelz` archive when you need bundled assets.

## Core Canvas

Citadel provides an infinite canvas with pan and zoom. Items can be placed freely, selected individually or with lasso, moved, copied, pasted, duplicated, aligned, grouped, reordered, locked, and deleted.

Useful controls:

- `V` or `Escape`: Select tool
- `H` or `Space`: Pan tool
- Mouse wheel: Zoom around pointer
- `Ctrl+=` / `Ctrl+-`: Zoom in and out
- `Ctrl+0`: Reset zoom
- `Ctrl+Shift+H`: Fit board
- `Ctrl+A`: Select all
- `Escape`: Deselect

## Supported Item Types

Citadel currently supports these canvas item types:

| Type | Use |
|---|---|
| Image | Static visual reference, including common image formats and SVG |
| GIF | Animated visual reference |
| Video | Local video reference files |
| YouTube | Embedded YouTube references from a pasted URL |
| Audio | Local audio files and recorded voice memos |
| 3D model | GLB, GLTF, OBJ, and FBX reference models |
| Text | Freeform text labels and headings |
| Sticky | Notes, comments, and written observations |
| Swatch | Color palette strips |
| Comparison | A/B image comparison with a split view |

## Importing Content

Drag files directly onto the canvas. Citadel detects common formats and places items near the drop point.

Supported drag-and-drop categories:

- Images: `jpg`, `jpeg`, `png`, `webp`, `bmp`, `tiff`, `tif`, `svg`
- GIF: `gif`
- Video: `mp4`, `webm`, `mov`, `mkv`, `avi`
- Audio: `mp3`, `wav`, `ogg`, `flac`, `aac`, `m4a`
- 3D: `glb`, `gltf`, `obj`, `fbx`
- PDF: first-page preview is rendered and cached as an image item

YouTube references are added from the toolbar: click the YouTube button, paste a `youtube.com` or `youtu.be` URL, then press Enter.

Voice memos can be recorded from the toolbar. Citadel saves the captured audio as an audio item tagged `voice`.

## Boards

Projects can contain multiple boards. Boards are useful for separating concepts, scenes, characters, references, or presentation sections within one project file.

Board capabilities:

- Create a blank board
- Create template boards: Blank, Moodboard, Comparison, Storyboard
- Duplicate the current board
- Rename boards
- Delete boards, while keeping at least one board
- Switch between boards
- Assign board moods: Gothic, Ember, Verdant, Frost
- See board summaries for items, visible items, notes, presentation items, and links

Useful controls:

- `Ctrl+Shift+N`: New board
- `Ctrl+Shift+D`: Duplicate board
- `Ctrl+PageDown`: Next board
- `Ctrl+PageUp`: Previous board
- `F2`: Rename board

## Selection, Editing, and Arrangement

Selected items can be edited through toolbar actions, context actions, and property panels.

Common editing features:

- Undo and redo through the shared event log
- Copy, paste, cut, duplicate, and delete
- Lock and unlock selected items
- Bring forward, send backward, bring to front, send to back
- Group and ungroup items
- Align selected items left, right, top, bottom, horizontal center, or vertical center
- Auto-arrange selected items into a grid

Useful controls:

- `Ctrl+Z`: Undo
- `Ctrl+Shift+Z` or `Ctrl+Y`: Redo
- `Delete` or `Backspace`: Delete selected unlocked items
- `Ctrl+D`: Duplicate
- `Ctrl+C`, `Ctrl+V`, `Ctrl+X`: Copy, paste, cut
- `Ctrl+L`: Toggle lock
- `Ctrl+G`: Group
- `Ctrl+U`: Ungroup
- `Ctrl+Shift+A`: Auto-arrange selection
- `Ctrl+]` / `Ctrl+[`: Move forward or backward
- `Ctrl+Shift+]` / `Ctrl+Shift+[`: Bring to front or send to back

## Snapping and Guides

Citadel includes snap-to-grid and smart alignment guidance for arranging dense boards. Snapping uses a spatial index internally so drag behavior can stay responsive as the canvas grows.

Useful control:

- `Ctrl+Shift+G`: Toggle snap to grid

## Connections

The connect tool creates visual relationships between items. Connections can use straight, bezier, or elbow styles, with configurable color, width, arrow head, dashed state, anchors, and labels.

Use connections for:

- Reference relationships
- Moodboard reasoning
- Cause/effect diagrams
- Storyboard flow
- Concept dependency maps

Useful control:

- `C`: Connect tool

## Notes and Comments

Citadel supports sticky notes and comment pins. Sticky notes can be used as ordinary board content, while comment pins can be toggled for review-oriented workflows and optionally included in exports.

Useful controls:

- `N`: Sticky note tool
- `Ctrl+Shift+M`: Add comment pin
- Right sidebar: Show or hide notes
- Export settings: Include or exclude comment pins

## Tags and Search

Items can carry tags, and the tag/search panel helps locate relevant material across busy boards. Search highlighting makes it easier to jump back to a specific item after finding it.

Useful controls:

- `G`: Tag tool
- `Ctrl+F`: Search panel

## Asset Library

The asset library summarizes imported assets used across boards. It can show where an asset first appears and place another copy of the same asset onto the active board.

Use it to:

- Reuse reference images and media
- Find duplicate or recurring assets
- Jump to the first use of an asset
- Place another copy without searching your filesystem again

## Comparison Workflow

Comparison items are built for A/B image review. You can create a blank comparison item from the toolbar, drop images onto either side of an existing comparison item, or select two image-like items and merge them into a comparison.

Use comparison items for:

- Before/after review
- Style exploration
- Material or color tests
- Design alternative decisions

## Presentation Mode and Sequence

Presentation mode lets you step through ordered items and boards as a walkthrough. Storyboard templates can include presentation order metadata, and the sequence panel helps manage presentation flow.

Useful controls:

- `F5`: Toggle presentation mode
- `ArrowRight` or `PageDown`: Next presentation item
- `ArrowLeft` or `PageUp`: Previous presentation item
- `Escape`: Exit presentation mode

## Recording

Citadel records canvas events using the same event log that powers undo and redo. A recording session can capture the sequence of actions during a walkthrough or review.

Useful control:

- `Ctrl+R`: Start or stop recording

## Saving and Project Files

Citadel uses two project formats:

- `.citadel`: JSON project file with asset paths stored relative to the project file where possible
- `.citadelz`: zip archive containing the project and bundled assets under `assets/`

Reliability features:

- Manual save and Save As
- Recent projects list
- Unsaved-change guard before replacing the current project
- Recovery snapshots for dirty projects
- Recovery prompt after an unsaved session is detected
- Dirty-aware autosave, so clean projects do not perform unnecessary recovery writes

Useful controls:

- `Ctrl+S`: Save
- `Ctrl+Shift+S`: Save As
- `Ctrl+O`: Open
- `Ctrl+N`: New project

## Exporting

Citadel can export the current work in several ways:

- PDF export
- Image export: PNG by default, with support for image formats used by the export pipeline
- `.citadelz` archive export for portable bundled projects

Export settings:

- Area: viewport, selection, or full board
- Scale: 1x, 2x, or 3x
- Presets: Draft, Clean, High-res
- Include or exclude comment pins
- Preview before exporting

The export pipeline temporarily fits the board or selection when needed, captures the canvas, and then restores the user's viewport.

## Appearance and Accessibility Settings

Citadel includes appearance and UI comfort settings:

- Dark and light theme toggle
- Canvas background: built-in stone, custom image, or none
- Background opacity, scale, and repeat controls
- UI scale from 75% to 150%
- Optional visual flourishes such as the save banner, HyperType mode, and themed cursor

## Maintenance Tools

The settings panel includes maintenance tools for project health:

- PDF preview cache stats
- Clear unused PDF previews
- Local asset health check
- Relink missing local assets by choosing a folder to scan

These tools help keep large projects portable and reduce stale cached data.

## Plugin Surface

Citadel has an early plugin API surface. Plugins can:

- Register custom item types
- Listen to canvas events
- Trigger mascot effects

This is intended for future extension without changing the core app.

## Mascot Feedback

The Citadel mascot reacts to important app events:

- Import/open: lightning-in
- Export: lightning-out
- Save: rune-seal
- Autosave: base-pulse
- Undo/redo: rewind and forward effects
- Delete: crumble
- Recording: eye-open and eye-close
- Playback/presentation: lighthouse-beam
- Errors: fracture

The mascot is feedback, not the source of app behavior. Features trigger mascot effects through the mascot store.

## Suggested Workflow

For a visual research board:

1. Create a new project.
2. Drag in images, GIFs, videos, PDFs, audio, or 3D models.
3. Use boards to separate themes or scenes.
4. Add sticky notes, tags, swatches, and connections as your thinking develops.
5. Use comparison items for direct A/B decisions.
6. Use the asset library to reuse important references.
7. Use presentation mode when walking someone through the work.
8. Export a board, selection, or viewport when you need to share.
9. Save as `.citadel` for normal work, or `.citadelz` when moving the project between machines.

## Current Default Shortcuts

| Action | Shortcut |
|---|---|
| Select | `V`, `Escape` |
| Pan | `H`, `Space` |
| Connect | `C` |
| Lasso | `L` |
| Text | `T` |
| Sticky | `N` |
| Link | `K` |
| Tag | `G` |
| Swatch | `W` |
| Undo | `Ctrl+Z` |
| Redo | `Ctrl+Shift+Z`, `Ctrl+Y` |
| Save | `Ctrl+S` |
| Save As | `Ctrl+Shift+S` |
| Open | `Ctrl+O` |
| New Project | `Ctrl+N` |
| Duplicate | `Ctrl+D` |
| Lock | `Ctrl+L` |
| Group | `Ctrl+G` |
| Ungroup | `Ctrl+U` |
| Search | `Ctrl+F` |
| Record | `Ctrl+R` |
| Presentation | `F5` |
| Auto-arrange | `Ctrl+Shift+A` |
| Toggle snap | `Ctrl+Shift+G` |
