import { existsSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const fontsCss = readFileSync(join(here, 'fonts.css'), 'utf-8')
const indexHtml = readFileSync(join(here, '..', 'index.html'), 'utf-8')

/**
 * Citadel claims to render identically offline. A stylesheet or font pulled
 * from a CDN would quietly break that claim, so guard the shell markup and the
 * font declarations against remote references.
 */
describe('bundled typefaces', () => {
  it('declares every family Citadel names in its theme tokens', () => {
    for (const family of ['Inter', 'JetBrains Mono']) {
      expect(fontsCss).toContain(`font-family: '${family}'`)
    }
  })

  it('points every face at a font file committed to the repository', () => {
    const sources = [...fontsCss.matchAll(/src: url\('([^']+)'\)/g)].map(([, url]) => url)

    expect(sources.length).toBeGreaterThan(0)
    for (const source of sources) {
      expect(source.startsWith('./fonts/')).toBe(true)
      expect(existsSync(join(here, source))).toBe(true)
    }
  })

  it('loads no font over the network', () => {
    expect(fontsCss).not.toMatch(/url\(\s*['"]?https?:/)
  })

  it('keeps the renderer shell free of remote stylesheets and preconnects', () => {
    expect(indexHtml).not.toMatch(/<link[^>]+href=["']https?:/i)
    expect(indexHtml).not.toMatch(/rel=["']preconnect["']/i)
  })
})
