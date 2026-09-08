import React, { useMemo } from 'react'
import { Group, Text } from 'react-konva'
import type { RichDocument } from '../../../types/documents'
import { canvasColor, canvasFont } from '../../theme/canvasColors'
import { layoutRichDocument } from '../richDocumentLayout'

export function RichDocumentText({ document: content, width, height, fontSize, color, align, fontStyle }: {
  document: RichDocument; width: number; height: number; fontSize: number; color: string; align: string; fontStyle: string
}): React.ReactElement {
  const bodyFont = canvasFont('body')
  const monoFont = canvasFont('mono')
  const runs = useMemo(() => {
    const context = document.createElement('canvas').getContext('2d')
    return layoutRichDocument(content, width, height, fontSize, (text, size, style, code) => {
      if (!context) return Array.from(text).length * size * 0.6
      context.font = `${style === 'normal' ? '' : style} ${size}px ${code ? monoFont : bodyFont}`.trim()
      return context.measureText(text).width
    }, align, fontStyle)
  }, [content, width, height, fontSize, bodyFont, monoFont, align, fontStyle])
  return <Group listening={false} clipX={0} clipY={0} clipWidth={width} clipHeight={height}>
    {runs.map((run, index) => <Text key={index} x={run.x} y={run.y} text={run.text}
      fontSize={run.fontSize} fontStyle={run.fontStyle} fontFamily={run.code ? monoFont : bodyFont}
      fill={run.href ? canvasColor('accent') : color} textDecoration={run.href ? 'underline' : undefined}
      listening={false} />)}
  </Group>
}
