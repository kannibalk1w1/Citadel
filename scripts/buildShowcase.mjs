/**
 * Builds examples/showcase.citadel — one project that exercises every feature.
 *
 * Run: node scripts/buildShowcase.mjs   (needs ffmpeg on PATH)
 *
 * The showcase doubles as onboarding, so it is generated rather than
 * hand-edited: a saved-from-the-app project would drift silently as the format
 * moves, while this script fails loudly and regenerates. showcase.test.ts
 * checks the output still covers everything the app can do.
 *
 * Media is synthesised by ffmpeg from its own generators — gradients, test
 * patterns, a sine tone — so every byte is original and carries no third-party
 * licence. It rides inside the project as data: URIs, which pathToUrl passes
 * through untouched and the save path leaves alone, so the whole showcase is a
 * single self-contained file with no assets to lose.
 */
import { execFileSync } from 'child_process'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// Fixed so regenerating produces a stable diff rather than churn.
const CREATED_AT = Date.UTC(2026, 7, 18)

const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args])

function buildMedia() {
  const dir = mkdtempSync(join(tmpdir(), 'citadel-showcase-'))
  const at = (name) => join(dir, name)
  ff(['-f', 'lavfi', '-i', 'gradients=s=200x140:d=1:c0=0x14324f:c1=0x2f6c8f', '-frames:v', '1', at('reference.png')])
  ff(['-f', 'lavfi', '-i', 'gradients=s=200x140:d=1:c0=0x4f2414:c1=0x8f5a2f', '-frames:v', '1', at('reference-b.png')])
  ff(['-f', 'lavfi', '-i', 'testsrc2=s=120x90:r=8:d=1', '-loop', '0', at('loop.gif')])
  ff(['-f', 'lavfi', '-i', 'smptebars=s=160x120:r=12:d=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '40', at('clip.mp4')])
  ff(['-f', 'lavfi', '-i', 'sine=f=220:d=2', '-ac', '1', '-ar', '8000', '-b:a', '32k', at('tone.mp3')])
  writeFileSync(at('cube.obj'), [
    'o showcase-cube',
    'v -1 -1 -1', 'v 1 -1 -1', 'v 1 1 -1', 'v -1 1 -1',
    'v -1 -1 1', 'v 1 -1 1', 'v 1 1 1', 'v -1 1 1',
    'f 1 2 3 4', 'f 5 6 7 8', 'f 1 2 6 5', 'f 2 3 7 6', 'f 3 4 8 7', 'f 4 1 5 8', '',
  ].join('\n'))

  const uri = (name, mime) => `data:${mime};base64,${readFileSync(at(name)).toString('base64')}`
  const media = {
    imageA: uri('reference.png', 'image/png'),
    imageB: uri('reference-b.png', 'image/png'),
    gif: uri('loop.gif', 'image/gif'),
    video: uri('clip.mp4', 'video/mp4'),
    audio: uri('tone.mp3', 'audio/mpeg'),
    model: uri('cube.obj', 'model/obj'),
  }
  rmSync(dir, { recursive: true, force: true })
  return media
}

const media = buildMedia()

let z = 0
const item = (id, type, x, y, width, height, extra = {}) => ({
  id, type, x, y, width, height,
  rotation: 0, zIndex: (z += 1),
  locked: false, visible: true, opacity: 1,
  tags: [], ...extra,
})

const thread = (id, fromId, toId, extra = {}) => ({
  id, fromId, toId,
  fromAnchor: 'auto', toAnchor: 'auto',
  style: 'bezier', color: '#73a8db', width: 2,
  arrowHead: 'arrow', dashed: false, ...extra,
})

// ── Board 1 — the one that opens ────────────────────────────────────────────
const startItems = [
  item('start-title', 'text', 0, 0, 560, 60, {
    meta: { content: 'Welcome to Citadel', fontSize: 34, align: 'left' },
    tags: ['start'],
  }),
  item('start-lede', 'text', 0, 70, 560, 90, {
    meta: {
      content: 'This project is a working tour. Every board shows something the app does — open the tabs above, and read the notes as you go.',
      fontSize: 15, align: 'left',
    },
  }),
  item('start-move', 'sticky', 0, 190, 250, 150, {
    meta: { content: 'Move around\n\nHold Space and drag to pan. Wheel to zoom. Press F to fit the board to the window.', color: '#1d2a35' },
    tags: ['start', 'basics'],
  }),
  item('start-tools', 'sticky', 270, 190, 250, 150, {
    meta: { content: 'Pick a tool\n\nV select, C connect, N note, T text, K link. The toolbar names them all, and every one is rebindable in Settings.', color: '#1d2a35' },
    tags: ['start', 'basics'],
  }),
  item('start-connect', 'sticky', 540, 190, 250, 150, {
    meta: { content: 'Join things up\n\nWith C, drag from one item to another. Give the connection a meaning so the link still says something later.', color: '#1d2a35' },
    tags: ['start', 'basics'],
  }),
  item('start-find', 'sticky', 0, 370, 250, 150, {
    meta: { content: 'Find anything\n\nThe Index searches every board at once — text, notes, tags, code and connections. Ctrl+K opens the command palette.', color: '#1d2a35' },
    tags: ['start'],
  }),
  item('start-review', 'sticky', 270, 370, 250, 150, {
    meta: { content: 'Look again\n\nY cycles the vision checks. Shift+D runs a timed study session. Shift+T scrubs the board back through its own history.', color: '#1d2a35' },
    tags: ['start', 'review'],
  }),
  item('start-link', 'sticky', 540, 370, 250, 150, {
    meta: { content: 'Anything can carry a link\n\nThis note opens the Citadel repository with the K tool. Only http, https and mailto are ever opened.', color: '#1d2a35' },
    link: 'https://github.com/kannibalk1w1/Citadel',
    tags: ['start'],
  }),
  item('start-comment', 'sticky', 820, 190, 210, 120, {
    meta: {
      kind: 'comment', attachedTo: 'start-connect', content: 'Comment pins attach to an item and travel with it. Ctrl+Shift+M adds one.',
      color: '#241d16', fontSize: 13, align: 'left', fontStyle: 'normal',
    },
  }),
]

const startThreads = [
  thread('start-t1', 'start-title', 'start-lede', { meaning: 'sequence', style: 'straight', arrowHead: 'arrow', label: 'read on' }),
  thread('start-t2', 'start-lede', 'start-move', { meaning: 'reference', style: 'elbow', arrowHead: 'dot', dashed: true }),
  thread('start-t3', 'start-move', 'start-tools', { meaning: 'sequence', arrowHead: 'diamond' }),
  thread('start-t4', 'start-tools', 'start-connect', { meaning: 'sequence', arrowHead: 'none' }),
]

// ── Board 2 — media ─────────────────────────────────────────────────────────
const mediaItems = [
  item('media-title', 'text', 0, 0, 520, 46, { meta: { content: 'Media on the board', fontSize: 26, align: 'left' } }),
  item('media-note', 'sticky', 0, 60, 260, 130, {
    meta: { content: 'Drag files straight onto the canvas. Everything here was generated by the build script, so the file carries no outside assets.', color: '#1d2a35' },
  }),
  item('media-image', 'image', 290, 60, 200, 140, { src: media.imageA, tags: ['media', 'reference'] }),
  item('media-gif', 'gif', 520, 60, 180, 135, { src: media.gif, tags: ['media'] }),
  item('media-video', 'video', 730, 60, 240, 180, { src: media.video, tags: ['media'] }),
  item('media-audio', 'audio', 290, 230, 320, 90, { src: media.audio, tags: ['media'] }),
  item('media-model', 'model3d', 640, 260, 220, 220, { src: media.model, tags: ['media'] }),
  item('media-youtube', 'youtube', 0, 340, 280, 170, {
    src: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    tags: ['media'],
  }),
  item('media-youtube-note', 'sticky', 0, 520, 280, 110, {
    meta: { content: 'The embed points at Big Buck Bunny — Blender Foundation, CC-BY. Paste any YouTube URL to replace it.', color: '#1d2a35' },
  }),
  item('media-comparison', 'comparison', 290, 340, 320, 220, {
    meta: { srcA: media.imageA, srcB: media.imageB, splitX: 0.5 },
    tags: ['media', 'compare'],
  }),
  item('media-compare-note', 'sticky', 290, 580, 320, 90, {
    meta: { content: 'A comparison item wipes between two images. Drag the divider to judge one against the other.', color: '#1d2a35' },
  }),
]

const mediaThreads = [
  thread('media-t1', 'media-image', 'media-comparison', { meaning: 'source', label: 'left half' }),
  thread('media-t2', 'media-gif', 'media-video', { meaning: 'echo', dashed: true, arrowHead: 'dot' }),
  thread('media-t3', 'media-audio', 'media-model', { meaning: 'inspiration', style: 'elbow' }),
]

// ── Board 3 — notes, text and code ──────────────────────────────────────────
const LANGUAGE_SAMPLES = [
  ['typescript', "export const greet = (name: string): string => `hello ${name}`"],
  ['javascript', "const greet = (name) => `hello ${name}`\nconsole.log(greet('citadel'))"],
  ['python', "def greet(name: str) -> str:\n    return f'hello {name}'"],
  ['json', '{\n  "format": "citadel-theme",\n  "version": 1\n}'],
  ['html', '<section class="board">\n  <h1>Citadel</h1>\n</section>'],
  ['css', ':root {\n  --bg-canvas: #111214;\n}'],
  ['bash', 'npm run dev\nnpm run typecheck'],
  ['sql', 'select name, tags\nfrom relics\nwhere board = $1;'],
  ['yaml', 'name: citadel\non:\n  push:\n    tags: ["v*"]'],
  ['plaintext', 'A code card set to plaintext is just a monospace block.'],
  // Game work, which is a large part of who this is for.
  ['csharp', 'public class Player : MonoBehaviour\n{\n    void Update() => transform.Translate(Vector3.forward);\n}'],
  ['cpp', '#include "GameFramework/Actor.h"\n\nvoid AGate::BeginPlay()\n{\n    Super::BeginPlay();\n}'],
  ['c', '#include <raylib.h>\n\nint main(void) {\n    InitWindow(800, 450, "citadel");\n}'],
  ['rust', 'fn spawn(mut commands: Commands) {\n    commands.spawn(Camera2dBundle::default());\n}'],
  ['lua', '-- love2d\nfunction love.draw()\n  love.graphics.print("Citadel", 16, 16)\nend'],
  ['gdscript', 'extends Node2D\n\nfunc _ready() -> void:\n    print("ready")'],
  ['hlsl', 'float4 frag(v2f i) : SV_Target\n{\n    return tex2D(_MainTex, i.uv) * _Tint;\n}'],
  ['glsl', 'uniform vec4 tint;\n\nvoid main() {\n    gl_FragColor = texture2D(tex, uv) * tint;\n}'],
]

const codeItems = [
  item('code-title', 'text', 0, 0, 520, 46, { meta: { content: 'Notes, text and code', fontSize: 26, align: 'left' } }),
  item('code-text-centre', 'text', 0, 60, 340, 40, { meta: { content: 'Text can be centred', fontSize: 18, align: 'center' } }),
  item('code-text-right', 'text', 0, 110, 340, 40, { meta: { content: 'or set to the right', fontSize: 18, align: 'right' } }),
  item('code-sticky', 'sticky', 0, 170, 340, 120, {
    meta: { content: 'Notes hold a thought. They wrap, resize, and are searchable from the Index.', color: '#243024' },
    tags: ['notes'],
  }),
  item('code-swatch-warm', 'swatch', 0, 310, 340, 80, {
    meta: { colors: ['#2f1b14', '#7a4326', '#c98d5a', '#e8c9a0', '#f4e6d2'] },
    tags: ['palette'],
  }),
  item('code-swatch-cool', 'swatch', 0, 400, 340, 80, {
    meta: { colors: ['#0f1c26', '#1d3a4f', '#3a6f91', '#79aecb', '#c3e2f0'] },
    tags: ['palette'],
  }),
  item('code-swatch-note', 'sticky', 0, 490, 340, 100, {
    meta: { content: 'Swatches hold a palette. An image can hand you one directly — see the Research board.', color: '#243024' },
  }),
  ...LANGUAGE_SAMPLES.map(([language, code], index) => item(
    `code-${language}`, 'code',
    380 + (index % 3) * 360, 60 + Math.floor(index / 3) * 220,
    340, 200,
    { meta: { code, language }, tags: ['code', language] },
  )),
]

const codeThreads = [
  thread('code-t1', 'code-typescript', 'code-javascript', { meaning: 'echo', label: 'same idea' }),
  thread('code-t2', 'code-sticky', 'code-typescript', { meaning: 'question', dashed: true }),
  thread('code-t3', 'code-swatch-warm', 'code-swatch-cool', { meaning: 'contradiction', arrowHead: 'diamond' }),
]

// ── Board 4 — research, captures and the rest of the meanings ───────────────
const researchItems = [
  item('res-title', 'text', 0, 0, 560, 46, { meta: { content: 'Research and sources', fontSize: 26, align: 'left' } }),
  item('res-image', 'image', 0, 70, 260, 182, { src: media.imageA, tags: ['research', 'source'] }),
  item('res-capture-1', 'sticky', 300, 70, 300, 150, {
    meta: {
      kind: 'source-capture',
      content: 'The gradient holds its value structure even in greyscale — worth testing with the Value vision check.',
      color: '#1a2430',
      capturedAt: CREATED_AT,
      source: {
        reference: 'Reference gradient, showcase board',
        locator: 'upper left quadrant',
        sourceItemId: 'res-image',
        region: { x: 0.05, y: 0.08, width: 0.4, height: 0.35 },
      },
    },
    tags: ['research'],
  }),
  item('res-capture-2', 'sticky', 300, 240, 300, 150, {
    meta: {
      kind: 'source-capture',
      content: 'Second capture from the same image, anchored lower down. An image lists every capture taken from it.',
      color: '#1a2430',
      capturedAt: CREATED_AT + 1000,
      source: {
        reference: 'Reference gradient, showcase board',
        locator: 'lower band',
        sourceItemId: 'res-image',
        region: { x: 0.2, y: 0.6, width: 0.5, height: 0.3 },
      },
    },
    tags: ['research'],
  }),
  item('res-capture-web', 'sticky', 300, 410, 300, 130, {
    meta: {
      kind: 'source-capture',
      content: 'A capture can cite something with no image behind it at all — a page, a book, a conversation.',
      color: '#1a2430',
      capturedAt: CREATED_AT + 2000,
      source: { reference: 'https://github.com/kannibalk1w1/Citadel', locator: 'README, “What it can do”' },
    },
    tags: ['research'],
  }),
  item('res-claim', 'sticky', 640, 70, 280, 130, {
    meta: { content: 'Claim: the palette reads at thumbnail size.', color: '#2b241a' },
    tags: ['research'],
  }),
  item('res-proof', 'sticky', 640, 220, 280, 130, {
    meta: { content: 'Squint check agrees — the composition survives the blur.', color: '#243024' },
    tags: ['research'],
  }),
  item('res-counter', 'sticky', 640, 370, 280, 130, {
    meta: { content: 'But the two blues collapse into one under Deuteranopia.', color: '#302424' },
    tags: ['research'],
  }),
  item('res-warning', 'sticky', 640, 520, 280, 110, {
    meta: { content: 'Do not ship the palette until that is resolved.', color: '#302424' },
    tags: ['research'],
  }),
  item('res-memory', 'sticky', 960, 70, 260, 130, {
    meta: { content: 'This is the same problem the first board hit last winter.', color: '#1d2a35' },
    tags: ['research'],
  }),
  item('res-locked', 'sticky', 960, 220, 260, 110, {
    meta: { content: 'This note is locked and cannot be moved until you unlock it.', color: '#1d2a35' },
    locked: true,
  }),
  item('res-faded', 'sticky', 960, 350, 260, 110, {
    meta: { content: 'Opacity and rotation are per item, like everything else here.', color: '#1d2a35' },
    opacity: 0.55, rotation: -4,
  }),
  item('res-tinted', 'image', 960, 480, 200, 140, {
    src: media.imageB,
    tint: { color: '#73a8db', opacity: 0.35 },
    tags: ['research'],
  }),
]

// Every meaning the app defines appears at least once across the project.
const researchThreads = [
  thread('res-t1', 'res-image', 'res-capture-1', { meaning: 'source', label: 'captured from' }),
  thread('res-t2', 'res-image', 'res-capture-2', { meaning: 'source' }),
  thread('res-t3', 'res-capture-1', 'res-claim', { meaning: 'proof', arrowHead: 'diamond' }),
  thread('res-t4', 'res-claim', 'res-proof', { meaning: 'proof', style: 'straight' }),
  thread('res-t5', 'res-claim', 'res-counter', { meaning: 'contradiction', dashed: true, color: '#d67878' }),
  thread('res-t6', 'res-counter', 'res-warning', { meaning: 'warning', color: '#d67878', width: 3 }),
  thread('res-t7', 'res-claim', 'res-memory', { meaning: 'memory', style: 'elbow' }),
  thread('res-t8', 'res-capture-web', 'res-claim', { meaning: 'reference', dashed: true }),
  thread('res-t9', 'res-proof', 'res-tinted', { meaning: 'inspiration' }),
  thread('res-t10', 'res-warning', 'res-locked', { meaning: 'question', arrowHead: 'none' }),
  thread('res-t11', 'res-memory', 'res-faded', { meaning: 'echo', style: 'straight', dashed: true }),
]

const project = {
  version: '1.0.0',
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  activeBoardId: 'board-start',
  boards: [
    {
      id: 'board-start', name: 'Start here',
      items: startItems, connections: startThreads,
      viewport: { x: 120, y: 90, scale: 0.9 },
      meta: {
        mood: 'gothic',
        waystones: [
          { id: 'ws-1', name: 'The basics', x: 0, y: 190, scale: 1 },
          { id: 'ws-2', name: 'Links and comments', x: 540, y: 190, scale: 1 },
        ],
      },
    },
    {
      id: 'board-media', name: 'Media',
      items: mediaItems, connections: mediaThreads,
      viewport: { x: 80, y: 60, scale: 0.85 },
      meta: { mood: 'frost' },
    },
    {
      id: 'board-code', name: 'Notes and code',
      items: codeItems, connections: codeThreads,
      viewport: { x: 60, y: 60, scale: 0.75 },
      meta: { mood: 'verdant' },
    },
    {
      id: 'board-research', name: 'Research',
      items: researchItems, connections: researchThreads,
      viewport: { x: 60, y: 60, scale: 0.8 },
      meta: {
        mood: 'aurum',
        waystones: [{ id: 'ws-3', name: 'The contradiction', x: 640, y: 370, scale: 1.2 }],
      },
    },
    {
      id: 'board-empty', name: 'Your turn',
      items: [
        item('yours-note', 'text', 0, 0, 460, 120, {
          meta: { content: 'An empty board, for whatever you came here to do.', fontSize: 20, align: 'left' },
        }),
      ],
      connections: [],
      viewport: { x: 200, y: 160, scale: 1 },
      meta: { mood: 'umbral' },
    },
  ],
  recordings: [],
}

const out = join(root, 'examples', 'showcase.citadel')
writeFileSync(out, `${JSON.stringify(project, null, 2)}\n`)

const bytes = readFileSync(out).length
const items = project.boards.reduce((n, b) => n + b.items.length, 0)
const threads = project.boards.reduce((n, b) => n + b.connections.length, 0)
console.log(`wrote ${out}`)
console.log(`${project.boards.length} boards · ${items} items · ${threads} connections · ${(bytes / 1024).toFixed(0)} kB`)
