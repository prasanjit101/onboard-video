import { useCallback, useEffect, useRef, useState } from 'react'
import type { WatchStateStorage } from './types'

const KEY_PREFIX = 'onboard-video:watched:'

/** Build the storage key for a given videoId. Keeps the prefix in one place. */
function keyFor(videoId: string): string {
  return `${KEY_PREFIX}${videoId}`
}

/**
 * Default storage adapter backed by `localStorage`. Safe in SSR: `get` returns
 * `false` and `set` is a no-op when `window` is unavailable.
 */
const localStorageAdapter: WatchStateStorage = {
  get(key) {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(key) === '1'
    } catch {
      return false
    }
  },
  set(key, value) {
    if (typeof window === 'undefined') return
    try {
      if (value) window.localStorage.setItem(key, '1')
      else window.localStorage.removeItem(key)
    } catch {
      /* quota / privacy mode — swallow */
    }
  },
}

/**
 * Opt-in persistence hook: tracks whether the user has watched a given video.
 *
 * Intentionally NOT auto-wired to `<OnboardingVideo />` — the consumer is
 * responsible for `onEnded={markWatched}` and any conditional rendering. This
 * keeps the two concerns decoupled and the persistence layer fully optional.
 */
export function useVideoWatchState(
  videoId: string,
  options?: { storage?: WatchStateStorage },
): {
  hasWatched: boolean
  markWatched: () => void
  reset: () => void
} {
  const storage = options?.storage ?? localStorageAdapter
  const storageRef = useRef(storage)
  storageRef.current = storage

  const [hasWatched, setHasWatched] = useState<boolean>(false)

  // Initial read. Performed in an effect so SSR renders consistently produce
  // `false`, then we hydrate to the real value client-side without mismatch.
  useEffect(() => {
    let cancelled = false
    const result = storageRef.current.get(keyFor(videoId))
    if (result instanceof Promise) {
      void result.then((v) => {
        if (!cancelled) setHasWatched(!!v)
      })
    } else {
      setHasWatched(!!result)
    }
    return () => {
      cancelled = true
    }
  }, [videoId])

  const markWatched = useCallback(() => {
    setHasWatched(true)
    void storageRef.current.set(keyFor(videoId), true)
  }, [videoId])

  const reset = useCallback(() => {
    setHasWatched(false)
    void storageRef.current.set(keyFor(videoId), false)
  }, [videoId])

  return { hasWatched, markWatched, reset }
}
