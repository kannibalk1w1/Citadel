# Citadel vs Ref Flow — Build and Polish Gap

Where the current Citadel build stands against the tool it is a spiritual clone
of, as a *shipping product* rather than a feature list.

Reviewed 2026-08-15 against Ref Flow's own store pages
([ref-flow](https://hp651106.itch.io/ref-flow),
[ref-flow-v10](https://hp651106.itch.io/ref-flow-v10)). Ref Flow claims here are
taken from those pages; they were not verified by running the application. Every
Citadel claim was verified against the source at commit `3bcbe31`.

---

## Verdict

**Citadel is not behind on capability. It is behind on consistency, reach, and
weight.**

On features, Citadel matches Ref Flow's advertised list almost item for item and
goes past it in several places. The gaps that would cost a sale are narrower and
less flattering: the smart guides do not measure anything, the app speaks one
language against Ref Flow's six, and Ref Flow's $29 lifetime price sets a ceiling
Citadel must be visibly worth clearing.

The worst of them — media items that could not be moved at all, and did not snap
when they could — was found and closed during this review (items 1 below).

---

## Where we are behind

### 1. Snapping is dead on video, YouTube, audio, and 3D — the Pro media types

Ref Flow's headline is "Smart Magnetic Alignment", and its Pro tier is built
around the "Media Engine (Video, Image, Audio support)". A buyer will drag a
video onto the canvas and expect it to dock like an image.

In Citadel it does not. `snapItem` is called from six item types —
`ImageItem`, `GifItem`, `TextItem`, `StickyItem`, `SwatchItem`,
`ComparisonItem` — and `DOMItem.handlePointerMove`
(`src/renderer/canvas/items/DOMItem.tsx:92`) writes raw `x`/`y` with no snap and
no guides. `DOMItem` is what renders **video, YouTube, audio, and 3D**.

So the feature works on precisely the item types Ref Flow gives away free, and
fails on precisely the ones it charges for. It is invisible in tests because the
snap tests exercise `snapEngine` directly, not the DOM drag path.

**Fixed 2026-08-15** (`277a243`). `DOMItem` now mirrors the Konva contract —
spatial index rebuilt on pointer down, snap on move with `Ctrl` inverting the
setting mid-drag, guides cleared on pointer up or cancel. `DOMItem.test.tsx` is
the first coverage of that drag path.

**But it uncovered a larger gap underneath it.** Only `Model3DItem` passes
`editableFrame` to `DOMItem`, and the Konva proxy rects for video, YouTube and
audio are `opacity={0}` with an `onClick` for selection and no `draggable`. So
those three item types have **no interactive move affordance at all** — they can
be selected, and repositioned only by auto-arrange or the align actions. The
snapping fix makes dragging correct wherever it is reachable; for video, YouTube
and audio it is not yet reachable.

**Also fixed 2026-08-15** (`2c1f7c5`), with a title bar. Passing `editableFrame`
alone would have regressed playback — the move overlay covered the whole item
(`inset: 0`) and would have swallowed clicks on the native `<video>`/`<audio>`
transport, the YouTube `<webview>`, and `VideoItem`'s own capture buttons at
`top: 6`. Instead the type badge above a selected item grows into a title bar and
becomes the drag target. It sits outside the frame, so it covers no content, and
all four DOM-layer types now share one affordance — the full-surface overlay is
gone from 3D with it.

Both halves are now closed: media items can be moved, and they snap when moved.

### 2. Smart guides do not show distances

Ref Flow: *"Figma-style Smart Guides: Distance indicators appear only when you
need them."*

Citadel draws a guide line and labels it `0 px`, but only for the gapless-dock
case (`snapEngine.ts:40`, `isGaplessDock`). Any non-zero relationship gets an
unlabelled line, and there is no equal-spacing or distribution guide at all —
the thing that makes Figma-style alignment feel precise rather than magnetic.

Everything needed is present: the guide already carries an optional `label`,
`labelX`, `labelY`. What is missing is measuring the gap and rendering it.

### 3. One language against six

Ref Flow ships English, Traditional Chinese, Simplified Chinese, Japanese,
Korean, and Spanish. Citadel is English-only, with no i18n framework and roughly
150 hardcoded UI strings.

This is a market-reach gap, not a quality one — but for a reference tool aimed at
artists, the Chinese, Japanese, and Korean markets are not a rounding error.

**Timing note:** every one of those strings was just rewritten for the vocabulary
pass, and their locations are known. Extracting them into a message catalogue is
cheaper now than it will ever be again.

### 4. Weight and cold start

Ref Flow is portable, needs no installation, and is marketed as "lightweight,
fast". Citadel is Electron. Its portable `.exe` will be roughly an order of
magnitude larger and slower to first paint, and that difference is visible in the
first thirty seconds of a trial.

Not measurable in this workspace — the Electron binary is not downloaded here, so
the packaged size is unverified. **Measure it on the first CI build** and decide
whether it needs to be addressed in the store listing rather than in code.

### 5. Shortcut ergonomics

Ref Flow uses single keys for the canvas verbs: `S` snap, `F` focus all, `G`
group, `Ctrl+D` duplicate, `Ctrl+drag` for precision.

| | Ref Flow | Citadel |
|---|---|---|
| Snap toggle | `S` | `Ctrl+Shift+G` |
| Fit / focus all | `F` | `Ctrl+Shift+H` |
| Group | `G` | `Ctrl+G` |
| Duplicate | `Ctrl+D` | `Ctrl+D` |
| Precision override | `Ctrl+drag` | `Ctrl+drag` |

Two of the five most-used canvas verbs are chords in Citadel where Ref Flow needs
one key. Citadel already reserves single keys for tools (`V`, `H`, `L`, `C`, `T`,
`N`) so the convention is established; snap and fit simply did not get one.
Keybinds are user-overridable, so this is a defaults question, not an
architecture one.

### 6. No free tier, and a hard price anchor

Ref Flow: a free V1.0, and $29 for a lifetime Pro licence with free updates.

Citadel currently has no trial, no free tier, and no stated price. **$29 lifetime
for a polished, shipping, six-language tool is the number a prospective buyer
will have in mind.** Citadel's answer has to be either a clearly lower price or a
clearly larger product — and today the differences that justify "larger" (boards,
the index, recording) are the ones a buyer cannot see before paying.

This is the commercial half of item 5 in the
[release-candidate checklist](./release-candidate-checklist.md): the sample
archive is what makes the extra surface visible in the first minute.

### 7. First-run friction

Ref Flow's pitch is "zero friction" and no installation. Citadel's first run is
an empty canvas after an NSIS install that SmartScreen currently warns about.
Both halves of that are already tracked — checklist items 2 and 5 — but they read
differently once you know what the comparison is.

---

## Where we match

Verified present in Citadel, and advertised by Ref Flow:

- **Gapless docking** — `isGaplessDock`, edge-to-edge, labelled `0 px`.
- **Snap toggle and `Ctrl` precision override** — `invertSnap` on every Konva
  drag handler.
- **Auto-arrange into a grid** — `arrange:autoGrid`.
- **Connection lines between items** — and Citadel's carry typed meanings,
  labels, styles, and arrowheads. Ref Flow advertises "drag to create connection
  lines"; how rich its version is could not be verified.
- **Copy image to clipboard** — context menu.
- **Video frame capture to clipboard** — `VideoItem.copyFrame` / `captureFrame`.
- **Image comparison slider** — `ComparisonItem`.
- **Voice memo** — toolbar recorder.
- **Presentation mode and minimap** — plus a presenter pen Ref Flow also has.
- **High-resolution export** — export scale setting.
- **Local-only storage** — no cloud, no account, no telemetry.

## Where we are ahead

Nothing on Ref Flow's pages corresponds to these:

- **Multiple boards** in one project, with per-board appearance.
- **The Index** — cross-board search over items, notes, tags, connections, with
  a sortable table view.
- **Tags** as a first-class searchable dimension.
- **Session recording and playback**, sharing the undo event log.
- **3D models and PDFs** as canvas items.
- **PDF and `.citadelz` archive export**, not just image export.
- **Themes**, including user-defined palettes.
- **Crash recovery** of unsaved work.
- **Item templates, bookmarks, comment pins, waymarks on images.**
- **A plugin registry.**

The strategic risk is not that Citadel lacks substance. It is that all of the
substance sits behind a first run that shows none of it.

---

## Suggested order

1. ~~Route `DOMItem` drags through the snap engine.~~ Done, `277a243`.
2. ~~Give video, YouTube and audio a move affordance.~~ Done, `2c1f7c5`.
3. **Measure and label non-zero gaps** in the snap guides.
4. **Give snap and fit single-key defaults.**
5. **Measure the packaged size** on the first CI build; decide listing vs code.
6. **Extract UI strings into a catalogue** while their locations are still fresh,
   even if no translation is commissioned yet.
7. **Settle the price against $29**, with the sample archive doing the work of
   showing what the extra surface buys.
