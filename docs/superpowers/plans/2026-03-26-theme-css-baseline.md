# Theme CSS Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `dark.css` and `light.css` in `src/renderer/theme/` so the app builds and all CSS custom properties resolve correctly in dark mode.

**Architecture:** All design tokens are defined on `:root` in `dark.css` — dark is the default before React mounts, so there is no flash of unstyled content. `light.css` is a stub comment only. No TypeScript files are modified.

**Tech Stack:** Plain CSS, Vite (imported via `src/renderer/main.tsx`)

---

### Task 1: Create `light.css` stub

**Files:**
- Create: `src/renderer/theme/light.css`

- [ ] **Step 1: Create the file**

Create `src/renderer/theme/light.css` with exactly this content:

```css
/* Light theme — reserved for future use */
```

- [ ] **Step 2: Verify the import resolves**

Run the dev server:
```bash
npm run dev
```
Expected: no "Failed to resolve import" error for `./theme/light.css` in the terminal.

---

### Task 2: Create `dark.css` — design tokens

**Files:**
- Create: `src/renderer/theme/dark.css`

- [ ] **Step 1: Create the file with all CSS custom properties**

Create `src/renderer/theme/dark.css`:

```css
/* ── Citadel Design Tokens ─────────────────────────────────────────────────── */
/* Dark theme is the default. Light theme overrides go in light.css on         */
/* [data-theme="light"]. ThemeProvider sets data-theme at runtime.             */

:root {
  /* Backgrounds */
  --bg-canvas:  #0f0d0b;
  --bg-ui:      #1a1612;
  --bg-panel:   #221d18;
  --bg-hover:   #2e2820;

  /* Text */
  --text-primary:   #e8ddd0;
  --text-secondary: #a09080;
  --text-muted:     #5c5040;
  --text-accent:    #c8a96e;

  /* Accent */
  --accent:        #c8a96e;
  --accent-danger: #8b2020;

  /* Borders */
  --border:       #2e2820;
  --border-muted: #1e1a16;

  /* Effect palette — mascot animations only, never used in UI chrome */
  --effect-primary: #ffffff;
  --effect-mid:     #c8c8c8;
  --effect-dim:     #505050;

  /* Typography */
  --font-display: 'Cinzel', serif;
  --font-body:    'Inter', 'DM Sans', sans-serif;
  --font-mono:    'JetBrains Mono', monospace;

  /* Layout */
  --sidebar-right-w: 164px;

  /* Z-index scale */
  --z-ui:     10;
  --z-panels: 20;
  --z-modal:  100;

  /* Shadows */
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 4px 20px rgba(0, 0, 0, 0.7);

  /* Motion */
  --transition-fast: 80ms ease;
}
```

- [ ] **Step 2: Verify variables resolve in the browser**

With the dev server running, open DevTools → Elements → select `<html>` → Computed → filter by `--bg-canvas`.
Expected: value shows `#0f0d0b`.

---

### Task 3: Add global base reset to `dark.css`

**Files:**
- Modify: `src/renderer/theme/dark.css` (append after the `:root` block)

- [ ] **Step 1: Append the base reset**

Add the following after the closing `}` of the `:root` block in `src/renderer/theme/dark.css`:

```css

/* ── Global Reset ──────────────────────────────────────────────────────────── */

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg-canvas);
  color: var(--text-primary);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

#root {
  width: 100%;
  height: 100%;
}

a {
  color: var(--text-accent);
  text-decoration: none;
}

/* ── Scrollbars (Chromium / Electron) ─────────────────────────────────────── */

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: var(--bg-ui);
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}
```

- [ ] **Step 2: Verify visual result**

With the dev server running, the app canvas background should be `#0f0d0b` (near-black warm dark), text should be `#e8ddd0` (warm parchment), and there should be no white flash or unstyled content on load.

Check DevTools → Elements → `<html>` has no inline margin/padding on `<body>`.

- [ ] **Step 3: Verify scrollbars (if any panel is tall enough to scroll)**

Open the KeybindSettings panel (press `?` or via the toolbar). Scrollbar, if visible, should be thin (6px) and dark-toned.
