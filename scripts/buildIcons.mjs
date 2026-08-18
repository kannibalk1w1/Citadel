/**
 * Renders resources/icon.svg into every raster the packagers need.
 *
 * Run: node scripts/buildIcons.mjs   (needs rsvg-convert and ImageMagick)
 *
 * Generated rather than committed-and-forgotten, so the icon has one source of
 * truth. The icon this replaced had no provenance on record — the last of the
 * three assets the third-party notices audit flagged — and an SVG in the repo
 * is original work anyone can check.
 *
 * Windows wants a multi-size .ico; electron-builder's Linux targets want a
 * 512x512 png (or an icon set directory, but a single 512 is enough for it to
 * derive the rest).
 */
import { execFileSync } from 'child_process'
import { mkdtempSync, rmSync, copyFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = join(root, 'resources', 'icon.svg')
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

const dir = mkdtempSync(join(tmpdir(), 'citadel-icons-'))
try {
  const png = (size) => {
    const out = join(dir, `${size}.png`)
    execFileSync('rsvg-convert', ['-w', String(size), '-h', String(size), svg, '-o', out])
    return out
  }

  execFileSync('magick', [...ICO_SIZES.map(png), join(root, 'resources', 'icon.ico')])
  copyFileSync(png(512), join(root, 'resources', 'icon.png'))

  console.log(`wrote resources/icon.ico (${ICO_SIZES.join(', ')}) and resources/icon.png (512)`)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
