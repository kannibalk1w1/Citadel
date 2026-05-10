import React from 'react'
import { Rect, Text } from 'react-konva'

type Props = { children: React.ReactNode; itemId: string; x: number; y: number; width: number; height: number }
type State = { error: Error | null }

// Class component — required for React error boundaries.
// Catches render errors inside a single item without crashing the whole canvas.
export class ItemErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error(`[Citadel] Item ${this.props.itemId} failed to render:`, error)
  }

  render() {
    if (this.state.error) {
      const { x, y, width, height } = this.props
      return (
        <>
          <Rect
            x={x} y={y} width={width} height={height}
            fill="#1a0a0a"
            stroke="#5a0000"
            strokeWidth={1}
            dash={[6, 3]}
            cornerRadius={3}
          />
          <Text
            x={x + 4} y={y + 4}
            width={width - 8}
            text="render error"
            fontSize={10}
            fontFamily="JetBrains Mono, monospace"
            fill="#8b2020"
          />
        </>
      )
    }
    return this.props.children
  }
}
