import { describe, expect, it } from 'vitest'
import { FILENAME_LABEL_FONT_PX, filenameInscription } from './filenameLabel'

describe('filenameInscription', () => {
  it('returns the basename when labels are visible at readable zoom', () => {
    expect(filenameInscription('C:/refs/dragons/skull-study.png', true, 1)).toBe('skull-study.png')
    expect(filenameInscription('C:\\refs\\dragons\\skull-study.png', true, 1)).toBe('skull-study.png')
  })

  it('returns null when labels are hidden', () => {
    expect(filenameInscription('C:/refs/a.png', false, 1)).toBeNull()
  })

  it('returns null without a source path', () => {
    expect(filenameInscription(undefined, true, 1)).toBeNull()
    expect(filenameInscription('', true, 1)).toBeNull()
  })

  it('hides below the far-zoom readability threshold', () => {
    const hiddenScale = 4 / FILENAME_LABEL_FONT_PX // 4px on screen < 5px threshold
    expect(filenameInscription('C:/refs/a.png', true, hiddenScale)).toBeNull()
    expect(filenameInscription('C:/refs/a.png', true, 1)).toBe('a.png')
  })
})
