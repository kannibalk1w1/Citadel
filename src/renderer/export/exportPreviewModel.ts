import type { ExportArea } from '../store/uiStore'

type ExportPreviewDescription = {
  area: ExportArea
  scale: number
  includeComments: boolean
  selectedCount: number
}

export function describeExportPreview({
  area,
  scale,
  includeComments,
  selectedCount,
}: ExportPreviewDescription): string {
  const areaLabel = area === 'viewport'
    ? 'Viewport'
    : area === 'board'
      ? 'Board'
      : selectedCount > 0
        ? `Selection - ${selectedCount} items`
        : 'Selection - no selection, exports viewport'
  return `${areaLabel} - ${scale}x - comments ${includeComments ? 'included' : 'hidden'}`
}
