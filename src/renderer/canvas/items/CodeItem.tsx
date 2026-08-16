import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { inscribe } from '../../ui/toasts/inscriptionToastStore'
import { DOMItem } from './DOMItem'
import { gutterWidth, normalizeCodeLanguage } from './codeSnippet'

type Props = { item: CanvasItem; domOnly?: boolean }

type TokenKind = 'plain' | 'keyword' | 'string' | 'number' | 'comment'
type Token = { text: string; kind: TokenKind }

const KEYWORDS = new Set([
  'async', 'await', 'break', 'catch', 'class', 'const', 'continue', 'def', 'else', 'export',
  'false', 'finally', 'for', 'from', 'function', 'if', 'import', 'in', 'let', 'new', 'null',
  'return', 'switch', 'throw', 'true', 'try', 'type', 'undefined', 'while', 'with', 'yield',
])

function tokensForLine(line: string): Token[] {
  const tokens: Token[] = []
  const parts = line.split(/(\/\/.*|#.*|\/\*[\s\S]*?\*\/|'(?:\\.|[^'])*'|"(?:\\.|[^"])*"|`(?:\\.|[^`])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b)/g)
  for (const part of parts) {
    if (!part) continue
    const kind: TokenKind = /^\/\/|^#|^\/\*/.test(part) ? 'comment'
      : /^['"`]/.test(part) ? 'string'
        : /^\d/.test(part) ? 'number'
          : KEYWORDS.has(part) ? 'keyword' : 'plain'
    tokens.push({ text: part, kind })
  }
  return tokens
}

const tokenColor: Record<TokenKind, string> = {
  plain: 'var(--code-text)',
  keyword: 'var(--code-keyword)',
  string: 'var(--code-string)',
  number: 'var(--code-number)',
  comment: 'var(--code-comment)',
}

export function CodeItem({ item, domOnly = false }: Props): React.ReactElement | null {
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const copyTimer = useRef<ReturnType<typeof setTimeout>>()

  const code = typeof item.meta?.code === 'string' ? item.meta.code : ''
  const language = normalizeCodeLanguage(item.meta?.language)

  // Tokenizing runs a regex per line. Panning re-renders the card on every
  // viewport change, so keep the pass tied to the code rather than the frame.
  const lines = useMemo(() => code.split('\n').map(tokensForLine), [code])

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

  return (
    <DOMItem
      item={item}
      editableFrame
      onClick={() => useCanvasStore.getState().setSelection([item.id])}
      style={{ borderRadius: 'var(--radius-md)' }}
    >
      <section
        aria-label={`${language} code snippet`}
        style={{
          width: '100%', height: '100%', minHeight: 0, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          background: 'var(--code-bg)', border: '1px solid var(--code-border)', borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 28px rgba(0,0,0,0.28)',
          color: 'var(--code-text)', fontFamily: 'var(--font-mono)',
        }}
      >
        <header style={{ height: 32, flex: '0 0 32px', display: 'flex', alignItems: 'center', gap: 8, padding: '0 9px', background: 'var(--code-bg-header)', borderBottom: '1px solid var(--code-border)' }}>
          <span aria-hidden="true" style={{ display: 'flex', gap: 4 }}>
            {['var(--code-alert)', 'var(--code-number)', 'var(--code-string)'].map((color) => (
              <i key={color} style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'block' }} />
            ))}
          </span>
          <span style={{ flex: 1, color: 'var(--code-text-dim)', fontSize: 'var(--text-sm)', letterSpacing: '0.04em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{language}</span>
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
            style={{ flex: 1, minHeight: 0, width: '100%', border: 0, outline: 0, resize: 'none', padding: '10px 12px', background: 'var(--code-bg)', color: 'var(--code-text)', font: '12px/1.55 var(--font-mono)', tabSize: 2 }}
          />
        ) : (
          <pre onDoubleClick={beginEdit} title="Double-click to edit" style={{ margin: 0, padding: '10px 12px', flex: 1, minHeight: 0, overflow: 'auto', fontFamily: 'inherit', fontSize: '12px', lineHeight: 1.55, tabSize: 2, whiteSpace: 'pre', cursor: 'text' }}>
            {lines.map((tokens, index) => (
              <span key={index} style={{ display: 'flex', minWidth: 'max-content' }}>
                <span aria-hidden="true" style={{ width: gutter, flex: `0 0 ${gutter}px`, color: 'var(--code-gutter)', userSelect: 'none', textAlign: 'right', paddingRight: 10 }}>{index + 1}</span>
                <code>{tokens.map((token, tokenIndex) => <span key={tokenIndex} style={{ color: tokenColor[token.kind] }}>{token.text}</span>)}</code>
              </span>
            ))}
          </pre>
        )}
      </section>
    </DOMItem>
  )
}
