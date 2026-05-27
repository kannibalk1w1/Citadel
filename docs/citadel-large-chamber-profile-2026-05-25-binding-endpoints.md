# Citadel Large-Chamber Profile - Binding Endpoints - 2026-05-25

## Purpose

This note captures the second large-chamber profile after visible Binding endpoint sigils were added.

The goal is to verify that Citadel can make Binding feel more ritualistic without waking dormant offscreen thread fields or undermining the viewport strategy.

## Fixture

This profile uses the same chamber assumptions as `docs/citadel-large-chamber-profile-2026-05-25.md`:

- `createLargeBoardFixture({ itemCount: 1000, columns: 50 })`
- viewport: `{ x: 0, y: 0, scale: 1 }`
- screen: `540 x 280`
- overscan: `240px`
- protected selected relics where relevant

The Binding overlay scenario adds four threads:

- one visible thread with a visible endpoint
- one dormant offscreen thread
- one active offscreen thread
- one pulsing offscreen thread

## Chamber Load Comparison

The endpoint sigil work does not change relic mounting.

| Metric | Baseline | After Endpoint Sigils | Change |
|---|---:|---:|---:|
| Total relics | 1003 | 1003 | 0 |
| Mounted relics | 23 | 23 | 0 |
| Awake DOM media | 2 | 2 | 0 |
| Sleeping animated relics | 1 | 1 | 0 |

## Binding Overlay Load

Measured with `measureBindingOverlayLoad`, which composes the same viewport visibility and overlay visibility models used by the renderer.

| Metric | Count | Meaning |
|---|---:|---|
| Rendered connections | 3 | visible thread, active offscreen thread, pulsing offscreen thread |
| Active or pulsing Bindings | 2 | threads allowed to draw endpoint sigils |
| Endpoint sigil marks | 4 | two endpoint marks for each active/pulsing Binding |

Interpretation:

- The dormant offscreen thread remains asleep.
- Endpoint sigils only appear on active or newly pulsing Bindings.
- The richer Binding treatment adds ornamentation to meaningful thread context without expanding the rendered relic set.
- The next risk is not the endpoint sigil itself; it is cumulative atmospheric overlays if future effects are allowed to ignore the same visibility rules.

## Decision

Keep the endpoint sigil direction.

The next high-value step is to make the Binding interaction feel more deliberate at creation time: a short thread-binding reveal that travels along the visible line, then resolves into the endpoint sigils. It should use the same active/pulsing visibility path and respect reduced motion.

Recommended next step: add a short Binding reveal animation for newly created visible threads, then capture a third profile only if it introduces new persistent SVG elements or timers.

## Follow-Up Status

The Binding reveal animation has since landed through the existing `bindingPulse` path, with reduced-motion support and centralized Binding creation via `handleConnectRelicClick`.

The third profile is captured in `docs/citadel-large-chamber-profile-2026-05-27-binding-reveal.md`.

Current next step: continue Living Index sigil mark work, keeping search marks capped and visibility-aware before adding richer persistent ornamentation.
