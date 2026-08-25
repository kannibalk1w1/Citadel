// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyFontChoices,
  applySnippetCss,
  composeSnippetCss,
  enabledOrderFrom,
  refreshUserSnippets,
} from './userStyles'
import { BUILT_IN_FONT_STACKS, FONT_ROLE_TOKENS, cssFontFamilyValue, fontStackFor } from '../../types/appearance'
import type { UserSnippetsResult } from '../../types/appearance'

const invoke = vi.fn()

const result = (snippets: { name: string; css: string; enabled: boolean }[]): UserSnippetsResult => ({
  folder: '/data/snippets',
  snippets: snippets.map((snippet) => ({ ...snippet, bytes: snippet.css.length })),
})

beforeEach(() => {
  document.head.innerHTML = ''
  document.documentElement.removeAttribute('style')
  invoke.mockReset()
  Object.assign(window, { ipc: { invoke } })
})

afterEach(() => { vi.unstubAllGlobals() })

describe('composeSnippetCss', () => {
  it('applies only what is switched on, in the order given', () => {
    const css = composeSnippetCss(
      result([
        { name: 'a', css: ':root { --accent: red; }', enabled: true },
        { name: 'b', css: ':root { --accent: blue; }', enabled: true },
      ]),
      ['b', 'a'],
    )

    // The order is the point: a later snippet is meant to be able to undo an
    // earlier one, which only works if the order is the person's, not the disk's.
    expect(css.indexOf('blue')).toBeLessThan(css.indexOf('red'))
  })

  it('names each file in a comment, so a rule can be traced to its snippet', () => {
    const css = composeSnippetCss(result([{ name: 'contrast', css: 'body {}', enabled: true }]), ['contrast'])
    expect(css).toContain('/* contrast.css */')
  })

  it('leaves out a snippet that is switched off', () => {
    const off = result([{ name: 'a', css: 'body { color: red; }', enabled: false }])
    expect(composeSnippetCss(off, enabledOrderFrom(off))).toBe('')
  })
})

describe('applySnippetCss', () => {
  it('keeps the person’s stylesheet last, so it wins over the theme', () => {
    applySnippetCss('body { color: red; }')
    document.head.appendChild(document.createElement('style'))
    applySnippetCss('body { color: blue; }')

    const styles = [...document.head.querySelectorAll('style')]
    expect(styles[styles.length - 1].id).toBe('citadel-user-snippets')
    // One element, reused: a refresh must not stack a second copy behind it.
    expect(document.querySelectorAll('#citadel-user-snippets')).toHaveLength(1)
    expect(styles[styles.length - 1].textContent).toBe('body { color: blue; }')
  })
})

describe('refreshUserSnippets', () => {
  it('asks main for the list and puts what is on into the document', async () => {
    invoke.mockResolvedValue(result([{ name: 'contrast', css: ':root { --accent: #f00; }', enabled: true }]))

    await refreshUserSnippets()

    expect(invoke).toHaveBeenCalledWith('styles:list')
    expect(document.getElementById('citadel-user-snippets')?.textContent).toContain('--accent')
  })

  it('does nothing rather than throwing when the bridge answers with nothing', async () => {
    invoke.mockResolvedValue(undefined)

    expect(await refreshUserSnippets()).toBeNull()
    expect(document.getElementById('citadel-user-snippets')).toBeNull()
  })
})

describe('font choices', () => {
  it('sets the three type roles the whole interface is built from', () => {
    applyFontChoices({ body: 'Berkeley Mono' })

    const style = document.documentElement.style
    expect(style.getPropertyValue(FONT_ROLE_TOKENS.body)).toContain("'Berkeley Mono'")
    // A chosen font is a first choice, not the only one: what ships stays behind
    // it, so a missing glyph or an uninstalled family still renders.
    expect(style.getPropertyValue(FONT_ROLE_TOKENS.body)).toContain('Inter')
    expect(style.getPropertyValue(FONT_ROLE_TOKENS.mono)).toBe(BUILT_IN_FONT_STACKS.mono)
  })

  it('falls back to what ships when a choice is blank', () => {
    expect(fontStackFor('display', {})).toBe(BUILT_IN_FONT_STACKS.display)
    expect(fontStackFor('display', { display: '   ' })).toBe(BUILT_IN_FONT_STACKS.display)
  })

  it('cannot be used to end the declaration and start another', () => {
    // A font file named `x; position: fixed` would otherwise be a style
    // injection through a filename.
    expect(cssFontFamilyValue('x; position: fixed')).toBe("'x position: fixed'")
    expect(cssFontFamilyValue('a"b\'c{}()')).toBe("'abc'")
    expect(fontStackFor('body', { body: '";' })).toBe(BUILT_IN_FONT_STACKS.body)
  })
})
