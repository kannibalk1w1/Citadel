import React from 'react'
import { Line } from 'react-konva'
import { useUIStore } from '../../store/uiStore'

type SnapLine = { x1: number; y1: number; x2: number; y2: number }

// Shared mutable array — written by snapEngine, read here
export const snapLines: SnapLine[] = []

export function SnapGuides(): React.ReactElement {
  // Subscribe to tick so React re-renders when snap engine updates lines
  useUIStore((s) => s._snapTick)

  return (
    <>
      {snapLines.map((line, i) => (
        <Line
          key={i}
          points={[line.x1, line.y1, line.x2, line.y2]}
          stroke="var(--accent)"
          strokeWidth={0.5}
          dash={[4, 4]}
          listening={false}
        />
      ))}
    </>
  )
}
