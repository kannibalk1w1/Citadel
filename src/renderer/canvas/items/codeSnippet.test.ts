import { describe, expect, it } from 'vitest'
import { CODE_LANGUAGES, codeLanguageLabel, gutterWidth, normalizeCodeLanguage, tokenizeSnippet } from './codeSnippet'

describe('code snippet languages', () => {
  it('offers focused, readable language choices', () => {
    expect(CODE_LANGUAGES).toContain('typescript')
    expect(CODE_LANGUAGES).toContain('python')
  })

  it('keeps legacy free-text languages safe', () => {
    expect(normalizeCodeLanguage('sql')).toBe('sql')
    expect(normalizeCodeLanguage('elvish')).toBe('plaintext')
  })
})

describe('line number gutter', () => {
  it('holds a floor wide enough for short snippets', () => {
    expect(gutterWidth(1)).toBe(28)
    expect(gutterWidth(9)).toBe(28)
    expect(gutterWidth(99)).toBe(28)
  })

  it('widens once the line count needs another digit', () => {
    expect(gutterWidth(100)).toBeGreaterThan(gutterWidth(99))
    expect(gutterWidth(1000)).toBeGreaterThan(gutterWidth(100))
  })

  it('stays positive for an empty snippet', () => {
    expect(gutterWidth(0)).toBe(28)
  })
})

/**
 * Game work is a large part of who this is for, so these languages get real
 * snippets rather than a keyword each: the point is that a line someone pastes
 * out of Unity, Unreal, Godot or a shader reads correctly, not that the spec
 * table has an entry.
 */
describe('game development languages', () => {
  const kindsOf = (code: string, language: Parameters<typeof tokenizeSnippet>[1]) =>
    tokenizeSnippet(code, language)[0].map((token) => `${token.kind}:${token.text.trim()}`)

  it('highlights C# as Unity writes it', () => {
    const [line] = tokenizeSnippet('public class Player : MonoBehaviour // entry', 'csharp')

    expect(line.some((t) => t.kind === 'keyword' && t.text === 'public')).toBe(true)
    expect(line.some((t) => t.kind === 'keyword' && t.text === 'class')).toBe(true)
    expect(line.some((t) => t.kind === 'comment' && t.text.includes('entry'))).toBe(true)
  })

  it('highlights C++ including preprocessor lines', () => {
    expect(kindsOf('#include <memory>', 'cpp')).toContainEqual('keyword:include')
    const [line] = tokenizeSnippet('constexpr float kGravity = 9.81f;', 'cpp')
    expect(line.some((t) => t.kind === 'keyword' && t.text === 'constexpr')).toBe(true)
    expect(line.some((t) => t.kind === 'number')).toBe(true)
  })

  it('treats C as C++ rather than as plain text', () => {
    expect(tokenizeSnippet('static int frames = 0;', 'c')[0].some((t) => t.kind === 'keyword')).toBe(true)
  })

  it('highlights GDScript, including Godot’s own words', () => {
    const [line] = tokenizeSnippet('func _ready() -> void: # Godot', 'gdscript')

    expect(line.some((t) => t.kind === 'keyword' && t.text === 'func')).toBe(true)
    expect(line.some((t) => t.kind === 'comment')).toBe(true)
  })

  it('reads Lua comments, which start the same way its block comments do', () => {
    // `--` opens a line comment and `--[[` a block one; the longer must win.
    expect(tokenizeSnippet('-- a note', 'lua')[0].every((t) => t.kind === 'comment')).toBe(true)
    const block = tokenizeSnippet('--[[ spans\nlines ]] local x = 1', 'lua')
    expect(block[0].every((t) => t.kind === 'comment')).toBe(true)
    expect(block[1].some((t) => t.kind === 'keyword' && t.text === 'local')).toBe(true)
  })

  it('highlights Rust', () => {
    const [line] = tokenizeSnippet('pub fn spawn(mut commands: Commands) {', 'rust')

    expect(line.filter((t) => t.kind === 'keyword').map((t) => t.text)).toEqual(
      expect.arrayContaining(['pub', 'fn', 'mut']),
    )
  })

  it('highlights shader types in both HLSL and GLSL', () => {
    for (const language of ['hlsl', 'glsl'] as const) {
      const [line] = tokenizeSnippet('uniform vec4 tint; float4 c = float4(1.0, 0.0, 0.0, 1.0);', language)
      expect(line.some((t) => t.kind === 'keyword' && t.text === 'uniform')).toBe(true)
      expect(line.some((t) => t.kind === 'number')).toBe(true)
    }
  })

  it('gives every language a label that is not just its id', () => {
    expect(codeLanguageLabel('csharp')).toBe('C#')
    expect(codeLanguageLabel('cpp')).toBe('C++')
    expect(codeLanguageLabel('gdscript')).toBe('GDScript')
    expect(codeLanguageLabel('hlsl')).toBe('HLSL')
  })

  it('has a spec for every declared language, so none falls back to plain text', () => {
    for (const language of CODE_LANGUAGES) {
      if (language === 'plaintext') continue
      const tokens = tokenizeSnippet('// x\n"s"\n42', language).flat()
      expect(tokens.some((t) => t.kind !== 'plain')).toBe(true)
    }
  })
})
