import { describe, expect, it } from 'vitest'
import { activeArchiveRailWidth, archiveRailSections, commandSpineSections, shellCanvasInset } from './shellModel'

describe('shellModel', () => {
  it('groups command spine actions by work mode', () => {
    expect(commandSpineSections.map((section) => section.id)).toEqual(['select', 'create', 'media', 'system'])
    expect(commandSpineSections.flatMap((section) => section.items).map((item) => item.id)).toContain('presentation')
  })

  it('groups archive rail actions into project, mark, and output areas', () => {
    expect(archiveRailSections.map((section) => section.id)).toEqual(['project', 'mark', 'output'])
    expect(archiveRailSections.find((section) => section.id === 'project')?.items.map((item) => item.id)).toEqual([
      'import',
      'boards',
      'assets',
      'new-board',
      'clone-board',
    ])
  })

  it('keeps the canvas inset tied to the shell rail width', () => {
    expect(shellCanvasInset(false)).toBe('var(--archive-rail-w)')
    expect(shellCanvasInset(false, true)).toBe('34px')
    expect(shellCanvasInset(true)).toBe('0px')
  })

  it('uses the compact rail width only when the rail is collapsed', () => {
    expect(activeArchiveRailWidth(false, 208)).toBe(208)
    expect(activeArchiveRailWidth(true, 208)).toBe(34)
  })
})
