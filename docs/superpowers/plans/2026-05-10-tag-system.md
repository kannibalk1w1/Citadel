# Tag System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the basic comma-separated tag input in ItemProperties with chip badges (removable), a text input that autocompletes from all tags in the canvas, and history-backed add/remove actions.

**Architecture:** Single file change. Add a `TagsSection` helper component in `ItemProperties.tsx` (before the main export). Replace the existing `<Field label="Tags">` block with `<Divider label="Tags" /><TagsSection item={item} boardId={activeBoardId} />`. `TagsSection` manages its own local `input`/`open` state, reads all canvas items for suggestions, and calls `updateItem` + `historyStore.push` directly.

**Tech Stack:** React (useState, useMemo), Zustand (canvasStore, historyStore), TypeScript

---

## File Map

| File | Change |
|---|---|
| `src/renderer/ui/panels/ItemProperties.tsx` | Add `TagsSection` component; replace simple Tags field |

---

### Task 1: Add TagsSection + replace existing Tags field

**Files:**
- Modify: `src/renderer/ui/panels/ItemProperties.tsx`

- [ ] **Step 1: Read the current file**

Read `src/renderer/ui/panels/ItemProperties.tsx` in full before making any changes.

- [ ] **Step 2: Add the TagsSection component**

Find the comment `// ── Main export ────────────────────────────────────────────────────────────────` (around line 314). Insert the following block immediately before it:

```tsx
function TagsSection({ item, boardId }: { item: CanvasItem; boardId: string }): React.ReactElement {
  const [input, setInput] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const allItems = useCanvasStore((s) => s.items())
  const updateItem = useCanvasStore((s) => s.updateItem)
  const pushHistory = useHistoryStore((s) => s.push)

  const suggestions = React.useMemo(() => {
    const q = input.toLowerCase()
    if (!q) return []
    return Array.from(new Set(allItems.flatMap((i) => i.tags)))
      .filter((t) => !item.tags.includes(t) && t.startsWith(q))
      .sort()
      .slice(0, 6)
  }, [input, allItems, item.tags])

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase()
    if (!t || item.tags.includes(t)) return
    const newTags = [...item.tags, t]
    pushHistory('ITEM_STYLE', boardId, { id: item.id, tags: item.tags }, { id: item.id, tags: newTags })
    updateItem(boardId, item.id, { tags: newTags })
    setInput('')
    setOpen(false)
  }

  const removeTag = (tag: string) => {
    const newTags = item.tags.filter((t) => t !== tag)
    pushHistory('ITEM_STYLE', boardId, { id: item.id, tags: item.tags }, { id: item.id, tags: newTags })
    updateItem(boardId, item.id, { tags: newTags })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {item.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {item.tags.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                background: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '1px 6px 1px 7px',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
              }}
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: 11,
                  lineHeight: 1,
                  padding: 0,
                  marginLeft: 1,
                }}
              >×</button>
            </span>
          ))}
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { addTag(input); e.preventDefault() }
            if (e.key === 'Escape') { setInput(''); setOpen(false) }
          }}
          onFocus={() => { if (input) setOpen(true) }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Add tag…"
          style={{ ...inputStyle, width: '100%' }}
        />
        {open && suggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 10,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: 3,
            marginTop: 2,
          }}>
            {suggestions.map((s) => (
              <div
                key={s}
                onMouseDown={() => addTag(s)}
                style={{
                  padding: '3px 8px',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

Note: `onMouseDown` is used for suggestions (not `onClick`) so the click registers before the input's `onBlur` fires and closes the dropdown. The 150ms `setTimeout` in `onBlur` is required for the same reason.

Also note: `CanvasItem` is already used in the file but may not be imported at the top — check. If `import type { CanvasItem }` is not present, add it from `'../../../types'` or wherever the file imports it from.

- [ ] **Step 3: Replace the existing Tags field in the JSX**

In the `return` block of `ItemProperties`, find this block (around line 523–535):

```tsx
      <Divider label="Meta" />

      <Field label="Locked">
        <input type="checkbox" checked={item.locked} onChange={(e) => update({ locked: e.target.checked })} />
      </Field>
      <Field label="Tags">
        <input
          value={item.tags.join(', ')}
          onChange={(e) => update({ tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
          style={inputStyle}
          placeholder="tag1, tag2"
        />
      </Field>
```

Replace it with:

```tsx
      <Divider label="Tags" />
      <TagsSection item={item} boardId={activeBoardId} />

      <Divider label="Meta" />

      <Field label="Locked">
        <input type="checkbox" checked={item.locked} onChange={(e) => update({ locked: e.target.checked })} />
      </Field>
```

The Tags field is removed from the Meta section. The Link field below Locked stays untouched.

- [ ] **Step 4: Verify it compiles**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error TS|✓ built"
```

Expected: `✓ built` with no TypeScript errors.

- [ ] **Step 5: Commit**

```
git add src/renderer/ui/panels/ItemProperties.tsx
git commit -m "feat: tag chips with autocomplete in ItemProperties panel"
```
