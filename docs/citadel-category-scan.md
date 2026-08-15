# Category Scan — What the Neighbours Have That We Don't

A wider sweep than [Citadel vs Ref Flow](./citadel-vs-refflow.md): the reference
board and visual library tools an artist would compare Citadel against, and the
features of theirs that would actually change someone's mind.

Reviewed 2026-08-15. Competitor claims come from vendor pages, listed at the
bottom; they were not verified by running the applications. Citadel claims were
verified against the source at `a1acaa5`.

---

## The one that matters

### Window modes — always on top, opacity, click-through

PureRef's feature list leads with six of them: *"Always on top"*, *"Always on top
of…"*, *"Always on bottom"*, *"Lock window"*, *"Transparent to mouse"*, and
*"Overlay mode"*. This is the reason PureRef is on nearly every professional
artist's second monitor — or rather, the reason it does not need a second
monitor. References float above Photoshop, Blender or ZBrush at reduced opacity,
and clicks pass straight through to the app underneath.

**Citadel has none of it.** No `setAlwaysOnTop`, no `setOpacity`, no
`setIgnoreMouseEvents`, no global shortcut, no tray. Citadel is a window you
switch to; PureRef is a window you work *through*.

For a tool aimed at people drawing and modelling, this is the largest single
feature gap in this document — larger than anything in the Ref Flow comparison.
It is also unusually cheap: all three capabilities are one Electron main-process
call each, and the app already has an IPC bridge, an action registry, and a
keybind system to hang them on. The design work is the interface for it, not the
mechanism.

---

## Worth having

### Grayscale toggle

PureRef lists *"Grayscale"* as a first-class canvas feature. Artists use it
constantly for value checking — flattening colour to see whether a composition
reads. Citadel supports per-item `tint` but has no desaturate.

A CSS `filter: grayscale(1)` on the item layer would cover most of it; doing it
properly per item, and for Konva items as well as DOM ones, is the real cost.

### Colour picking from an image

PureRef has *"Show color code"*. RefCanvas ships an eyedropper. Citadel has a
swatch item type — a way to *store* colours — with no way to pick one off a
reference image. The feature is half-built: the container exists, the act of
filling it does not.

### Canvas drawing

PureRef lists *"Drawing"* as a canvas feature. Citadel's pen is deliberately
presentation-only and its strokes are ephemeral — that was an explicit decision
in `2026-07-04-presentation-quill-design.md`, on the grounds that a persistent
annotation layer affects the save format and deserves its own design.

That reasoning still holds. Worth noting only because a buyer comparing feature
lists will not see the distinction.

### Duplicate detection

Eagle detects and merges identical files, including their tags and notes.
Citadel tracks asset health and missing files but never asks whether two relics
are the same image. For an archive that grows by folder import — which
`ArchiveWorkbench` encourages — duplicates accumulate silently.

### Colour search

Eagle indexes colours and lets you filter a library by them. Citadel's Index
searches filenames, tags, notes, connection labels and metadata, but not colour.
Given swatches already exist as a concept, colour is the obvious next axis.

---

## Deliberately not chasing

- **Browser extension / web clipper.** Eagle, Milanote and Reference Board all
  ship one. It is the single most common way references enter a library — but it
  is a second product with its own store review and update cycle, and Citadel is
  a local-first desktop app with no account system. Out of scope for early
  access; revisit if the desktop app finds an audience.
- **Cloud sync and collaboration.** Milanote's core. Directly against Citadel's
  local-only, no-account, no-telemetry position, which is also Ref Flow's.
- **Mobile and tablet.** RefCanvas and Reference Board are on iPad and Android.
  Citadel is Electron desktop; this would be a rewrite.
- **AI/MCP indexing.** Reference Board advertises AI-powered image indexing and
  MCP client support. Interesting, not a reason anyone buys a reference board
  today.

---

## Where Citadel already leads the category

Worth knowing, because these are the things a store listing should lead with:

- **Multiple boards** in one project, each with its own appearance.
- **Typed connections** — meaning, label, style, arrowhead — where the category
  offers plain lines if anything. Ref Flow advertises "drag to create connection
  lines"; PureRef offers groups and hierarchy but not relationships.
- **The Index** — one search across items, notes, tags, connections and boards,
  with a sortable table view. Eagle is the only tool here with comparable search,
  and it is a library manager rather than a canvas.
- **Session recording and playback** — nothing in the category does this.
- **3D models, PDFs and audio** as first-class canvas items.
- **`.citadelz` archives** — portable, asset-bundled projects.
- **Crash recovery**, themes with custom palettes, item templates, bookmarks.

---

## Suggested order

1. **Always on top, opacity, click-through.** The category's defining workflow
   feature, absent here, and cheap in Electron. Nothing else on this list moves
   the needle as far.
2. **Grayscale toggle.** Small, and artists use it daily.
3. **Eyedropper into a swatch.** Completes a feature that is currently half
   present.
4. **Duplicate detection** on folder import, where duplicates actually enter.
5. **Colour as an Index axis.**

---

## Sources

- [PureRef features handbook](https://www.pureref.com/handbook/features/)
- [Ref Flow](https://hp651106.itch.io/ref-flow) ·
  [Ref Flow V1.0](https://hp651106.itch.io/ref-flow-v10)
- [Eagle](https://en.eagle.cool/) ·
  [Eagle duplicate scanning](https://en.eagle.cool/blog/post/no-more-duplicate-images-eagles-scanning-for-identical-files-frees-up-your-hard-drive)
- [Refbox](https://ref.box/) · [RefCanvas](https://play.google.com/store/apps/details?id=com.Endvoid.RefCanvas) ·
  [Reference Board](https://www.referenceboard.app/)
