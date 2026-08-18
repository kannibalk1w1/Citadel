export const CODE_LANGUAGES = [
  'plaintext', 'typescript', 'javascript', 'python', 'json', 'html', 'css', 'bash', 'sql', 'yaml',
  // Game work: Unity, Unreal, Godot, the Lua engines, Bevy, and shaders.
  'csharp', 'cpp', 'c', 'rust', 'lua', 'gdscript', 'hlsl', 'glsl',
] as const

export type CodeLanguage = typeof CODE_LANGUAGES[number]

/**
 * How each language is written for a person. `titleCase` would give
 * "Typescript" and "Json"; these are the names the languages actually use, and
 * the picker and the Index both read them from here so they cannot disagree.
 */
export const CODE_LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  plaintext: 'Plain text',
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  python: 'Python',
  json: 'JSON',
  html: 'HTML',
  css: 'CSS',
  bash: 'Bash',
  sql: 'SQL',
  yaml: 'YAML',
  csharp: 'C#',
  cpp: 'C++',
  c: 'C',
  rust: 'Rust',
  lua: 'Lua',
  gdscript: 'GDScript',
  hlsl: 'HLSL',
  glsl: 'GLSL',
}

export function codeLanguageLabel(value: unknown): string {
  return CODE_LANGUAGE_LABELS[normalizeCodeLanguage(value)]
}

export function normalizeCodeLanguage(value: unknown): CodeLanguage {
  return typeof value === 'string' && (CODE_LANGUAGES as readonly string[]).includes(value)
    ? value as CodeLanguage
    : 'plaintext'
}

// The line-number gutter has to hold the widest number in the snippet. At the
// card's 12px mono a digit is about 7.2px wide, plus the 10px right padding;
// without this a 100+ line snippet pushed its numbers into the code.
export function gutterWidth(lineCount: number): number {
  return Math.max(28, String(Math.max(1, lineCount)).length * 8 + 12)
}

/**
 * The card's layout in CSS pixels at 100%. Image and PDF export repaint the
 * card with the 2D context rather than capturing the DOM, so these live here
 * instead of inline in the component — two copies of 32 and 1.55 would drift
 * and the export would stop looking like the card it represents.
 */
export const CODE_CARD_LAYOUT = {
  headerHeight: 32,
  fontPx: 12,
  lineHeight: 1.55,
  padX: 12,
  padY: 10,
  gutterGap: 10,
} as const

export type TokenKind = 'plain' | 'keyword' | 'string' | 'number' | 'comment'
export type Token = { text: string; kind: TokenKind }

/**
 * Work bounds. A pasted 200k-line file must not lock the renderer, and neither
 * must one absurd line. Past either limit the text is still emitted — it just
 * arrives as one plain token, so line counts and the export's gutter maths stay
 * exactly right while the scanning cost stops growing.
 */
export const TOKENIZE_LIMITS = {
  maxLines: 5000,
  maxLineLength: 2000,
} as const

// ── Language specs ────────────────────────────────────────────────────────────

type StringRule = {
  open: string
  close: string
  /** Backslash escapes the close delimiter. */
  escape?: boolean
  /** The literal may run past the end of the line. */
  multiline?: boolean
}

type LanguageSpec = {
  lineComments: string[]
  blockComment?: { open: string; close: string }
  strings: StringRule[]
  keywords?: Set<string>
  /** Keywords match regardless of case (SQL). */
  caseInsensitiveKeywords?: boolean
  numbers: boolean
  /** Promotes an identifier or string that a `:` follows to a keyword. */
  colonKeys?: boolean
  /** Markup mode: tag names read as keywords, `<!-- -->` as comments. */
  markup?: boolean
}

const words = (source: string): Set<string> => new Set(source.split(/\s+/).filter(Boolean))

const JS_KEYWORDS = words(`
  as async await break case catch class const continue debugger default delete do else enum export
  extends false finally for from function get if implements import in instanceof interface let new
  null of package private protected public readonly return satisfies set static super switch this
  throw true try type typeof undefined var void while with yield
`)

const PYTHON_KEYWORDS = words(`
  and as assert async await break class continue def del elif else except False finally for from
  global if import in is lambda None nonlocal not or pass raise return True try while with yield
  self match case
`)

const BASH_KEYWORDS = words(`
  if then else elif fi for while until do done case esac function in select time coproc
  echo cd export local return exit set unset source alias read shift trap eval exec printf
  true false test
`)

const SQL_KEYWORDS = words(`
  select from where insert into values update set delete create table alter drop index view
  join inner left right full outer on group by order having limit offset union all distinct
  as and or not null is in like between exists case when then else end asc desc primary key
  foreign references default unique constraint with returning
`)

const CSHARP_KEYWORDS = words(`
  abstract as async await base bool break byte case catch char checked class const continue decimal
  default delegate do double else enum event explicit extern false finally fixed float for foreach
  get goto if implicit in int interface internal is lock long namespace new null object operator out
  override params private protected public readonly ref return sbyte sealed set short sizeof
  stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe
  ushort using var virtual void volatile while yield record var nameof when where
`)

// Unreal and engine C++. Includes the C keywords, so the C spec reuses this.
const CPP_KEYWORDS = words(`
  alignas alignof and asm auto bool break case catch char class compl concept const consteval
  constexpr const_cast continue co_await co_return co_yield decltype default delete do double
  dynamic_cast else enum explicit export extern false float for friend goto if inline int long
  mutable namespace new noexcept not nullptr operator or private protected public register
  reinterpret_cast requires return short signed sizeof static static_assert static_cast struct
  switch template this thread_local throw true try typedef typeid typename union unsigned using
  virtual void volatile wchar_t while xor include define ifdef ifndef endif pragma
`)

const RUST_KEYWORDS = words(`
  as async await break const continue crate dyn else enum extern false fn for if impl in let loop
  match mod move mut pub ref return self Self static struct super trait true type unsafe use where
  while abstract become box do final macro override priv typeof unsized virtual yield
`)

const LUA_KEYWORDS = words(`
  and break do else elseif end false for function goto if in local nil not or repeat return then
  true until while self
`)

// Godot. Close to Python, with the engine's own additions.
const GDSCRIPT_KEYWORDS = words(`
  and as assert await break breakpoint class class_name const continue elif else enum export
  extends false for func if in is match not null onready or pass preload print range return
  self setget signal static super tool true var void while yield PI TAU INF NAN
`)

// Shared by HLSL and GLSL: the C-like core plus the vector and matrix types and
// the qualifiers that make shader code readable at a glance.
const SHADER_KEYWORDS = words(`
  attribute break case const continue default discard do else false for if in inout out precision
  return struct switch true uniform varying void while layout flat smooth noperspective centroid
  bool int uint float double vec2 vec3 vec4 bvec2 bvec3 bvec4 ivec2 ivec3 ivec4 uvec2 uvec3 uvec4
  mat2 mat3 mat4 sampler1D sampler2D sampler3D samplerCube texture2D texture3D
  float2 float3 float4 int2 int3 int4 half half2 half3 half4 matrix float2x2 float3x3 float4x4
  cbuffer register SV_POSITION SV_Target Texture2D SamplerState technique pass
  gl_Position gl_FragColor gl_FragCoord gl_PointSize
`)

const CSS_AT_KEYWORDS = words(`
  media supports keyframes import charset font-face namespace page layer container property
`)

const PLAIN_SPEC: LanguageSpec = { lineComments: [], strings: [], numbers: false }

const SPECS: Record<CodeLanguage, LanguageSpec> = {
  plaintext: PLAIN_SPEC,
  typescript: {
    lineComments: ['//'],
    blockComment: { open: '/*', close: '*/' },
    strings: [
      { open: "'", close: "'", escape: true },
      { open: '"', close: '"', escape: true },
      { open: '`', close: '`', escape: true, multiline: true },
    ],
    keywords: JS_KEYWORDS,
    numbers: true,
  },
  javascript: {
    lineComments: ['//'],
    blockComment: { open: '/*', close: '*/' },
    strings: [
      { open: "'", close: "'", escape: true },
      { open: '"', close: '"', escape: true },
      { open: '`', close: '`', escape: true, multiline: true },
    ],
    keywords: JS_KEYWORDS,
    numbers: true,
  },
  python: {
    lineComments: ['#'],
    strings: [
      { open: '"""', close: '"""', multiline: true },
      { open: "'''", close: "'''", multiline: true },
      { open: "'", close: "'", escape: true },
      { open: '"', close: '"', escape: true },
    ],
    keywords: PYTHON_KEYWORDS,
    numbers: true,
  },
  json: {
    lineComments: [],
    strings: [{ open: '"', close: '"', escape: true }],
    keywords: words('true false null'),
    numbers: true,
    colonKeys: true,
  },
  html: {
    lineComments: [],
    blockComment: { open: '<!--', close: '-->' },
    strings: [
      { open: '"', close: '"', escape: true },
      { open: "'", close: "'", escape: true },
    ],
    numbers: false,
    markup: true,
  },
  css: {
    lineComments: [],
    blockComment: { open: '/*', close: '*/' },
    strings: [
      { open: '"', close: '"', escape: true },
      { open: "'", close: "'", escape: true },
    ],
    keywords: CSS_AT_KEYWORDS,
    numbers: true,
    colonKeys: true,
  },
  bash: {
    lineComments: ['#'],
    strings: [
      { open: '"', close: '"', escape: true },
      { open: "'", close: "'" },
    ],
    keywords: BASH_KEYWORDS,
    numbers: true,
  },
  sql: {
    lineComments: ['--'],
    blockComment: { open: '/*', close: '*/' },
    strings: [
      { open: "'", close: "'", escape: true },
      { open: '"', close: '"', escape: true },
    ],
    keywords: SQL_KEYWORDS,
    caseInsensitiveKeywords: true,
    numbers: true,
  },
  yaml: {
    lineComments: ['#'],
    strings: [
      { open: '"', close: '"', escape: true },
      { open: "'", close: "'", escape: true },
    ],
    keywords: words('true false null yes no on off'),
    numbers: true,
    colonKeys: true,
  },

  // ── Game work ──────────────────────────────────────────────────────────────
  // C-family engines share one shape: // and /* */, escaped single and double
  // quotes, numbers. What differs is the keyword set, so that is all that
  // varies below.
  csharp: {
    lineComments: ['//'],
    blockComment: { open: '/*', close: '*/' },
    strings: [
      // Verbatim strings (@"C:\path") open on the quote, so the ordinary rule
      // covers them; what it cannot do is honour their doubled-quote escaping.
      { open: '"', close: '"', escape: true },
      { open: "'", close: "'", escape: true },
    ],
    keywords: CSHARP_KEYWORDS,
    numbers: true,
  },
  cpp: {
    lineComments: ['//'],
    blockComment: { open: '/*', close: '*/' },
    strings: [
      { open: '"', close: '"', escape: true },
      { open: "'", close: "'", escape: true },
    ],
    keywords: CPP_KEYWORDS,
    numbers: true,
  },
  c: {
    lineComments: ['//'],
    blockComment: { open: '/*', close: '*/' },
    strings: [
      { open: '"', close: '"', escape: true },
      { open: "'", close: "'", escape: true },
    ],
    keywords: CPP_KEYWORDS,
    numbers: true,
  },
  rust: {
    lineComments: ['//'],
    blockComment: { open: '/*', close: '*/' },
    strings: [
      { open: '"', close: '"', escape: true, multiline: true },
      { open: "'", close: "'", escape: true },
    ],
    keywords: RUST_KEYWORDS,
    numbers: true,
  },
  lua: {
    lineComments: ['--'],
    // Lua's block comment is --[[ ]], which starts with the line comment. The
    // scanner tries the block form first, so the longer match wins.
    blockComment: { open: '--[[', close: ']]' },
    strings: [
      { open: '[[', close: ']]', multiline: true },
      { open: '"', close: '"', escape: true },
      { open: "'", close: "'", escape: true },
    ],
    keywords: LUA_KEYWORDS,
    numbers: true,
  },
  gdscript: {
    lineComments: ['#'],
    strings: [
      { open: '"""', close: '"""', multiline: true },
      { open: '"', close: '"', escape: true },
      { open: "'", close: "'", escape: true },
    ],
    keywords: GDSCRIPT_KEYWORDS,
    numbers: true,
  },
  hlsl: {
    lineComments: ['//'],
    blockComment: { open: '/*', close: '*/' },
    strings: [{ open: '"', close: '"', escape: true }],
    keywords: SHADER_KEYWORDS,
    numbers: true,
  },
  glsl: {
    lineComments: ['//'],
    blockComment: { open: '/*', close: '*/' },
    strings: [{ open: '"', close: '"', escape: true }],
    keywords: SHADER_KEYWORDS,
    numbers: true,
  },
}

// ── Scanner ───────────────────────────────────────────────────────────────────

/** Carried between lines so block comments and multi-line strings survive. */
type ScanState =
  | { mode: 'code' }
  | { mode: 'block-comment' }
  | { mode: 'string'; rule: StringRule }

const IDENT_START = /[A-Za-z_$@-]/
const IDENT_PART = /[\w$-]/
const DIGIT = /[0-9]/

// Sticky rather than anchored, so they can be matched at an offset into the
// line instead of against a freshly sliced tail. `lastIndex` is set at every
// use; nothing reads it between.
const TAG_RE = /<\/?[A-Za-z][\w:-]*/y
const NUMBER_RE = /\d[\d_]*(\.\d+)?([eE][+-]?\d+)?[a-zA-Z%]*/y

/**
 * A spec's string rules, longest opener first, computed once.
 *
 * The order matters — Python's `'''` has to be tried before `'` — but the sort
 * was inside the character loop, so a snippet at the documented ceiling
 * (5000 lines x 2000 characters) copied and sorted this list ten million times.
 * Specs are module constants, so one cached list per spec is all that is needed.
 */
const sortedStringRuleCache = new WeakMap<LanguageSpec, StringRule[]>()

function sortedStringRules(spec: LanguageSpec): StringRule[] {
  const cached = sortedStringRuleCache.get(spec)
  if (cached) return cached
  const sorted = [...spec.strings].sort((a, b) => b.open.length - a.open.length)
  sortedStringRuleCache.set(spec, sorted)
  return sorted
}

function pushToken(tokens: Token[], text: string, kind: TokenKind): void {
  if (!text) return
  const last = tokens[tokens.length - 1]
  if (last && last.kind === kind) last.text += text
  else tokens.push({ text, kind })
}

/**
 * `keyBoundary` is the index of the line's first `:` when the language marks
 * key/value pairs, or -1. Anything closing at or before it is the key half.
 * Decided here rather than in a post-pass because adjacent same-kind tokens are
 * merged on the way out — by then the whole line can be a single token.
 */
function scanLine(line: string, spec: LanguageSpec, state: { current: ScanState }, keyBoundary = -1): Token[] {
  const tokens: Token[] = []
  let i = 0

  // Resume an unterminated construct from the previous line.
  if (state.current.mode === 'block-comment') {
    const close = spec.blockComment!.close
    const end = line.indexOf(close)
    if (end === -1) {
      pushToken(tokens, line, 'comment')
      return tokens
    }
    pushToken(tokens, line.slice(0, end + close.length), 'comment')
    state.current = { mode: 'code' }
    i = end + close.length
  } else if (state.current.mode === 'string') {
    const rule = state.current.rule
    const end = findClose(line, 0, rule)
    if (end === -1) {
      pushToken(tokens, line, 'string')
      return tokens
    }
    pushToken(tokens, line.slice(0, end + rule.close.length), 'string')
    state.current = { mode: 'code' }
    i = end + rule.close.length
  }

  // Longest opener first, so Python's ''' wins over '. Sorted once per spec:
  // this used to copy and sort the rule list on every character of every line.
  const stringRules = sortedStringRules(spec)

  while (i < line.length) {
    // Everything below tests `line` at `i` rather than slicing a tail off it.
    // A per-character `line.slice(i)` is quadratic in the line length, which
    // the 2000-character limit was papering over rather than fixing.
    const lineComment = spec.lineComments.some((marker) => line.startsWith(marker, i))
    if (lineComment) {
      pushToken(tokens, line.slice(i), 'comment')
      return tokens
    }

    if (spec.blockComment && line.startsWith(spec.blockComment.open, i)) {
      const close = spec.blockComment.close
      const end = line.indexOf(close, i + spec.blockComment.open.length)
      if (end === -1) {
        pushToken(tokens, line.slice(i), 'comment')
        state.current = { mode: 'block-comment' }
        return tokens
      }
      pushToken(tokens, line.slice(i, end + close.length), 'comment')
      i = end + close.length
      continue
    }

    const rule = stringRules.find((candidate) => line.startsWith(candidate.open, i))
    if (rule) {
      const end = findClose(line, i + rule.open.length, rule)
      if (end === -1) {
        pushToken(tokens, line.slice(i), 'string')
        // Only a multiline literal stays open; anything else was simply
        // unterminated on this line and should not colour the rest of the file.
        if (rule.multiline) state.current = { mode: 'string', rule }
        return tokens
      }
      const closeAt = end + rule.close.length
      pushToken(tokens, line.slice(i, closeAt), keyBoundary >= 0 && closeAt <= keyBoundary ? 'keyword' : 'string')
      i = closeAt
      continue
    }

    if (spec.markup && line.startsWith('<', i)) {
      // Sticky, so it anchors at `i` the way `^` anchored a fresh slice.
      TAG_RE.lastIndex = i
      const tag = TAG_RE.exec(line)
      if (tag) {
        pushToken(tokens, tag[0], 'keyword')
        i += tag[0].length
        continue
      }
    }

    const char = line[i]

    if (spec.numbers && DIGIT.test(char) && !IDENT_PART.test(line[i - 1] ?? '')) {
      NUMBER_RE.lastIndex = i
      const number = NUMBER_RE.exec(line)
      if (number) {
        pushToken(tokens, number[0], 'number')
        i += number[0].length
        continue
      }
    }

    if (IDENT_START.test(char)) {
      let end = i + 1
      while (end < line.length && IDENT_PART.test(line[end])) end += 1
      const word = line.slice(i, end)
      const lookup = spec.caseInsensitiveKeywords ? word.toLowerCase() : word
      const isKeyword = spec.keywords?.has(lookup)
        || (spec.keywords?.has(lookup.replace(/^@/, '')) && word.startsWith('@'))
      const isKey = keyBoundary >= 0 && end <= keyBoundary
      pushToken(tokens, word, isKeyword || isKey ? 'keyword' : 'plain')
      i = end
      continue
    }

    pushToken(tokens, char, 'plain')
    i += 1
  }

  return tokens
}

/** Index of the closing delimiter at or after `from`, honouring escapes. */
function findClose(line: string, from: number, rule: StringRule): number {
  let i = from
  while (i < line.length) {
    if (rule.escape && line[i] === '\\') {
      i += 2
      continue
    }
    if (line.startsWith(rule.close, i)) return i
    i += 1
  }
  return -1
}

/**
 * Tokenizes a whole snippet, one entry per line. Whole-snippet rather than
 * per-line because block comments and multi-line strings need state carried
 * across lines, and because the live card and the export must be given exactly
 * the same tokens — they both call this.
 */
export function tokenizeSnippet(code: string, language: CodeLanguage = 'plaintext'): Token[][] {
  const spec = SPECS[language] ?? PLAIN_SPEC
  const lines = code.split('\n')
  const state: { current: ScanState } = { current: { mode: 'code' } }

  return lines.map((line, index) => {
    if (index >= TOKENIZE_LIMITS.maxLines || line.length > TOKENIZE_LIMITS.maxLineLength) {
      return line ? [{ text: line, kind: 'plain' as TokenKind }] : []
    }
    // Only a line that starts in code can open a key/value pair; a line still
    // inside a block comment or multi-line string has no key half.
    const keyBoundary = spec.colonKeys && state.current.mode === 'code' ? line.indexOf(':') : -1
    return scanLine(line, spec, state, keyBoundary)
  })
}

/** Single line, no carried state. Convenience for callers with one line. */
export function tokensForLine(line: string, language: CodeLanguage = 'plaintext'): Token[] {
  return tokenizeSnippet(line, language)[0] ?? []
}
