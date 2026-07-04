# Citadel Large-Chamber Profile - Chamber Ambience - 2026-07-04

## Purpose

Phase 5 adds an optional per-chamber ambience layer (drifting motes or fog), a vignette, and an accent glow. The roadmap forbids new persistent ornamentation without a profile check against the large-chamber fixture. This note records that check.

## Method

- Dev app driven over CDP (`npm run dev` with `--remote-debugging-port=9222`, Playwright `connectOverCDP`).
- The dev profile harness's new `window.__citadelLargeChamber.mount({ itemCount: 1000, columns: 50 })` mounted the deterministic fixture chamber.
- Frame timing: rAF deltas collected over ~2.4s while oscillating wheel-zoom over the canvas (12 wheel bursts), first with ambience off, then with motes at full presence plus vignette 1.0 and glow 1.0 applied through the Chamber Rite controls.

## Results

Chamber Load in both passes: `Mounted 36 / 1000 · DOM 0 · Sleeping 0` — the ambience layer changes nothing about which relics mount.

| Metric | Ambience off | Motes + vignette + glow (max) |
|---|---:|---:|
| Frames sampled | 359 | 354 |
| Avg frame | 6.69 ms | 6.77 ms |
| p95 frame | 6.4 ms | 6.3 ms |
| Max frame | 36.2 ms | 30.4 ms |

Mote element count at full presence: 14 (the fixed budget).

## Interpretation

Full-strength ambience costs nothing measurable during heavy zoom churn on a 1,000-relic chamber: average frame time moved 0.08 ms and p95 was inside noise. This matches the design: a fixed DOM/CSS budget (≤14 compositor-animated elements plus two static gradients) never scales with relic count and never touches the Konva layers or viewport slices.

## Decision

Chamber ambience, vignette, and glow are approved at their current budgets. Any future ambience variant must keep a fixed element budget and repeat this check.
