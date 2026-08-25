import React, { useEffect, useRef } from 'react'
import { Circle, Group, Image as KonvaImage, Rect, Text, Transformer } from 'react-konva'
import { nanoid } from 'nanoid'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { CanvasItem } from '../../../types'
import { useAssetMetadata } from '../../assets/assetMetadata'
import { preferThumbnail } from '../../assets/previewPolicy'
import { ensureThumbnail } from '../../assets/thumbnailPipeline'
import { useStableImage } from './useStableImage'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { useUIStore } from '../../store/uiStore'
import { pathToUrl } from '../../utils/pathToUrl'
import { adoptSelectTool, handleRelicToolPress, relicPressMoves } from './relicPointer'
import { snapItem } from '../snapping/snapEngine'
import { spatialIndex } from '../snapping/spatialIndex'
import { snapLines } from '../overlays/SnapGuides'
import { imageCoverCrop, imageFitRect, type ImageFitMode } from './imageFit'
import { flipProps, itemFlip } from './flipTransform'
import { FILENAME_LABEL_FONT_PX, filenameInscription } from '../../assets/filenameLabel'
import { addWaymarkPatch, removeWaymarkPatch, resolveWaymarks, setWaymarkLabelPatch, type Waymark } from './waymarks'
import { askInscription } from '../../ui/prompt/inscriptionPromptStore'
import { canvasColor } from '../../theme/canvasColors'
import { selectionTransformerStyle } from './selectionTransformerStyle'
import { sourceCaptureReference, sourceCaptureRegionPatch, type ImageRegion } from '../sourceCapture'
import { useSourceCaptureRegionStore } from '../../ui/sourceCaptureRegionStore'

type Props = { item: CanvasItem }

type CaptureRegionEditorProps = {
  captureId: string
  region: ImageRegion
  imageWidth: number
  imageHeight: number
  onChange: (captureId: string, region: ImageRegion) => void
}

function CaptureRegionEditor({ captureId, region, imageWidth, imageHeight, onChange }: CaptureRegionEditorProps): React.ReactElement {
  const rectRef = useRef<import('konva/lib/shapes/Rect').Rect>(null)
  const transformerRef = useRef<import('konva/lib/shapes/Transformer').Transformer>(null)

  useEffect(() => {
    if (!rectRef.current || !transformerRef.current) return
    transformerRef.current.nodes([rectRef.current])
    transformerRef.current.getLayer()?.batchDraw()
  }, [region])

  const changedRegion = (): ImageRegion | null => {
    const node = rectRef.current
    if (!node) return null
    const next = {
      x: node.x() / imageWidth,
      y: node.y() / imageHeight,
      width: node.width() * node.scaleX() / imageWidth,
      height: node.height() * node.scaleY() / imageHeight,
    }
    node.scaleX(1)
    node.scaleY(1)
    return next
  }
  const finish = (event: KonvaEventObject<DragEvent | Event>) => {
    event.cancelBubble = true
    const next = changedRegion()
    if (next) onChange(captureId, next)
  }

  return (
    <>
      <Rect
        ref={rectRef}
        x={region.x * imageWidth}
        y={region.y * imageHeight}
        width={region.width * imageWidth}
        height={region.height * imageHeight}
        fill="rgba(115,168,219,0.18)"
        stroke={canvasColor('accent')}
        strokeWidth={1.5}
        dash={[5, 3]}
        draggable
        onClick={(event) => { event.cancelBubble = true }}
        onDragEnd={finish}
        onTransformEnd={finish}
      />
      <Transformer
        ref={transformerRef}
        rotateEnabled={false}
        keepRatio={false}
        borderStroke={canvasColor('accent')}
        anchorStroke={canvasColor('accent')}
        anchorFill={canvasColor('bgPanel')}
        anchorSize={8}
        enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
      />
    </>
  )
}

export function ImageItem({ item }: Props): React.ReactElement | null {
  const isSelected = useCanvasStore((s) => s.selectedIds.includes(item.id))
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const allItems = useCanvasStore((s) => s.items())
  const scale = useCanvasStore((s) => s.viewport().scale)
  const meta = useAssetMetadata(item.src)
  const useThumb = preferThumbnail(item.width * scale, item.height * scale, isSelected)
  const displaySrc = useThumb && meta?.thumbnailPath ? meta.thumbnailPath : item.src ?? ''
  const image = useStableImage(pathToUrl(displaySrc))
  const isMissing = meta?.exists === false
  const setSelection = useCanvasStore((s) => s.setSelection)
  const updateItem = useCanvasStore((s) => s.updateItem)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)!
  const toolMode = useUIStore((s) => s.toolMode)
  const openContextMenu = useUIStore((s) => s.openContextMenu)
  const isConnectSource = useUIStore((s) => s.connectFromId === item.id)
  const filenameLabelsVisible = useUIStore((s) => s.filenameLabelsVisible)
  const regionSelectionRequest = useSourceCaptureRegionStore((s) => s.request)
  const groupRef = useRef<import('konva/lib/Group').Group>(null)
  const trRef = useRef<import('konva/lib/shapes/Transformer').Transformer>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const transformStart = useRef<{ x: number; y: number; width: number; height: number; rotation: number } | null>(null)
  const [regionStart, setRegionStart] = React.useState<{ x: number; y: number } | null>(null)
  const [regionPreview, setRegionPreview] = React.useState<ImageRegion | null>(null)

  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  // A newly imported image first renders without a Konva node while its source
  // loads. Include that readiness in the dependency list so selection made on
  // import attaches the transformer as soon as the node exists.
  }, [image, isMissing, isSelected])

  useEffect(() => { void ensureThumbnail(item.src) }, [item.src])

  const applyWaymarkPatch = (patch: { before: { id: string; meta: Record<string, unknown> }; after: { id: string; meta: Record<string, unknown> } } | null) => {
    if (!patch) return
    useHistoryStore.getState().push('ITEM_STYLE', activeBoardId, patch.before, patch.after)
    updateItem(activeBoardId, item.id, { meta: patch.after.meta })
  }

  const applyCaptureRegion = (captureId: string, region: ImageRegion) => {
    const canvas = useCanvasStore.getState()
    const capture = canvas.items().find((candidate) => candidate.id === captureId)
    if (!capture) return
    const patch = sourceCaptureRegionPatch(capture, region)
    if (!patch) return
    useHistoryStore.getState().push('ITEM_STYLE', activeBoardId, patch.before, patch.after)
    canvas.updateItem(activeBoardId, captureId, { meta: patch.after.meta })
  }

  const handleWaymarkClick = (mark: Waymark) => {
    void askInscription('Marker label (clear to remove):', mark.label).then((label) => {
      if (label === null) return
      const current = useCanvasStore.getState().items().find((i) => i.id === item.id)
      if (!current) return
      applyWaymarkPatch(label ? setWaymarkLabelPatch(current, mark.id, label) : removeWaymarkPatch(current, mark.id))
    })
  }

  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true

    if (toolMode === 'select' && e.evt.altKey) {
      const pointer = e.target.getStage()?.getPointerPosition()
      if (pointer) {
        const viewport = useCanvasStore.getState().viewport()
        const u = Math.max(0, Math.min(1, ((pointer.x - viewport.x) / viewport.scale - item.x) / item.width))
        const v = Math.max(0, Math.min(1, ((pointer.y - viewport.y) / viewport.scale - item.y) / item.height))
        void askInscription('Marker label:').then((label) => {
          if (!label) return
          const current = useCanvasStore.getState().items().find((i) => i.id === item.id)
          if (!current) return
          applyWaymarkPatch(addWaymarkPatch(current, { id: nanoid(), u, v, label }))
        })
      }
      return
    }

    if (handleRelicToolPress(toolMode, activeBoardId, item)) return
    adoptSelectTool(toolMode)
    if (e.evt.shiftKey) {
      useCanvasStore.getState().addToSelection(item.id)
    } else {
      setSelection([item.id])
    }
  }

  /**
   * Konva bubbles drag and transform events up from every child, and the group
   * holds draggable children of its own — the capture-region outline and its
   * transformer. Without this the region's drag arrived here as the image's
   * own: the group snapped itself to the outline's local coordinates and slid
   * across the board, and a region resize wrote an unchanged ITEM_STYLE into
   * undo. Each handler acts only on the group it belongs to.
   */
  const isOwnEvent = (e: KonvaEventObject<unknown>): boolean => e.target === groupRef.current

  const handleDragStart = (e: KonvaEventObject<DragEvent>) => {
    if (!isOwnEvent(e)) return
    dragStart.current = { x: item.x, y: item.y }
    spatialIndex.rebuild(useCanvasStore.getState().items())
  }

  const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
    if (!isOwnEvent(e)) return
    const node = e.target
    const dragged = { ...item, x: node.x(), y: node.y() }
    const viewport = useCanvasStore.getState().viewport()
    const snapped = snapItem(dragged, viewport, { invertSnap: e.evt.ctrlKey })
    node.x(snapped.x)
    node.y(snapped.y)
    useUIStore.getState().bumpSnap()
  }

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    if (!isOwnEvent(e)) return
    snapLines.length = 0
    useUIStore.getState().bumpSnap()
    const newX = e.target.x()
    const newY = e.target.y()
    updateItem(activeBoardId, item.id, { x: newX, y: newY })
    if (dragStart.current) {
      useHistoryStore.getState().push('ITEM_MOVE', activeBoardId,
        { id: item.id, x: dragStart.current.x, y: dragStart.current.y },
        { id: item.id, x: newX, y: newY }
      )
      dragStart.current = null
    }
  }

  const handleTransformStart = (e: KonvaEventObject<Event>) => {
    if (!isOwnEvent(e)) return
    transformStart.current = { x: item.x, y: item.y, width: item.width, height: item.height, rotation: item.rotation }
  }

  const handleTransformEnd = (e: KonvaEventObject<Event>) => {
    if (!isOwnEvent(e)) return
    const node = groupRef.current
    if (!node) return
    const after = {
      x: node.x(),
      y: node.y(),
      width: Math.max(10, node.width() * node.scaleX()),
      height: Math.max(10, node.height() * node.scaleY()),
      rotation: node.rotation(),
    }
    updateItem(activeBoardId, item.id, after)
    node.scaleX(1)
    node.scaleY(1)
    if (transformStart.current) {
      useHistoryStore.getState().push('ITEM_STYLE', activeBoardId,
        { id: item.id, ...transformStart.current },
        { id: item.id, ...after }
      )
      transformStart.current = null
    }
  }

  const isRegionSelectionSource = regionSelectionRequest?.sourceItemId === item.id
  const pointerRegionPoint = (target: KonvaEventObject<MouseEvent>['target']): { x: number; y: number } | null => {
    // Ask the active hit rectangle for its local pointer location. This also
    // accounts for a rotated source image.
    const point = target.getRelativePointerPosition()
    if (!point) return null
    return {
      x: Math.max(0, Math.min(1, point.x / item.width)),
      y: Math.max(0, Math.min(1, point.y / item.height)),
    }
  }
  const regionBetween = (start: { x: number; y: number }, end: { x: number; y: number }): ImageRegion => ({
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  })
  const handleRegionStart = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    const point = pointerRegionPoint(e.target)
    if (!point) return
    setRegionStart(point)
    setRegionPreview({ x: point.x, y: point.y, width: 0, height: 0 })
  }
  const handleRegionMove = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    if (!regionStart) return
    const point = pointerRegionPoint(e.target)
    if (point) setRegionPreview(regionBetween(regionStart, point))
  }
  const handleRegionEnd = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    if (!regionStart) return
    const point = pointerRegionPoint(e.target)
    const region = point ? regionBetween(regionStart, point) : null
    setRegionStart(null)
    setRegionPreview(null)
    if (!region || region.width < 0.01 || region.height < 0.01) return
    useSourceCaptureRegionStore.getState().complete(region)
  }

  // A capture can begin while an imported image is still decoding. Keep its
  // bounds interactive for region selection rather than making the flow wait
  // on a browser image-load event.
  if (!image && !isMissing && !isRegionSelectionSource) return null

  const fitMode = ((item.meta?.fitMode as ImageFitMode | undefined) ?? 'stretch')
  const imageWidth = image ? (image.naturalWidth || image.width) : item.width
  const imageHeight = image ? (image.naturalHeight || image.height) : item.height
  const fitRect = fitMode === 'fit' ? imageFitRect(imageWidth, imageHeight, item.width, item.height) : null
  const cropRect = fitMode === 'fill' ? imageCoverCrop(imageWidth, imageHeight, item.width, item.height) : undefined
  const missingLabel = item.src?.split(/[\\/]/).pop() ?? 'missing file'
  const { flipX, flipY } = itemFlip(item.meta)
  const filenameLabel = filenameInscription(item.src, filenameLabelsVisible, scale)
  const waymarks = resolveWaymarks(item)
  const captureRegions = allItems.flatMap((capture) => {
    const source = sourceCaptureReference(capture)
    if (!source?.region || source.sourceItemId !== item.id) return []
    return isSelected || selectedIds.includes(capture.id)
      ? [{ id: capture.id, region: source.region, editable: selectedIds.includes(capture.id) }]
      : []
  })

  return (
    <>
      <Group
        ref={groupRef}
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        rotation={item.rotation}
        draggable={relicPressMoves(toolMode) && !item.locked && !isRegionSelectionSource}
        onClick={handleClick}
        onContextMenu={(e) => {
          e.evt.preventDefault()
          e.cancelBubble = true
          if (!isSelected) setSelection([item.id])
          openContextMenu(e.evt.clientX, e.evt.clientY)
        }}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransformStart={handleTransformStart}
        onTransformEnd={handleTransformEnd}
      >
        <Rect
          x={0}
          y={0}
          width={item.width}
          height={item.height}
          fill={fitMode === 'fit' ? canvasColor('bgCanvas') : 'rgba(0,0,0,0.001)'}
          opacity={fitMode === 'fit' ? 0.75 : 1}
        />
        {isMissing || !image ? (
          <>
            <Rect
              x={0}
              y={0}
              width={item.width}
              height={item.height}
              fill="#221d18"
              stroke="#2e2820"
              strokeWidth={1}
              dash={[6, 4]}
              listening={false}
            />
            <Text
              x={8}
              y={item.height / 2 - 8}
              width={Math.max(16, item.width - 16)}
              text={missingLabel}
              fontSize={12}
              fontFamily="JetBrains Mono, monospace"
              fill="#8a7a5c"
              ellipsis
              wrap="none"
              listening={false}
            />
          </>
        ) : (
          <KonvaImage
            image={image}
            x={fitRect?.x ?? 0}
            y={fitRect?.y ?? 0}
            width={fitRect?.width ?? item.width}
            height={fitRect?.height ?? item.height}
            crop={cropRect}
            opacity={item.opacity}
            listening={false}
            {...flipProps(flipX, flipY, fitRect?.width ?? item.width, fitRect?.height ?? item.height)}
          />
        )}
        {captureRegions.map(({ id, region, editable }) => editable ? (
          <CaptureRegionEditor
            key={`source-region-${id}`}
            captureId={id}
            region={region}
            imageWidth={item.width}
            imageHeight={item.height}
            onChange={applyCaptureRegion}
          />
        ) : (
          <Rect
            key={`source-region-${id}`}
            x={region.x * item.width}
            y={region.y * item.height}
            width={region.width * item.width}
            height={region.height * item.height}
            fill="rgba(115,168,219,0.12)"
            stroke={canvasColor('accent')}
            strokeWidth={1.5}
            dash={[5, 3]}
            listening={false}
          />
        ))}
        {regionPreview && (
          <Rect
            x={regionPreview.x * item.width}
            y={regionPreview.y * item.height}
            width={regionPreview.width * item.width}
            height={regionPreview.height * item.height}
            fill="rgba(115,168,219,0.18)"
            stroke={canvasColor('accent')}
            strokeWidth={1.5}
            dash={[5, 3]}
            listening={false}
          />
        )}
        {isRegionSelectionSource && (
          <Rect
            x={0}
            y={0}
            width={item.width}
            height={item.height}
            fill="rgba(0,0,0,0.001)"
            onMouseDown={handleRegionStart}
            onMouseMove={handleRegionMove}
            onMouseUp={handleRegionEnd}
          />
        )}
        <Rect
          x={0}
          y={0}
          width={item.width}
          height={item.height}
          fill={undefined}
          stroke={isConnectSource || isSelected ? canvasColor("accent") : undefined}
          strokeWidth={isConnectSource || isSelected ? 2 : 0}
          shadowEnabled={isSelected}
          shadowColor="rgba(185,148,85,0.7)"
          shadowBlur={20}
          shadowOpacity={0.8}
          listening={false}
        />
        {filenameLabel && (
          <Text
            x={0}
            y={item.height + 4}
            width={item.width}
            text={filenameLabel}
            fontSize={FILENAME_LABEL_FONT_PX}
            fontFamily="JetBrains Mono, monospace"
            fill="#8a7a5c"
            ellipsis
            wrap="none"
            listening={false}
          />
        )}
        {isSelected && waymarks.map((mark) => (
          <React.Fragment key={mark.id}>
            <Circle
              x={mark.u * item.width}
              y={mark.v * item.height}
              radius={5}
              fill="#0f0d0b"
              stroke="#bd9652"
              strokeWidth={1.5}
              shadowEnabled
              shadowColor="rgba(189,150,82,0.7)"
              shadowBlur={8}
              onClick={(e) => {
                e.cancelBubble = true
                if (toolMode === 'select') handleWaymarkClick(mark)
              }}
            />
            <Text
              x={mark.u * item.width + 9}
              y={mark.v * item.height - 5}
              text={mark.label}
              fontSize={10}
              fontFamily="JetBrains Mono, monospace"
              fill="#e8ddd0"
              shadowEnabled
              shadowColor="#0f0d0b"
              shadowBlur={4}
              listening={false}
            />
          </React.Fragment>
        ))}
      </Group>
      {isSelected && !item.locked && !isRegionSelectionSource && (
        <Transformer
          ref={trRef}
          rotateEnabled
          keepRatio={false}
          {...selectionTransformerStyle(scale)}
        />
      )}
    </>
  )
}
