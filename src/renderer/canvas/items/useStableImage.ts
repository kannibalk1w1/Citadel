import { useEffect, useRef } from 'react'
import useImage from 'use-image'

// Keeps returning the last successfully loaded image while a new URL loads,
// so swapping between thumbnail and full source never blanks the relic.
export function useStableImage(url: string): HTMLImageElement | undefined {
  const [image] = useImage(url)
  const lastLoaded = useRef<HTMLImageElement | undefined>(undefined)
  useEffect(() => {
    if (image) lastLoaded.current = image
  }, [image])
  return image ?? lastLoaded.current
}
