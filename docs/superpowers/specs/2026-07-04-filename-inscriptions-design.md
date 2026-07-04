# Filename Inscriptions Design

Status: approved direction via 2026-07-04 feature scouting (queue item 4); built same session.

## Problem

Ref Flow can show every media item's filename under it with one toggle; Citadel only reveals a filename when an asset goes missing. When curating large reference boards, seeing source filenames at a glance matters.

## Goals

- A global toggle (`view:filenameLabels`, default off, `shift+f`) rendering the source basename as a small inscription under media relics.
- Konva label for image/GIF relics; DOM label inside the shared `DOMItem` wrapper for video/YouTube/audio/3D.
- Far-zoom discipline: labels hide below the same 5px screen-font threshold as text silhouettes (`TEXT_SILHOUETTE_MIN_SCREEN_FONT_PX`).
- Toggle button in the sidebar Mark section; inscription toast on toggle.

## Non-Goals

- No per-relic label overrides; no label editing (that's what inscriptions/sticky notes are for).
- No labels for text/sticky/swatch/comparison relics (no meaningful source file).
- No persistence to settings in this pass (session toggle, like comment pin visibility).

## Approach

- `src/renderer/assets/filenameLabel.ts` (+test): `filenameInscription(src, visible, viewportScale)` → basename string or null (null when hidden, no src, or `FILENAME_LABEL_FONT_PX * scale < TEXT_SILHOUETTE_MIN_SCREEN_FONT_PX`).
- `uiStore.filenameLabelsVisible` + toggle (mirrors `commentPinsVisible`).
- `ImageItem`/`GifItem`: Konva `Text` under the relic (y = height + 4, mono font, `#8a7a5c` — the tone already used for missing-relic labels), `listening={false}`.
- `DOMItem`: small absolutely-positioned label div below the frame using the same tokens.
- Action + keybind + Mark-section button; toast "Filenames revealed" / "Filenames veiled".
