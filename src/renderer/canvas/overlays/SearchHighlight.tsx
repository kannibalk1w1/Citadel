import React from 'react'
import { Group, Rect } from 'react-konva'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { getSearchResults } from '../../ui/itemSearchModel'

export const MAX_INDEX_MARKS = 24

type SearchHighlightProps = {
  visibleItemIds?: ReadonlySet<string>
}

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

export function visibleIndexMarkItems<T extends { id: string; visible?: boolean }>(
  results: T[],
  visibleItemIds?: ReadonlySet<string>,
): T[] {
  return results
    .filter((item) => visibleItemIds ? visibleItemIds.has(item.id) : item.visible !== false)
    .slice(0, MAX_INDEX_MARKS)
}

export function SearchHighlight({ visibleItemIds }: SearchHighlightProps = {}): React.ReactElement | null {
  const highlightId = useUIStore((s) => s.searchHighlightId)
  const searchQuery = useUIStore((s) => s.searchQuery)
  const searchOpen = useUIStore((s) => s.panels.tagSearch)
  const viewport = useCanvasStore((s) => s.viewport())
  const items = useCanvasStore((s) => s.items())
  const item = items.find((i) => i.id === highlightId)
  const activeResults = React.useMemo(() => {
    if (!searchOpen || !searchQuery.trim()) return []
    const matches = getSearchResults(items, searchQuery.trim().toLowerCase(), items.length)
      .map((result) => result.item)
    return visibleIndexMarkItems(matches, visibleItemIds)
  }, [items, searchOpen, searchQuery, visibleItemIds])

  if (!highlightId && activeResults.length === 0) return null

  const accent = cssVar('--accent', '#bd9652')
  const pad = 8 / viewport.scale

  return (
    <>
      {activeResults.map((resultItem, index) => {
        const markPad = 10 / viewport.scale
        const opacity = Math.max(0.34, 0.68 - index * 0.01)
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
