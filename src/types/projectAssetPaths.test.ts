import { describe, expect, it } from 'vitest'
import { projectAssetPaths, visitProjectAssetPaths } from './projectAssetPaths'

describe('project asset references', () => {
  it('includes original PDFs and audio plus recorded item patches, without treating prose as paths', () => {
    const project = {
      boards: [{ items: [
        { src: '/preview.png', meta: { sourcePdf: '/paper.pdf', content: '/not-an-asset', link: '/not-an-asset-either' } },
        { src: '/voice.wav', meta: { transcriptOf: '/voice.wav' } },
      ] }],
      recordings: [{ events: [{ before: [{ id: 'x', src: '/old-preview.png' }], after: { id: 'x', meta: { sourcePdf: '/paper.pdf' } } }] }],
    }
    expect(projectAssetPaths(project)).toEqual(['/preview.png', '/paper.pdf', '/voice.wav', '/old-preview.png'])
    visitProjectAssetPaths(project, (path, replace) => replace(`moved${path}`))
    expect(project.boards[0].items[0].meta.content).toBe('/not-an-asset')
    expect(projectAssetPaths(project)).toEqual(['moved/preview.png', 'moved/paper.pdf', 'moved/voice.wav', 'moved/old-preview.png'])
  })

  it('ignores malformed optional metadata and recording shapes', () => {
    expect(projectAssetPaths({ boards: [null, { items: [null, { src: 42, meta: 'bad' }] }], recordings: [null, { events: [null] }] })).toEqual([])
  })
})
