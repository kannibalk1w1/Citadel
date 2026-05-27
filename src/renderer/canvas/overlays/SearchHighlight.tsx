import React from 'react'
import { Group, Line, Rect, Text } from 'react-konva'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { getSearchResults } from '../../ui/itemSearchModel'

const MAX_INDEX_MARKS = 24

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function markForId(id: string): string {
  const marks = ['I', 'V', 'X', '<>', '//', '()']
  const total = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return marks[total % marks.length]
}

export function SearchHighlight(): React.ReactElement | null {
  const highlightId = useUIStore((s) => s.searchHighlightId)
  const searchQuery = useUIStore((s) => s.searchQuery)
  const searchOpen = useUIStore((s) => s.panels.tagSearch)
  const viewport = useCanvasStore((s) => s.viewport())
  const items = useCanvasStore((s) => s.items())
  const item = items.find((i) => i.id === highlightId)
  const [phase, setPhase] = React.useState(0)

  const activeResults = React.useMemo(() => {
    if (!searchOpen || !searchQuery.trim()) return []
    return getSearchResults(items, searchQuery.trim().toLowerCase(), MAX_INDEX_MARKS).map((result) => result.item)
  }, [items, searchOpen, searchQuery])

  React.useEffect(() => {
    if (activeResults.length === 0 || prefersReducedMotion()) return undefined
    const id = window.setInterval(() => setPhase((value) => (value + 1) % 120), 90)
    return () => window.clearInterval(id)
  }, [activeResults.length])

  if (!highlightId && activeResults.length === 0) return null

  const accent = cssVar('--accent', '#bd9652')
  const text = cssVar('--text-primary', '#e0d6c7')
  const mono = cssVar('--font-mono', "'JetBrains Mono', monospace")
  const reducedMotion = prefersReducedMotion()
  const pulse = reducedMotion ? 0.66 : 0.44 + Math.sin(phase / 120 * Math.PI * 2) * 0.18

  const pad = 8 / viewport.scale

  return (
    <>
      {activeResults.map((resultItem, index) => {
        const markPad = 10 / viewport.scale
        const markSize = 12 / viewport.scale
        const opacity = Math.max(0.24, pulse - index * 0.008)
        return (
          <Group
            key={`index-mark-${resultItem.id}`}
            data-index-mark-id={resultItem.id}
            data-testid="index-mark"
            listening={false}
            opacity={opacity}
          >
            <Rect
              x={resultItem.x - markPad}
              y={resultItem.y - markPad}
              width={resultItem.width + markPad * 2}
              height={resultItem.height + markPad * 2}
              rotation={resultItem.rotation}
              stroke={accent}
              strokeWidth={1 / viewport.scale}
              dash={[5 / viewport.scale, 7 / viewport.scale]}
              shadowEnabled
              shadowColor={accent}
              shadowBlur={10 / viewport.scale}
              shadowOpacity={0.46}
            />
            <Text
              x={resultItem.x - markPad}
              y={resultItem.y - markPad - markSize}
              text={markForId(resultItem.id)}
              fontSize={markSize}
              fontFamily={mono}
              fill={text}
              opacity={0.82}
            />
            <Line
              points={[
                resultItem.x - markPad,
                resultItem.y - markPad / 2,
                resultItem.x - markPad + 18 / viewport.scale,
                resultItem.y - markPad / 2,
              ]}
              stroke={accent}
              strokeWidth={1 / viewport.scale}
              opacity={0.7}
            />
          </Group>
        )
      })}
      {item && (
        <Rect
          x={item.x - pad}
          y={item.y - pad}
          width={item.width + pad * 2}
          height={item.height + pad * 2}
          rotation={item.rotation}
          stroke={accent}
          strokeWidth={2 / viewport.scale}
          dash={[8 / viewport.scale, 5 / viewport.scale]}
          shadowEnabled
          shadowColor={accent}
          shadowBlur={16 / viewport.scale}
          shadowOpacity={0.9}
          listening={false}
        />
      )}
    </>
  )
}
