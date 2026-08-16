import { describe, expect, it } from 'vitest'
import {
  CODE_LANGUAGES,
  TOKENIZE_LIMITS,
  tokenizeSnippet,
  tokensForLine,
  type CodeLanguage,
  type Token,
  type TokenKind,
} from './codeSnippet'

/** Text of every token the tokenizer gave a particular kind. */
function ofKind(tokens: Token[], kind: TokenKind): string[] {
  return tokens.filter((token) => token.kind === kind).map((token) => token.text)
}

function line(code: string, language: CodeLanguage): Token[] {
  return tokensForLine(code, language)
}

describe('tokenizer invariants', () => {
  // Losing or reordering a character would silently corrupt what the card and
  // the export display, so this holds for every language on the picker.
  it('reproduces the source exactly, for every language', () => {
    const source = [
      "const x = 'a' // trailing",
      '# hash comment',
      '<div class="a">text</div>',
      'SELECT * FROM t -- note',
      'key: "value" # 12.5',
      '/* block */ after',
    ].join('\n')

    for (const language of CODE_LANGUAGES) {
      const rebuilt = tokenizeSnippet(source, language)
        .map((tokens) => tokens.map((token) => token.text).join(''))
        .join('\n')
      expect(rebuilt, `${language} altered the source`).toBe(source)
    }
  })

  it('returns one entry per line, including blank ones', () => {
    expect(tokenizeSnippet('a\n\nb', 'typescript')).toHaveLength(3)
    expect(tokenizeSnippet('', 'typescript')).toHaveLength(1)
  })

  it('is deterministic', () => {
    const code = "def f():\n    return 'x'  # done"
    expect(tokenizeSnippet(code, 'python')).toEqual(tokenizeSnippet(code, 'python'))
  })

  it('leaves plaintext entirely unhighlighted', () => {
    const tokens = line("const x = 'a' // not a comment here", 'plaintext')
    expect(tokens.every((token) => token.kind === 'plain')).toBe(true)
  })

  it('falls back to plain text for an unknown language', () => {
    const tokens = tokenizeSnippet('const x = 1', 'elvish' as CodeLanguage)[0]
    expect(tokens.every((token) => token.kind === 'plain')).toBe(true)
  })
})

describe('typescript and javascript', () => {
  it('colours keywords, strings, numbers and line comments', () => {
    const tokens = line("const total = 42 // sum", 'typescript')

    expect(ofKind(tokens, 'keyword')).toContain('const')
    expect(ofKind(tokens, 'number')).toContain('42')
    expect(ofKind(tokens, 'comment')).toContain('// sum')
  })

  it('treats each quote style as a string', () => {
    for (const quote of ["'a'", '"a"', '`a`']) {
      expect(ofKind(line(`x = ${quote}`, 'javascript'), 'string')).toContain(quote)
    }
  })

  it('does not end a string at an escaped quote', () => {
    expect(ofKind(line("x = 'it\\'s'", 'typescript'), 'string')).toContain("'it\\'s'")
  })

  it('carries a block comment across lines', () => {
    const lines = tokenizeSnippet('/* one\ntwo */ const a = 1', 'typescript')

    expect(ofKind(lines[0], 'comment')).toEqual(['/* one'])
    expect(ofKind(lines[1], 'comment')).toEqual(['two */'])
    expect(ofKind(lines[1], 'keyword')).toContain('const')
  })

  it('carries a template literal across lines', () => {
    const lines = tokenizeSnippet('const a = `one\ntwo` + b', 'typescript')

    expect(ofKind(lines[0], 'string')).toEqual(['`one'])
    expect(ofKind(lines[1], 'string')).toEqual(['two`'])
  })

  // A stray quote should not tint the rest of the file.
  it('does not leak an unterminated single-quote string past its line', () => {
    const lines = tokenizeSnippet("const a = 'oops\nconst b = 2", 'typescript')
    expect(ofKind(lines[1], 'keyword')).toContain('const')
  })

  it('does not treat a digit inside an identifier as a number', () => {
    expect(ofKind(line('const utf8 = 1', 'typescript'), 'number')).toEqual(['1'])
  })
})

describe('python', () => {
  it('uses # for comments and knows def and None', () => {
    const tokens = line('def run(): return None  # go', 'python')

    expect(ofKind(tokens, 'keyword')).toEqual(expect.arrayContaining(['def', 'return', 'None']))
    expect(ofKind(tokens, 'comment')).toContain('# go')
  })

  it('does not treat // as a comment', () => {
    expect(ofKind(line('x = a // b', 'python'), 'comment')).toEqual([])
  })

  it('carries a triple-quoted docstring across lines', () => {
    const lines = tokenizeSnippet('"""doc\nmore"""\nx = 1', 'python')

    expect(ofKind(lines[0], 'string')).toEqual(['"""doc'])
    expect(ofKind(lines[1], 'string')).toEqual(['more"""'])
    expect(ofKind(lines[2], 'number')).toContain('1')
  })
})

describe('json', () => {
  it('separates keys from string values', () => {
    const tokens = line('  "name": "Citadel",', 'json')

    expect(ofKind(tokens, 'keyword')).toContain('"name"')
    expect(ofKind(tokens, 'string')).toContain('"Citadel"')
  })

  it('colours literals and numbers', () => {
    const tokens = line('  "ok": true, "n": 12.5', 'json')

    expect(ofKind(tokens, 'keyword')).toContain('true')
    expect(ofKind(tokens, 'number')).toContain('12.5')
  })

  it('has no comment syntax', () => {
    expect(ofKind(line('// not json', 'json'), 'comment')).toEqual([])
  })
})

describe('html', () => {
  it('colours tag names and attribute values', () => {
    const tokens = line('<a href="/x" id=\'y\'>text</a>', 'html')

    expect(ofKind(tokens, 'keyword')).toEqual(expect.arrayContaining(['<a', '</a']))
    expect(ofKind(tokens, 'string')).toEqual(expect.arrayContaining(['"/x"', "'y'"]))
  })

  it('carries an html comment across lines', () => {
    const lines = tokenizeSnippet('<!-- one\ntwo --><p>', 'html')

    expect(ofKind(lines[0], 'comment')).toEqual(['<!-- one'])
    expect(ofKind(lines[1], 'comment')).toEqual(['two -->'])
    expect(ofKind(lines[1], 'keyword')).toContain('<p')
  })

  it('does not mistake a less-than sign for a tag', () => {
    expect(ofKind(line('if a < b then', 'html'), 'keyword')).toEqual([])
  })
})

describe('css', () => {
  it('colours the property half of a declaration', () => {
    const tokens = line('  color: #fff;', 'css')
    expect(ofKind(tokens, 'keyword')).toContain('color')
  })

  it('colours block comments and dimensions', () => {
    const tokens = line('  width: 12px; /* note */', 'css')

    expect(ofKind(tokens, 'number')).toContain('12px')
    expect(ofKind(tokens, 'comment')).toContain('/* note */')
  })

  it('knows at-rules', () => {
    expect(ofKind(line('@media screen {', 'css'), 'keyword')).toContain('@media')
  })
})

describe('bash', () => {
  it('colours shell keywords, strings and # comments', () => {
    const tokens = line('if [ -f x ]; then echo "hi"; fi  # check', 'bash')

    expect(ofKind(tokens, 'keyword')).toEqual(expect.arrayContaining(['if', 'then', 'echo', 'fi']))
    expect(ofKind(tokens, 'string')).toContain('"hi"')
    expect(ofKind(tokens, 'comment')).toContain('# check')
  })

  it('treats single quotes as literal, without escapes', () => {
    expect(ofKind(line("echo 'a\\'", 'bash'), 'string')).toContain("'a\\'")
  })
})

describe('sql', () => {
  it('matches keywords regardless of case', () => {
    expect(ofKind(line('SELECT * FROM t', 'sql'), 'keyword')).toEqual(expect.arrayContaining(['SELECT', 'FROM']))
    expect(ofKind(line('select * from t', 'sql'), 'keyword')).toEqual(expect.arrayContaining(['select', 'from']))
  })

  it('uses -- for comments and single quotes for strings', () => {
    const tokens = line("WHERE name = 'Citadel' -- note", 'sql')

    expect(ofKind(tokens, 'string')).toContain("'Citadel'")
    expect(ofKind(tokens, 'comment')).toContain('-- note')
  })
})

describe('yaml', () => {
  it('colours keys, comments and scalars', () => {
    const tokens = line('name: Citadel  # app', 'yaml')

    expect(ofKind(tokens, 'keyword')).toContain('name')
    expect(ofKind(tokens, 'comment')).toContain('# app')
  })

  it('colours booleans and numbers', () => {
    expect(ofKind(line('enabled: true', 'yaml'), 'keyword')).toContain('true')
    expect(ofKind(line('count: 12', 'yaml'), 'number')).toContain('12')
  })
})

describe('work bounds', () => {
  it('still returns one entry per line past the line cap', () => {
    const code = Array.from({ length: TOKENIZE_LIMITS.maxLines + 50 }, (_, i) => `const a${i} = ${i}`).join('\n')
    const lines = tokenizeSnippet(code, 'typescript')

    expect(lines).toHaveLength(TOKENIZE_LIMITS.maxLines + 50)
    // Past the cap the text survives, it just arrives unhighlighted.
    expect(lines[TOKENIZE_LIMITS.maxLines].every((token) => token.kind === 'plain')).toBe(true)
    expect(lines[TOKENIZE_LIMITS.maxLines].map((t) => t.text).join('')).toBe(`const a${TOKENIZE_LIMITS.maxLines} = ${TOKENIZE_LIMITS.maxLines}`)
  })

  it('emits one plain token for an absurdly long line', () => {
    const long = `const a = '${'x'.repeat(TOKENIZE_LIMITS.maxLineLength)}'`
    const tokens = tokenizeSnippet(long, 'typescript')[0]

    expect(tokens).toEqual([{ text: long, kind: 'plain' }])
  })

  it('tokenizes a large snippet in bounded time', () => {
    const code = Array.from({ length: 4000 }, (_, i) => `const value${i} = "text ${i}" // note`).join('\n')
    const started = Date.now()
    tokenizeSnippet(code, 'typescript')
    // Generous: this guards against accidental quadratic behaviour, not speed.
    expect(Date.now() - started).toBeLessThan(3000)
  })
})
