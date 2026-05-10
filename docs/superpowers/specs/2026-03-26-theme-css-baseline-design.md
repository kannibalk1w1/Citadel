# Theme CSS Baseline — Design Spec

**Date:** 2026-03-26
**Scope:** Dark-mode-only CSS foundation. No light theme toggle. No changes to existing TypeScript files.

---

## Problem

`main.tsx` imports `./theme/dark.css` and `./theme/light.css`, but neither file exists. The app cannot build. CSS custom properties referenced throughout the renderer (e.g. `var(--bg-canvas)`, `var(--accent)`) resolve to nothing, making the UI unstyled even if the build were forced.

---

## Solution

Create two files:

1. `src/renderer/theme/dark.css` — defines all design tokens on `:root` plus a global base reset.
2. `src/renderer/theme/light.css` — stub comment only; satisfies the import.

`ThemeProvider.tsx` already sets `data-theme="dark"` on `<html>` at runtime. The light theme, when built later, will define overrides on `[data-theme="light"]`. Dark is the `:root` default so the page is correctly styled before React mounts (no flash).

---

## Token Reference (dark values)

### Backgrounds
| Token | Value | Notes |
|---|---|---|
| `--bg-canvas` | `#0f0d0b` | Infinite canvas surface |
| `--bg-ui` | `#1a1612` | Toolbar, sidebar chrome |
| `--bg-panel` | `#221d18` | Floating panels, modals |
| `--bg-hover` | `#2e2820` | Hover state on interactive elements |

### Text
| Token | Value | Notes |
|---|---|---|
| `--text-primary` | `#e8ddd0` | Warm parchment — body text |
| `--text-secondary` | `#a09080` | Dimmed secondary labels |
| `--text-muted` | `#5c5040` | Placeholders, disabled |
| `--text-accent` | `#c8a96e` | Aged gold — labels, not chrome |

### Accent / Danger
| Token | Value | Notes |
|---|---|---|
| `--accent` | `#c8a96e` | Primary interactive accent |
| `--accent-danger` | `#8b2020` | Destructive actions |

### Borders
| Token | Value | Notes |
|---|---|---|
| `--border` | `#2e2820` | Standard dividers |
| `--border-muted` | `#1e1a16` | Subtle separators |

### Effect palette (mascot / animations only)
| Token | Value |
|---|---|
| `--effect-primary` | `#ffffff` |
| `--effect-mid` | `#c8c8c8` |
| `--effect-dim` | `#505050` |

### Typography
| Token | Value |
|---|---|
| `--font-display` | `'Cinzel', serif` |
| `--font-body` | `'Inter', 'DM Sans', sans-serif` |
| `--font-mono` | `'JetBrains Mono', monospace` |

### Layout
| Token | Value | Notes |
|---|---|---|
| `--sidebar-right-w` | `164px` | Right sidebar width; canvas insets by this amount |

### Z-index scale
| Token | Value |
|---|---|
| `--z-ui` | `10` |
| `--z-panels` | `20` |
| `--z-modal` | `100` |

### Shadows
| Token | Value |
|---|---|
| `--shadow-md` | `0 2px 8px rgba(0,0,0,0.5)` |
| `--shadow-lg` | `0 4px 20px rgba(0,0,0,0.7)` |

### Motion
| Token | Value |
|---|---|
| `--transition-fast` | `80ms ease` |

---

## Global Base Reset (in dark.css)

- `*, *::before, *::after { box-sizing: border-box }`
- `html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden }`
- `body { background: var(--bg-canvas); color: var(--text-primary); font-family: var(--font-body) }`
- `#root { width: 100%; height: 100% }`
- Thin dark scrollbar via `::-webkit-scrollbar` rules (Chromium/Electron)
- `a { color: var(--text-accent) }` — fallback link colour

---

## Files Changed

| File | Action |
|---|---|
| `src/renderer/theme/dark.css` | **Create** — tokens + base reset |
| `src/renderer/theme/light.css` | **Create** — stub comment |

No TypeScript files are modified.

---

## Out of Scope

- Light theme values
- Theme toggle UI
- Auditing existing components for hardcoded colours
