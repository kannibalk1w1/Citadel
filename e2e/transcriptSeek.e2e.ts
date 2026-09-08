import { expect, test } from '@playwright/test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { closeCitadel, launchCitadel, openBoard, type CitadelSession } from './harness'

const BOARD_ID = 'transcript-board'
const AUDIO_ID = 'source-audio'
const TRANSCRIPT_ID = 'source-transcript'
const SEEK_SECONDS = 3

let session: CitadelSession | undefined
let fixtureDir: string | undefined
let profileDir: string | undefined

/** A small valid PCM WAV; it is deliberately generated inside this test's temp tree. */
function wavFixture(durationSeconds: number): Buffer {
  const sampleRate = 8_000
  const channels = 1
  const bitsPerSample = 16
  const dataSize = sampleRate * durationSeconds * channels * (bitsPerSample / 8)
  const header = Buffer.alloc(44)
  header.write('RIFF', 0, 'ascii')
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE', 8, 'ascii')
  header.write('fmt ', 12, 'ascii')
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28)
  header.writeUInt16LE(channels * (bitsPerSample / 8), 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36, 'ascii')
  header.writeUInt32LE(dataSize, 40)
  return Buffer.concat([header, Buffer.alloc(dataSize)])
}

function item(id: string, type: 'audio' | 'text', x: number, y: number, width: number, height: number, src: string, meta?: Record<string, unknown>) {
  return {
    id, type, x, y, width, height, rotation: 0, zIndex: 0,
    locked: false, visible: true, opacity: 1, tags: [], src, meta,
  }
}

test.beforeEach(async () => {
  fixtureDir = await mkdtemp(join(tmpdir(), 'citadel-transcript-seek-'))
  profileDir = await mkdtemp(join(tmpdir(), 'citadel-transcript-profile-'))
  const audioPath = join(fixtureDir, 'interview.wav')
  const projectPath = join(fixtureDir, 'transcript-seek.citadel')
  await writeFile(audioPath, wavFixture(8))
  await writeFile(projectPath, JSON.stringify({
    version: '1.0.0', createdAt: Date.now(), updatedAt: Date.now(), activeBoardId: BOARD_ID,
    boards: [{
      id: BOARD_ID, name: 'Transcript seek', viewport: { x: 0, y: 0, scale: 1 }, connections: [],
      items: [
        // Deliberately outside the initial viewport: clicking the transcript must wake this item.
        item(AUDIO_ID, 'audio', 12_000, 12_000, 360, 120, audioPath),
        item(TRANSCRIPT_ID, 'text', 180, 180, 440, 220, audioPath, {
          content: 'Edited transcript text', transcriptOf: audioPath, transcriptSourceItemId: AUDIO_ID,
          transcriptDurationSeconds: 8,
          transcriptSegments: [
            { start: 1, end: 2, text: 'Opening words' },
            { start: SEEK_SECONDS, end: 4, text: 'The timestamped phrase' },
          ],
        }),
      ],
    }],
  }, null, 2))

  session = await launchCitadel(profileDir)
  const page = session.page
  await session.app.evaluate(({ ipcMain }, path) => {
    ipcMain.removeHandler('file:openDialog')
    ipcMain.handle('file:openDialog', () => ({ path }))
  }, projectPath)
  await openBoard(page)
  await session.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.send('menu:open'))
  await expect(page.getByText('Project opened')).toBeVisible()
})

test.afterEach(async () => {
  await closeCitadel(session)
  session = undefined
  if (profileDir) await rm(profileDir, { recursive: true, force: true })
  if (fixtureDir) await rm(fixtureDir, { recursive: true, force: true })
  profileDir = undefined
  fixtureDir = undefined
})

test('clicking a transcript timestamp wakes its source and seeks paused audio', async () => {
  const page = session!.page
  const stage = page.locator('canvas').first()
  const stageBox = await stage.boundingBox()
  if (!stageBox) throw new Error('Konva stage did not render')

  // Select the transcript in the real canvas, then use its accessible timestamp control.
  await page.mouse.click(stageBox.x + 400, stageBox.y + 280)
  const transcript = page.getByRole('region', { name: 'Original recording transcript' })
  await expect(transcript).toBeVisible()
  const timestamp = transcript.getByRole('button', { name: /Go to audio at 0:03: The timestamped phrase/ })
  await timestamp.click({ force: true })

  // The source was initially virtualized; the seek focuses it, mounts its DOM player,
  // and only then assigns the timestamp after WAV metadata has loaded.
  const audio = page.getByLabel('Source audio playback')
  await expect(audio).toBeVisible()
  await expect.poll(() => audio.evaluate((element) => ({
    currentTime: (element as HTMLAudioElement).currentTime,
    paused: (element as HTMLAudioElement).paused,
    duration: (element as HTMLAudioElement).duration,
  }))).toEqual({ currentTime: SEEK_SECONDS, paused: true, duration: 8 })
  await expect(page.getByText('Audio ready at 0:03. Press Play on the audio item to listen.')).toBeVisible()
  const partial = await audio.evaluate(async (element) => {
    const response = await fetch((element as HTMLAudioElement).src, { headers: { Range: 'bytes=44-63' } })
    return { status: response.status, range: response.headers.get('content-range'), length: (await response.arrayBuffer()).byteLength }
  })
  expect(partial).toEqual({ status: 206, range: 'bytes 44-63/128044', length: 20 })
})
