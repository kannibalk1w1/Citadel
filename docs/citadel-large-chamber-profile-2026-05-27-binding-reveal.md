# Citadel Large-Chamber Profile - Binding Reveal - 2026-05-27

## Purpose

This note captures the third large-chamber profile after the Binding reveal animation landed.

The goal is to verify that newly created visible threads can feel more deliberate without adding persistent SVG ornamentation, waking dormant offscreen threads, or weakening the reduced-motion path.

## Fixture

This profile uses the same chamber assumptions as the baseline and Binding endpoint profiles:

- `createLargeBoardFixture({ itemCount: 1000, columns: 50 })`
- viewport: `{ x: 0, y: 0, scale: 1 }`
- screen: `540 x 280`
- overscan: `240px`
- protected selected relics where relevant

The Binding overlay scenario keeps the same four-thread setup:

- one visible thread with a visible endpoint
- one dormant offscreen thread
- one active offscreen thread
- one pulsing offscreen thread

## Chamber Load Comparison

The Binding reveal work does not change relic mounting.

| Metric | Baseline | Endpoint Sigils | Binding Reveal | Change From Endpoints |
|---|---:|---:|---:|---:|
| Total relics | 1003 | 1003 | 1003 | 0 |
| Mounted relics | 23 | 23 | 23 | 0 |
| Awake DOM media | 2 | 2 | 2 | 0 |
| Sleeping animated relics | 1 | 1 | 1 | 0 |

## Binding Overlay Load

Measured with `measureBindingOverlayLoad`, which composes the same viewport visibility and overlay visibility models used by the renderer.

| Metric | Endpoint Sigils | Binding Reveal | Change |
|---|---:|---:|---:|
| Rendered connections | 3 | 3 | 0 |
| Active or pulsing Bindings | 2 | 2 | 0 |
| Endpoint sigil marks | 4 | 4 | 0 |
| Persistent reveal stroke overlays | 0 | 0 | 0 |
| Transient reveal stroke overlays | 0 | 1 for the currently pulsing Binding | transient only |

Interpretation:

- The reveal uses the existing `bindingPulse` visibility exception instead of a new persistent overlay path.
- The dormant offscreen thread remains asleep.
- The rendered relic set does not increase.
- The visible reveal is transient path-progress data on an already-rendered pulsing Binding.
- Reduced motion uses the shortened static pulse path and avoids the travelling reveal.

## Decision

Binding feedback is stable enough to move the next unattended work back to the Living Index.

Future atmospheric animation should keep following the same rule: visible, active, pulsing, or selected-context work may wake briefly; dormant offscreen ornamentation sleeps.

## Next

Continue the Living Index toward searchable sigil marks. Before adding persistent search ornamentation, keep marks capped and visibility-aware, and profile any new always-mounted SVG or DOM layer.
