import type { CanvasBoard } from '../../types'
import { getArchiveIndexResults, type SearchResult } from './itemSearchModel'

export type IndexTrailResultRef = {
  id: string
  kind: SearchResult['kind']
  chamberId: string
}

export type IndexTrail = {
  id: string
  name: string
  query: string
  createdAt: number
  resultRefs: IndexTrailResultRef[]
}

type CreateIndexTrailOptions = {
  id: string
  name: string
  query: string
  boards: CanvasBoard[]
  activeBoardId: string | null
  now?: () => number
  limit?: number
}

function buildResultChamberLookup(boards: CanvasBoard[]): Map<string, string> {
  const lookup = new Map<string, string>()
  boards.forEach((board) => {
    board.items.forEach((item) => {
      lookup.set(`item:${item.id}`, board.id)
    })
    board.connections.forEach((thread) => {
      lookup.set(`thread:${thread.id}`, board.id)
    })
  })
  return lookup
}

function refKey(ref: IndexTrailResultRef): string {
  return `${ref.kind}:${ref.id}:${ref.chamberId}`
}

function resultRef(result: SearchResult, lookup: Map<string, string>): IndexTrailResultRef {
  const chamberId = lookup.get(`${result.kind}:${result.id}`) ?? result.chamber?.id ?? ''
  return { id: result.id, kind: result.kind, chamberId }
}

export function createIndexTrail({
  id,
  name,
  query,
  boards,
  activeBoardId,
  now = () => Date.now(),
  limit = 30,
}: CreateIndexTrailOptions): IndexTrail {
  const lookup = buildResultChamberLookup(boards)
  const results = getArchiveIndexResults(boards, activeBoardId, query, limit)

  return {
    id,
    name,
    query,
    createdAt: now(),
    resultRefs: results.map((result) => resultRef(result, lookup)),
  }
}

export function restoreIndexTrail(
  trail: IndexTrail,
  boards: CanvasBoard[],
  activeBoardId: string | null,
): SearchResult[] {
  const lookup = buildResultChamberLookup(boards)
  const results = getArchiveIndexResults(boards, activeBoardId, trail.query, Math.max(trail.resultRefs.length, 30))
  const byRef = new Map(results.map((result) => [refKey(resultRef(result, lookup)), result]))

  return trail.resultRefs
    .map((ref) => byRef.get(refKey(ref)))
    .filter((result): result is SearchResult => Boolean(result))
}
