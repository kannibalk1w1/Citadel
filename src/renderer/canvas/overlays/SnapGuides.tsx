import React from 'react'
import { Line, Text } from 'react-konva'
import { useUIStore } from '../../store/uiStore'

export type SnapLine = {
  x1: number
  y1: number
  x2: number
  y2: number
  orientation: 'vertical' | 'horizontal'
  label?: string
  labelX?: number
  labelY?: number
}

// Shared mutable array — written by snapEngine, read here
export const snapLines: SnapLine[] = []

export function SnapGuides(): React.ReactElement {
  // Subscribe to tick so React re-renders when snap engine updates lines
  useUIStore((s) => s._snapTick)

  return (
    <>
      {snapLines.map((line, i) => (
        <React.Fragment key={i}>
          <Line
            points={[line.x1, line.y1, line.x2, line.y2]}
            stroke="var(--accent)"
            strokeWidth={0.5}
            dash={[4, 4]}
            listening={false}
          />
          {line.label ? (
            <Text
              x={line.labelX ?? line.x1}
              y={line.labelY ?? line.y1}
              text={line.label}
              fontSize={10}
              fontFamily="var(--font-mono)"
              fill="var(--text-accent)"
              listening={false}
            />
          ) : null}
        </React.Fragment>
      ))}
    </>
  )
}
