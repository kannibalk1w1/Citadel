# Arcane Canvas Effects Design

## Goal

Rework Citadel's weakest visual layer: the current tower-centered mascot animations, generic toolbar icons, and too-clean canvas floor. The new direction is grounded occult materiality: effects emanate from the source on the canvas, leak through broken cobblestones, and fade back into the dark.

This pass is visual and architectural. It should preserve existing feature behavior, keyboard actions, undo/redo semantics, file IPC boundaries, and the current shell layout.

## Design Read

Citadel should feel like an atmospheric archive built on an old ritual floor. UI feedback should not look like floating web particles or mascot fireworks. It should look like a small breach in the surface of the canvas: flame, spark, ash, fracture, and rune-light briefly entering the visible world.

## Scope

In scope:
- Replace mascot-first transient animations with canvas-origin effects.
- Keep the tower as a subtle witness, not the source of most motion.
- Rework the default canvas background into a darker, broken cobblestone field.
- Replace uneven toolbar glyphs with a consistent local toolmark icon system.
- Preserve reduced-motion support.
- Add tests around effect mapping, spawn fallback, and icon registry coverage where practical.

Out of scope:
- New app features or action names.
- New file format fields.
- Replacing the Citadel tower image itself.
- Complex physics simulation.
- Importing a generic icon library for this pass.

## Effect Model

Add a renderer-side canvas effect layer that sits above the canvas background and below relic items, with optional overlays above items for target-specific actions if needed later.

Effects should spawn from a canvas/event source:
- Prefer the affected relic center or edge when there is an obvious target.
- Otherwise use the last known canvas pointer coordinate.
- If no pointer exists, fall back to the visible canvas center, excluding the archive rail.

Effects are short-lived and grounded. They should crawl laterally through stone seams, flicker from cracks, cast a small glow, then fade. The default lifetime should be roughly 700-1400ms depending on effect.

### Effect Mapping

- Save: cold blue arcane flame, clean and low, briefly licking across cracks.
- Autosave: dim blue pressure pulse under stones, almost subconscious.
- Delete: red flame and black ash collapse at the source.
- Import/open: yellow spark impact, followed by a few grounded ember skips.
- Export: pale blue-white ignition flowing outward, stronger than save.
- Undo: grey-blue reverse ember trail pulling back into a crack.
- Redo: forward ember surge, sharper and faster.
- Error/crash recovery: deep red fracture glow, ugly and short.
- Recording: persistent dark red floor-eye or under-stone glow near the current working area.
- Plugin loaded/comment/banner events: small grey-white sigil flare, restrained.

Existing mascot effect names may remain as compatibility events, but the presentation should route most transient action feedback to the canvas effect layer.

## Canvas Background

Replace the current neat tile with a procedural broken cobblestone field:
- Larger irregular slabs.
- Dark mortar channels.
- Chipped edges and missing corners.
- Hairline cracks with occasional brighter cold-edge highlights.
- Low contrast overall so relics remain visually dominant.
- Snap-to-grid may slightly raise mortar visibility, but must not look like a modern grid.

The background should remain procedural SVG/CSS for the first implementation. This avoids a new asset pipeline, keeps settings compatible, and lets the effect layer visually coordinate with crack directions later.

The background should continue to respect:
- `canvasBackground.mode`
- `canvasBackground.opacity`
- `canvasBackground.scale`
- `canvasBackground.repeat`
- viewport pan/zoom positioning

## Toolmark Icon System

Replace the current mixed icon style with a local `ToolIcon` registry. Icons should be monochrome, small, sharp, and ritual-tool-like, using `currentColor`.

Rules:
- One consistent `viewBox`.
- One stroke width system.
- Round or bevel caps must be consistent.
- No huge filled third-party paths.
- No decorative detail that disappears at 18px.
- Each icon must have a title/label at the button level as today.

Initial toolmarks:
- Select: chisel or point marker.
- Pan: stone hand or four-way drag mark.
- Lasso: looped cord or sigil ring.
- Bind/connect: hooked chain link or thread-knot.
- Text/inscription: incising stylus.
- Sticky/scroll: folded parchment slab.
- Link: clasp or rivet.
- Swatch: pigment stones.
- Tag/sigil: carved rune tab.
- Compare: split viewing frame.
- Record: dark eye or seal.
- Voice: narrow standing stone/mic hybrid.
- Present: beacon aperture.
- YouTube/media: framed moving-image glyph that still fits the same stroke language.
- Snap/grid: carved alignment marks, not a modern grid icon.
- Auto-arrange: ordering stones, not generic layout squares.
- Theme: eclipse or lens, not sun/moon default.

## Architecture

Suggested units:

1. `canvas/effects/canvasEffectModel.ts`
   - Defines effect kinds, colors, lifetimes, and spawn selection helpers.
   - Maps existing action/effect names to visual breach types.

2. `canvas/effects/CanvasEffectLayer.tsx`
   - Renders active effects in screen space above `CanvasBackground`.
   - Consumes an effect queue from a small store or from the existing mascot store adapted through a compatibility bridge.
   - Clears completed effects without requiring React state churn on every animation frame.

3. `canvas/CanvasBackground.tsx`
   - Replaces the tile generator with a broken cobblestone generator.
   - Keeps the existing public behavior and settings.

4. `ui/icons/ToolIcon.tsx`
   - Provides the new local icon registry.
   - Replaces `GothicIcon` usage in toolbar and related controls.

The cleanest implementation is to create a dedicated `canvasEffectStore` and have existing action handlers trigger canvas effects directly. The lower-risk implementation is to bridge from `mascotStore.triggerEffect` first, then migrate callers later. For the first build, prefer the lower-risk bridge unless it makes source positioning impossible.

## Reduced Motion

When `prefers-reduced-motion` is active:
- No crawling flame, sparks, or animated ash.
- Show a single brief brightness/glow pulse at the source.
- Persistent recording state may show a static dim red under-stone mark.
- Existing mascot reduced-motion behavior should remain valid.

## Testing

Add focused Vitest coverage for:
- Effect name to breach type mapping.
- Spawn fallback priority: target point, last pointer, visible center.
- Reduced-motion mapping.
- Tool icon registry includes every toolbar action icon currently rendered.
- Background generator returns deterministic output for snap on/off and scale-independent tile assumptions where practical.

Manual visual QA later:
- Save/delete/import/export effect locations.
- Presentation mode does not show stray UI effects.
- Effects do not cover or obscure selected relics for too long.
- Canvas remains readable at low zoom and high zoom.
- Reduced motion disables visceral animation.

## Success Criteria

The pass is successful when:
- Most action feedback appears to emerge from the canvas source and fade out there.
- The Citadel tower no longer feels like the main animation surface.
- The floor reads as broken cobblestone instead of clean repeating wallpaper.
- Toolbar icons look like one authored set.
- Automated tests and production build pass.
