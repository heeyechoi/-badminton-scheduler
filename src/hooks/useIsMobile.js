import { useEffect, useState } from 'react'

/** True while the viewport is at or below breakpointPx, kept in sync via matchMedia. */
export function useIsMobile(breakpointPx = 640) {
  const query = `(max-width: ${breakpointPx}px)`
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  // The lazy useState initializer above already captures the value for this
  // query at mount; this effect only needs to react to it changing afterward.
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e) => setIsMobile(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return isMobile
}
