import { describe, expect, it } from 'vitest'
import { describeExportPreview } from './exportPreviewModel'

describe('exportPreviewModel', () => {
  it('describes selection export with selected item count and scale', () => {
    expect(describeExportPreview({
      area: 'selection',
      scale: 2,
      includeComments: false,
      selectedCount: 3,
    })).toBe('Selection - 3 items - 2x - comments hidden')
  })

  it('warns when selection export has no selected items', () => {
    expect(describeExportPreview({
      area: 'selection',
      scale: 1,
      includeComments: true,
      selectedCount: 0,
    })).toBe('Selection - no selection, exports viewport - 1x - comments included')
  })
})
