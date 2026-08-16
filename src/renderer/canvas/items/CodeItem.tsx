import React, { useState } from 'react'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { inscribe } from '../../ui/toasts/inscriptionToastStore'
import { DOMItem } from './DOMItem'
import { normalizeCodeLanguage } from './codeSnippet'

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
  plain: '#d8dee9',
  keyword: '#86b7ff',
  string: '#9fda95',
  number: '#e6bd8a',
  comment: '#7d899a',
}

export function CodeItem({ item, domOnly = false }: Props): React.ReactElement | null {
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  if (!domOnly) return null
  const code = typeof item.meta?.code === 'string' ? item.meta.code : ''
  const language = normalizeCodeLanguage(item.meta?.language)

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
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      inscribe('Could not copy code', { tone: 'danger' })
    }
  }

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
          background: '#11161f', border: '1px solid #2d3745', borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 28px rgba(0,0,0,0.28)',
          color: '#d8dee9', fontFamily: 'var(--font-mono)',
        }}
      >
        <header style={{ height: 32, flex: '0 0 32px', display: 'flex', alignItems: 'center', gap: 8, padding: '0 9px', background: '#18212d', borderBottom: '1px solid #2d3745' }}>
          <span aria-hidden="true" style={{ display: 'flex', gap: 4 }}>
            {['#f07f7f', '#e6bd8a', '#9fda95'].map((color) => <i key={color} style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'block' }} />)}
          </span>
          <span style={{ flex: 1, color: '#aeb9c7', fontSize: 'var(--text-sm)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{language}</span>
          <button type="button" onClick={copy} title="Copy code" aria-label="Copy code" style={{ border: '1px solid #3e4d60', borderRadius: 3, background: copied ? '#263d35' : '#202b38', color: copied ? '#9fda95' : '#d8dee9', padding: '3px 7px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', cursor: 'pointer' }}>
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
            style={{ flex: 1, minHeight: 0, width: '100%', border: 0, outline: 0, resize: 'none', padding: '10px 12px', background: '#11161f', color: '#d8dee9', font: '12px/1.55 var(--font-mono)', tabSize: 2 }}
          />
        ) : (
          <pre onDoubleClick={beginEdit} title="Double-click to edit" style={{ margin: 0, padding: '10px 12px', flex: 1, minHeight: 0, overflow: 'auto', fontFamily: 'inherit', fontSize: '12px', lineHeight: 1.55, tabSize: 2, whiteSpace: 'pre', cursor: 'text' }}>
            {code.split('\n').map((line, index) => (
              <span key={index} style={{ display: 'flex', minWidth: 'max-content' }}>
                <span aria-hidden="true" style={{ width: 28, flex: '0 0 28px', color: '#596779', userSelect: 'none', textAlign: 'right', paddingRight: 10 }}>{index + 1}</span>
                <code>{tokensForLine(line).map((token, tokenIndex) => <span key={tokenIndex} style={{ color: tokenColor[token.kind] }}>{token.text}</span>)}</code>
              </span>
            ))}
          </pre>
        )}
      </section>
    </DOMItem>
  )
}
