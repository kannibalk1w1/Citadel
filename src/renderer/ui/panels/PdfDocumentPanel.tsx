import React, { useEffect, useId, useRef, useState } from 'react'
import type { CanvasItem } from '../../../types'
import { changePdfPage, guardPdfItem, pdfFailureMessage, pdfPage, pdfSource } from '../../utils/pdfDocument'
import { PDF_LIMITS, readPdfInfo, searchPdfText, type PdfSearch } from '../../utils/pdfPreview'
import { projectSessionRevision } from '../../utils/projectSession'

export type PdfDocumentPanelProps = { item: CanvasItem; boardId: string }

const controlStyle: React.CSSProperties = {
  background: 'var(--bg-ui)', color: 'var(--text-primary)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', padding: '4px 6px', fontSize: 'var(--text-sm)', minWidth: 0,
}

/** ItemProperties owns placement; this panel owns only PDF document controls. */
export function PdfDocumentPanel({ item, boardId }: PdfDocumentPanelProps): React.ReactElement | null {
  const source = pdfSource(item)
  // Remount all transient state on a relink/refresh/project replacement, while
  // retaining search results when the user follows a result to another page.
  const key = JSON.stringify([boardId, item.id, source, item.meta?.sourceFingerprint, projectSessionRevision()])
  return source ? <PdfControls key={key} item={item} boardId={boardId} source={source} /> : null
}

function PdfControls({ item, boardId, source }: PdfDocumentPanelProps & { source: string }): React.ReactElement {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [busy, setBusy] = useState<'opening' | 'page' | 'search' | null>('opening')
  const [error, setError] = useState('')
  const [pageInput, setPageInput] = useState(String(pdfPage(item)))
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState<PdfSearch | null>(null)
  const operation = useRef<AbortController | null>(null)
  const pageId = useId()
  const searchId = useId()
  const page = pdfPage(item)

  useEffect(() => { setPageInput(String(page)) }, [page])
  async function openInfo() {
    operation.current?.abort()
    const controller = new AbortController()
    operation.current = controller
    const guard = guardPdfItem(item, boardId, controller.signal)
    setBusy('opening'); setError('')
    try {
      const info = await readPdfInfo(source, guard.signal)
      if (guard.current()) setNumPages(info.numPages)
    } catch (reason) {
      if (!controller.signal.aborted && guard.current()) setError(pdfFailureMessage(reason))
    } finally {
      guard.dispose()
      if (operation.current === controller && !controller.signal.aborted) setBusy(null)
    }
  }

  useEffect(() => {
    void openInfo()
    return () => { operation.current?.abort() }
    // PdfControls is keyed by source identity and project revision above.
  }, [])

  const cancel = () => { operation.current?.abort(); setBusy(null) }

  async function navigate(target: number) {
    if (!numPages || !Number.isInteger(target) || target < 1 || target > numPages) {
      setError(`Enter a page from 1 to ${numPages ?? 1}.`)
      return
    }
    if (target === page || item.locked) return
    operation.current?.abort()
    const controller = new AbortController()
    operation.current = controller
    setBusy('page'); setError('')
    try { await changePdfPage(item, boardId, target, controller.signal) }
    catch (reason) { if (!controller.signal.aborted && (reason as Error)?.name !== 'AbortError') setError(pdfFailureMessage(reason)) }
    finally { if (operation.current === controller && !controller.signal.aborted) setBusy(null) }
  }

  async function runSearch() {
    if (!query.trim()) return
    operation.current?.abort()
    const controller = new AbortController()
    operation.current = controller
    const guard = guardPdfItem(item, boardId, controller.signal)
    setBusy('search'); setError(''); setSearch(null)
    try {
      const result = await searchPdfText(source, query, guard.signal)
      if (guard.current()) { setSearch(result); setNumPages(result.numPages) }
    } catch (reason) {
      if (!controller.signal.aborted && guard.current()) setError(pdfFailureMessage(reason))
    } finally {
      guard.dispose()
      if (operation.current === controller && !controller.signal.aborted) setBusy(null)
    }
  }

  return <section aria-label="PDF document" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
    <strong style={{ color: 'var(--text-accent)', fontSize: 'var(--text-sm)' }}>PDF document</strong>
    <form onSubmit={(event) => { event.preventDefault(); void navigate(Number(pageInput)) }} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <label htmlFor={pageId}>Page</label>
        <input id={pageId} type="number" min={1} max={numPages ?? undefined} step={1} value={pageInput}
          onChange={(event) => setPageInput(event.target.value)} disabled={!!busy || item.locked || !numPages}
          style={{ ...controlStyle, width: 60 }} />
        <span>of {numPages ?? '…'}</span>
        <button type="submit" style={controlStyle} disabled={!!busy || item.locked || !numPages}>Go</button>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button type="button" aria-label="Previous PDF page" style={controlStyle} disabled={!!busy || item.locked || !numPages || page <= 1} onClick={() => void navigate(page - 1)}>Previous</button>
        <button type="button" aria-label="Next PDF page" style={controlStyle} disabled={!!busy || item.locked || !numPages || page >= numPages} onClick={() => void navigate(page + 1)}>Next</button>
      </div>
    </form>
    <form onSubmit={(event) => { event.preventDefault(); void runSearch() }} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <label htmlFor={searchId}>Search PDF text</label>
      <input id={searchId} type="search" value={query} maxLength={PDF_LIMITS.query} style={controlStyle}
        onChange={(event) => { if (busy === 'search') cancel(); setQuery(event.target.value); setSearch(null) }} />
      <button type="submit" style={controlStyle} disabled={!!busy || !query.trim()}>Search PDF</button>
    </form>
    {busy && <div role="status">{busy === 'search' ? 'Searching PDF…' : busy === 'page' ? 'Loading page…' : 'Opening PDF…'} <button type="button" style={controlStyle} onClick={cancel}>Cancel</button></div>}
    {!busy && !numPages && <button type="button" style={controlStyle} onClick={() => void openInfo()}>Open PDF</button>}
    {error && <p role="alert" style={{ margin: 0, color: 'var(--text-muted)' }}>{error}</p>}
    {item.locked && <p style={{ margin: 0, color: 'var(--text-muted)' }}>Unlock this item to change its page.</p>}
    {search && <div role="status" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
      {search.results.length ? `${search.results.length} ${search.results.length === 1 ? 'match' : 'matches'} across ${search.pagesSearched} searched pages.` : search.hasText ? 'No matches found.' : 'No searchable text found. Scanned pages need OCR, which is not available here.'}
      {search.truncated && ' Search limit reached; results may be incomplete.'}
    </div>}
    {search && search.results.length > 0 && <ul aria-label="PDF search results" style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 240, overflowY: 'auto' }}>
      {search.results.map((result, index) => <li key={`${result.page}-${index}`} style={{ marginBottom: 'var(--space-2)' }}>
        <button type="button" aria-label={`Page ${result.page}: ${result.snippet}`} disabled={!!busy || item.locked} onClick={() => void navigate(result.page)}
          style={{ ...controlStyle, textAlign: 'left', width: '100%', overflowWrap: 'anywhere' }}>
          <strong>Page {result.page}</strong><br />{result.snippet}
        </button>
      </li>)}
    </ul>}
  </section>
}
