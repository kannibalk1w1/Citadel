import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { inscribe } from '../../ui/toasts/inscriptionToastStore'
import { DOMItem } from './DOMItem'
import { CODE_CARD_LAYOUT, CODE_LANGUAGES, codeLanguageLabel, gutterWidth, normalizeCodeLanguage, tokenizeSnippet, type TokenKind } from './codeSnippet'
import { preferCodeSilhouette } from '../../assets/textDetailPolicy'

type Props = { item: CanvasItem; domOnly?: boolean }

const tokenColor: Record<TokenKind, string> = {
  plain: 'var(--code-text)',
  keyword: 'var(--code-keyword)',
  string: 'var(--code-string)',
  number: 'var(--code-number)',
  comment: 'var(--code-comment)',
}

// Ragged widths so the silhouette reads as code rather than as a paragraph.
// Percentages, not pixels: the card box shrinks with the viewport, so the bars
// have to keep their proportions at any zoom.
const SILHOUETTE_BARS = ['64%', '81%', '47%', '72%', '38%']

export function CodeItem({ item, domOnly = false }: Props): React.ReactElement | null {
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const copyTimer = useRef<ReturnType<typeof setTimeout>>()

  const scale = useCanvasStore((s) => s.viewport().scale)
  const isSelected = useCanvasStore((s) => s.selectedIds.includes(item.id))

  const code = typeof item.meta?.code === 'string' ? item.meta.code : ''
  const language = normalizeCodeLanguage(item.meta?.language)
  // The identifier is what the header shows (uppercased) and what the export
  // draws, so those two stay paired. The accessible name is read aloud, so it
  // uses the written form — "TypeScript code snippet", not "typescript".
  const languageLabel = codeLanguageLabel(language)
  const silhouette = preferCodeSilhouette(scale, isSelected, editing)

  // The same call the export makes, so the card and its still cannot colour the
  // same snippet differently. Tied to the code and language rather than the
  // frame, since panning re-renders on every viewport change — and skipped
  // outright while silhouetted, which is the point of that gate: a long snippet
  // stops paying for a span per token nobody can read.
  const lines = useMemo(
    () => (silhouette ? [] : tokenizeSnippet(code, language)),
    [code, language, silhouette],
  )

  // The card unmounts as soon as it leaves the viewport slice, which can happen
  // inside the confirmation window and would otherwise set state on a dead node.
  useEffect(() => () => clearTimeout(copyTimer.current), [])

  if (!domOnly) return null

  const beginEdit = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDraft(code)
    setEditing(true)
  }

  // Changing the language from the card itself. The properties panel can still
  // do it, but reaching for a sidebar to say "this is C#" is a long way round
  // when the card already shows the answer.
  const setLanguage = (next: string) => {
    const canvas = useCanvasStore.getState()
    const boardId = canvas.activeBoardId
    if (!boardId || next === language) return
    const meta = { ...item.meta, language: normalizeCodeLanguage(next) }
    useHistoryStore.getState().push('ITEM_STYLE', boardId, item, { ...item, meta })
    canvas.updateItem(boardId, item.id, { meta })
  }

  const finishEdit = (save: boolean) => {
    if (save && draft !== code) {
      const canvas = useCanvasStore.getState()
      const boardId = canvas.activeBoardId
      if (boardId) {
        const meta = { ...item.meta, code: draft }
        useHistoryStore.getState().push('ITEM_STYLE', boardId, item, { ...item, meta })
        canvas.updateItem(boardId, item.id, { meta })
      }
    }
    setEditing(false)
  }

  const copy = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      inscribe('Code copied')
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 1400)
    } catch {
      inscribe('Could not copy code', { tone: 'danger' })
    }
  }

  const gutter = gutterWidth(lines.length)

  // Far zoom: a constant handful of nodes instead of one span per token. It
  // stays inside DOMItem, so selection chrome, dragging and resizing are
  // untouched, and it keeps the double-click target so editing still opens from
  // here — editing wakes the card on the same render.
  if (silhouette) {
    return (
      <DOMItem
        item={item}
        editableFrame
        onClick={() => useCanvasStore.getState().setSelection([item.id])}
        style={{ borderRadius: 'var(--radius-md)' }}
      >
        <section
          aria-label={`${languageLabel} code snippet`}
          data-silhouette="true"
          onDoubleClick={beginEdit}
          style={{
            width: '100%', height: '100%', minHeight: 0, overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            background: 'var(--code-bg)', border: '1px solid var(--code-border)', borderRadius: 'var(--radius-md)',
            opacity: 0.85,
          }}
        >
          <div
            aria-hidden="true"
            style={{ flex: '0 0 20%', minHeight: 1, maxHeight: 32, background: 'var(--code-bg-header)', borderBottom: '1px solid var(--code-border)' }}
          />
          <div
            aria-hidden="true"
            style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', padding: '6% 8%' }}
          >
            {SILHOUETTE_BARS.map((width) => (
              <span key={width} style={{ height: '11%', minHeight: 1, width, background: 'var(--code-gutter)', opacity: 0.5, borderRadius: 1 }} />
            ))}
          </div>
        </section>
      </DOMItem>
    )
  }

  return (
    <DOMItem
      item={item}
      editableFrame
      onClick={() => useCanvasStore.getState().setSelection([item.id])}
      style={{ borderRadius: 'var(--radius-md)' }}
    >
      <section
        aria-label={`${languageLabel} code snippet`}
        style={{
          width: '100%', height: '100%', minHeight: 0, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          background: 'var(--code-bg)', border: '1px solid var(--code-border)', borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 28px rgba(0,0,0,0.28)',
          color: 'var(--code-text)', fontFamily: 'var(--font-mono)',
        }}
      >
        <header style={{ height: CODE_CARD_LAYOUT.headerHeight, flex: `0 0 ${CODE_CARD_LAYOUT.headerHeight}px`, display: 'flex', alignItems: 'center', gap: 8, padding: '0 9px', background: 'var(--code-bg-header)', borderBottom: '1px solid var(--code-border)' }}>
          <span aria-hidden="true" style={{ display: 'flex', gap: 4 }}>
            {['var(--code-alert)', 'var(--code-number)', 'var(--code-string)'].map((color) => (
              <i key={color} style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'block' }} />
            ))}
          </span>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            title="Language"
            aria-label="Snippet language"
            style={{
              flex: 1, minWidth: 0,
              border: 0, background: 'transparent', cursor: 'pointer',
              color: 'var(--code-text-dim)', fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)', letterSpacing: '0.04em', textTransform: 'uppercase',
              padding: 0, appearance: 'none', textOverflow: 'ellipsis',
            }}
          >
            {CODE_LANGUAGES.map((option) => (
              <option key={option} value={option}>{codeLanguageLabel(option)}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={copy}
            title="Copy code"
            aria-label={copied ? 'Code copied' : 'Copy code'}
            style={{
              border: '1px solid var(--code-border-button)', borderRadius: 3,
              background: copied ? 'var(--code-bg-confirm)' : 'var(--code-bg-button)',
              color: copied ? 'var(--code-string)' : 'var(--code-text)',
              padding: '3px 7px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </header>
        {editing ? (
          <textarea
            autoFocus
            aria-label="Edit code snippet"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => finishEdit(true)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') { event.preventDefault(); finishEdit(false) }
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); finishEdit(true) }
            }}
            spellCheck={false}
            style={{ flex: 1, minHeight: 0, width: '100%', border: 0, outline: 0, resize: 'none', padding: `${CODE_CARD_LAYOUT.padY}px ${CODE_CARD_LAYOUT.padX}px`, background: 'var(--code-bg)', color: 'var(--code-text)', font: `${CODE_CARD_LAYOUT.fontPx}px/${CODE_CARD_LAYOUT.lineHeight} var(--font-mono)`, tabSize: 2 }}
          />
        ) : (
          <pre onDoubleClick={beginEdit} title="Double-click to edit" style={{ margin: 0, padding: `${CODE_CARD_LAYOUT.padY}px ${CODE_CARD_LAYOUT.padX}px`, flex: 1, minHeight: 0, overflow: 'auto', fontFamily: 'inherit', fontSize: `${CODE_CARD_LAYOUT.fontPx}px`, lineHeight: CODE_CARD_LAYOUT.lineHeight, tabSize: 2, whiteSpace: 'pre', cursor: 'text' }}>
            {lines.map((tokens, index) => (
              <span key={index} style={{ display: 'flex', minWidth: 'max-content' }}>
                <span aria-hidden="true" style={{ width: gutter, flex: `0 0 ${gutter}px`, color: 'var(--code-gutter)', userSelect: 'none', textAlign: 'right', paddingRight: CODE_CARD_LAYOUT.gutterGap }}>{index + 1}</span>
                <code>{tokens.map((token, tokenIndex) => <span key={tokenIndex} style={{ color: tokenColor[token.kind] }}>{token.text}</span>)}</code>
              </span>
            ))}
          </pre>
        )}
      </section>
    </DOMItem>
  )
}
