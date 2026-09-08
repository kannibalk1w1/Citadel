import React from 'react'

/** Explicit source editing avoids browser HTML, paste sanitizers and hidden markup. */
export function DocumentFormattingTools({ textareaRef, onChange }: {
  textareaRef: React.RefObject<HTMLTextAreaElement>; onChange: (source: string) => void
}): React.ReactElement {
  const insert = (before: string, after = '', line = false) => {
    const el = textareaRef.current
    if (!el) return
    const start = line ? el.value.lastIndexOf('\n', el.selectionStart - 1) + 1 : el.selectionStart
    const end = el.selectionEnd
    const selected = el.value.slice(start, end)
    const replacement = `${before}${selected}${after}`
    el.setRangeText(replacement, start, end, 'select')
    onChange(el.value)
    el.focus()
  }
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
    <span style={{ alignSelf: 'center', marginRight: 4 }}>Edit Markdown</span>
    {[
      { label: 'Heading', before: '## ', line: true },
      { label: 'Bold', before: '**', after: '**' },
      { label: 'Italic', before: '*', after: '*' },
      { label: 'List', before: '- ', line: true },
      { label: 'Link', before: '[', after: '](https://example.com)' },
    ].map(({ label, before, after, line }) => <button key={label} type="button" aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => insert(before, after, line)}
      style={{ color: 'var(--text-primary)', background: 'var(--bg-ui)', border: '1px solid var(--border)', padding: '3px 6px', borderRadius: 3 }}>
      {label}
    </button>)}
  </div>
}
