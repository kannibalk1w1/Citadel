# Atmospheric Chambers Design

Status: **draft — awaiting user approval. Do not implement until approved.**

## Problem

Chambers currently have almost no individual identity. `board.meta.mood` and `board.meta.accent` exist (`src/renderer/ui/boardMood.ts`) but only tint the chamber tab. The canvas floor texture is a single global `uiStore.canvasBackground` setting shared by every chamber, and there is no ambient life in a chamber at all — the only motion is transient action feedback from the canvas effect layer.

Roadmap Phase 5 asks for: board moods evolving into chamber identity, optional chamber ambience, lighting and texture controls, and chamber-specific sigil palettes — all within the dark fantasy theme and without violating the performance discipline built in Phases 1–3.

## Goals

- A chamber owns its identity: mood preset, accent, floor texture, lighting, and optional ambience, persisted in the project file.
- A small set of curated mood presets that stay inside the dark fantasy palette; each preset defines the chamber's sigil accent used by tabs, index marks, and binding highlights.
- Optional, subtle ambience (drifting motes / low fog) that costs a fixed, tiny amount regardless of chamber size.
- Lighting controls limited to two dials: vignette strength and accent glow strength.
- Per-chamber floor texture override on top of the existing global background setting.
- Chamber identity edits are undoable and recordable like any other canvas mutation.

## Non-Goals

- No audio ambience (out of scope for this pass; "ambience" here is visual only).
- No per-relic atmospheric treatment, no ambience that reacts to relic content.
- No new persistent SVG ornamentation on the Konva layers.
- No free-form user colour pickers beyond the existing accent override — presets carry the palette.
- No changes to save-format asset path rules or new required project fields (old projects must load unchanged).

## Proposed Approach

### 1. Chamber identity model — `src/renderer/canvas/chamberIdentity.ts`

A pure, tested module that reads and normalizes identity from `board.meta` (all fields optional, defaults preserve today's look):

```ts
type ChamberMoodId = 'gothic' | 'ashen' | 'umbral' | 'verdigris' | 'sanguine' | 'aurum'

type ChamberIdentity = {
  mood: ChamberMoodId            // default 'gothic' (current look)
  accent: string                 // preset accent unless meta.accent overrides
  ambience: 'none' | 'motes' | 'fog'   // default 'none'
  ambienceIntensity: number      // 0..1, default 0.5
  vignette: number               // 0..1, default 0 (off)
  glow: number                   // 0..1, default 0 (off)
  texture?: { assetPath: string; opacity: number; scale: number; repeat: boolean }
}
```

Stored flat in `board.meta` (`meta.mood`, `meta.accent`, `meta.ambience`, …). `boardMoodAccent`/`boardMoodId` become thin wrappers over this module so `BoardTabs` keeps working. Each mood preset supplies accent plus two derived tones (dim, glow) exposed as CSS variables (`--chamber-accent`, `--chamber-accent-dim`, `--chamber-accent-glow`) scoped on the canvas container element — components keep using CSS variables, never hardcoded colours.

### 2. Per-chamber texture — extend `CanvasBackground`

`CanvasBackground` resolves texture as: chamber `texture` override → global `uiStore.canvasBackground` → default arcane tile. Same rendering path as today (one repeating-background div), so the cost profile is unchanged. Texture assets go through the existing custom-background asset path (relative paths, never base64).

### 3. Ambience layer — `src/renderer/canvas/ChamberAmbience.tsx`

One absolutely-positioned DOM div above the background and below the Konva stage, `pointer-events: none`, containing a fixed particle budget (≤ 14 motes or 2 fog gradient bands) animated with pure CSS keyframes. Key properties:

- Cost is constant regardless of relic count — it never touches items, the spatial index, or viewport slices, so it cannot wake dormant media.
- `prefers-reduced-motion`: ambience renders as a single static gradient wash at the same intensity, no animation (matching the canvas effect layer's reduced discipline).
- Vignette and glow are two more static divs with radial gradients driven by the two dials — no animation, no Konva involvement.
- DOM/CSS only — this does not add SVG ornamentation, but per roadmap queue discipline the ambience layer still gets a large-chamber fixture profile check (Chamber Load + pan responsiveness with ambience on) before merge.

### 4. Controls — "Chamber Rite" section in the board navigator / right sidebar

Mood preset row (six swatches), ambience select + intensity slider, vignette and glow sliders, texture override picker reusing the existing background picker UI. All labels archival: Chamber, Mood, Ambience, Rite — no generic "settings" language.

### 5. Undo/recording + feedback

Identity edits dispatch a new `BOARD_STYLE` `CanvasEvent` (before/after = the changed meta subset) through `historyStore`, so undo/redo and recording work unchanged. Applying a mood triggers `mascotStore.triggerEffect('rune-seal')` — reusing an existing effect; no new mascot effect names.

## Alternatives Considered

- **Konva-rendered ambience particles** — rejected: puts per-frame work on the canvas layer that scales with redraws, and risks entangling ambience with item rendering; a fixed DOM/CSS layer is strictly cheaper and cannot violate the visibility discipline.
- **Full theme switch per chamber (swap all CSS variables)** — rejected: chambers should feel like rooms in one citadel, not different apps; scoping three accent variables keeps UI chrome stable.
- **Free-form colour pickers for chamber palettes** — rejected for this pass: presets protect the dark fantasy theme; `meta.accent` already exists as the escape hatch.
- **Ambient audio** — deferred: separate concern with its own controls, asset, and autoplay questions.

## Data / Type Changes

- New optional fields inside `board.meta` only (already `Record<string, unknown>`): no `ProjectFile` schema version bump; `projectSchema` validation gains tolerant checks for the new fields.
- New `CanvasEvent` type string: `BOARD_STYLE`.
- No IPC changes; texture override reuses existing asset/browse channels.

## Honouring Global Constraints

- Colours come from mood presets exposed as CSS variables; effect palette untouched.
- Reduced motion: static gradient fallback for every animated ambience element.
- No fs from renderer; textures go through existing IPC paths.
- Undo/recording via the shared event log (`BOARD_STYLE`).
- Ambience never mounts, wakes, or queries media items; fixed particle budget; profile check against the 1,003-relic fixture before merge.
- Archival product language throughout.

## Verification Plan

- Unit tests: identity normalization/defaults, preset palette table, `BOARD_STYLE` undo round-trip, reduced-motion resolution.
- Fixture profile: Chamber Load and pan responsiveness with ambience `motes` at full intensity on the large-chamber fixture, recorded as a profile doc.
- App check over CDP: switch moods across two chambers, confirm tab accents, per-chamber texture, ambience on/off, undo of a mood change.
