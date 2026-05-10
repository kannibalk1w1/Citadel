# Tint UI + Lasso Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tint colour/opacity controls to ItemProperties, and fix the invisible lasso outline.

**Architecture:** Two surgical edits. `LassoOverlay.tsx` gets a one-line fix. `ItemProperties.tsx` gets a tint section after the Opacity field — a checkbox to enable/disable, plus colour picker and opacity slider when active.

**Tech Stack:** React, Zustand, TypeScript, Konva

---

## File Map

| File | Change |
|---|---|
| `src/renderer/canvas/overlays/LassoOverlay.tsx` | Fix: `"var(--accent)"` → `"#c8a96e"` |
| `src/renderer/ui/panels/ItemProperties.tsx` | Add tint section after Opacity field |

---

### Task 1: Fix lasso stroke

**Files:**
- Modify: `src/renderer/canvas/overlays/LassoOverlay.tsx`

- [ ] **Step 1: Read the file, then fix the stroke prop**

Read `src/renderer/canvas/overlays/LassoOverlay.tsx`. Find:
```tsx
          stroke="var(--accent)"
```
Replace with:
```tsx
          stroke="#c8a96e"
```

- [ ] **Step 2: Verify**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error TS|✓ built"
```

- [ ] **Step 3: Commit**

```
git add src/renderer/canvas/overlays/LassoOverlay.tsx
git commit -m "fix: lasso stroke — replace CSS var with literal gold colour for Konva"
```

---

### Task 2: Add tint section to ItemProperties

**Files:**
- Modify: `src/renderer/ui/panels/ItemProperties.tsx`

- [ ] **Step 1: Read the file in full**

Read `src/renderer/ui/panels/ItemProperties.tsx` before editing.

- [ ] **Step 2: Add the tint section after the Opacity field**

In the main panel JSX, find:
```tsx
      <Field label="Opacity">
        <input
          type="range" min={0} max={1} step={0.01}
          value={item.opacity}
          onChange={(e) => update({ opacity: parseFloat(e.target.value) })}
          style={{ width: '100%' }}
        />
      </Field>
```

After the closing `</Field>`, add:

```tsx
      {/* ── Tint ── */}
      {!['video', 'youtube', 'audio', 'model3d'].includes(item.type) && (
        <>
          <Divider label="Tint" />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <input
              type="checkbox"
              checked={!!item.tint}
              onChange={(e) => {
                if (e.target.checked) {
                  update({ tint: { color: '#c8a96e', opacity: 0.25 } })
                } else {
                  update({ tint: undefined })
                }
              }}
              style={{ accentColor: 'var(--accent)' }}
            />
            Enable
          </label>
          {item.tint && (
            <>
              <Field label="Color">
                <input
                  type="color"
                  value={item.tint.color}
                  onChange={(e) => update({ tint: { ...item.tint!, color: e.target.value } })}
                  style={{ ...inputStyle, padding: '2px', cursor: 'pointer', height: 24 }}
                />
              </Field>
              <Field label="Opacity">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="range" min={0} max={1} step={0.01}
                    value={item.tint.opacity}
                    onChange={(e) => update({ tint: { ...item.tint!, opacity: parseFloat(e.target.value) } })}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', width: 28, textAlign: 'right' }}>
                    {Math.round(item.tint.opacity * 100)}%
                  </span>
                </div>
              </Field>
            </>
          )}
        </>
      )}
```

Note: `item.tint` is typed as `{ color: string; opacity: number } | undefined` on `CanvasItem`. The `update` function already pushes `ITEM_STYLE` history — no extra history call needed.

- [ ] **Step 3: Verify**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error TS|✓ built"
```

Fix any TypeScript errors. The most likely one is around `item.tint!` — if TypeScript complains, use `(item.tint as { color: string; opacity: number })`.

- [ ] **Step 4: Commit**

```
git add src/renderer/ui/panels/ItemProperties.tsx
git commit -m "feat: tint colour/opacity controls in ItemProperties"
```
