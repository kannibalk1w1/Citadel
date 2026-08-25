/**
 * What a dropped PDF says when it cannot be read.
 *
 * It lives here rather than beside `renderPdfFirstPage` because that module
 * imports pdf.js, which needs a browser to load at all. A sentence a person
 * reads should not be locked behind a rendering engine.
 *
 * A dropped PDF that failed used to disappear without a word: the drop handler
 * logged to the console and moved on. Every other import path in Citadel says
 * what happened.
 */
export function pdfDropFailureMessage(filename: string, error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error ?? '')

  if (detail.includes('local PDF files only')) {
    return `${filename} is a link rather than a local file. Citadel previews local PDF files only.`
  }
  if (/password|encrypted/i.test(detail)) {
    return `${filename} is password protected, so Citadel could not draw its first page. Save an unprotected copy and drop it again.`
  }
  if (/Invalid PDF|corrupt|structure/i.test(detail)) {
    return `${filename} could not be read as a PDF. It may be damaged.`
  }
  return `${filename} could not be previewed, so nothing was added.`
}
