import { useCallback, useEffect, useReducer, useRef } from 'react'
import { resolveProvider } from './providers'
import type { ProviderHandle } from './providers/types'
import type {
  UseOnboardingVideoOptions,
  UseOnboardingVideoReturn,
  VideoState,
} from './types'
import { throttle } from './utils/progress'

/**
 * Reducer-backed state machine. Transitions:
 *   idle → loading → ready → playing ⇄ paused → ended
 *                                    ↘ error
 *
 * `replay` is a separate action so we can reset `endedFired` at the same time.
 */
interface InternalState {
  state: VideoState
  error: Error | null
  endedFired: boolean
}

type Action =
  | { type: 'loading' }
  | { type: 'ready' }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'ended' }
  | { type: 'replay' }
  | { type: 'error'; error: Error }
  | { type: 'reset' }

function reducer(state: InternalState, action: Action): InternalState {
  switch (action.type) {
    case 'loading':
      return { state: 'loading', error: null, endedFired: false }
    case 'ready':
      // Ready can arrive multiple times (e.g. after replay); only transition if
      // we're still pre-playback.
      if (state.state === 'idle' || state.state === 'loading') {
        return { ...state, state: 'ready', error: null }
      }
      return state
    case 'play':
      return { ...state, state: 'playing', error: null }
    case 'pause':
      // Don't downgrade from ended back to paused — happens on some browsers
      // that fire `pause` immediately after `ended`.
      if (state.state === 'ended') return state
      return { ...state, state: 'paused' }
    case 'ended':
      return { ...state, state: 'ended', endedFired: true }
    case 'replay':
      return { state: 'playing', error: null, endedFired: false }
    case 'error':
      return { ...state, state: 'error', error: action.error }
    case 'reset':
      return { state: 'idle', error: null, endedFired: false }
  }
}

const INITIAL: InternalState = { state: 'idle', error: null, endedFired: false }

/**
 * Headless onboarding-video hook. Owns the provider lifecycle and exposes a
 * minimal `controls` surface plus the current state machine value.
 *
 * The opinionated `<OnboardingVideo />` component is implemented in terms of
 * this hook — they are not parallel implementations.
 */
export function useOnboardingVideo(
  options: UseOnboardingVideoOptions,
): UseOnboardingVideoReturn {
  // `null!` because the ref starts unattached but is always populated by the
  // time effects run; this matches React's legacy ref-callable expectations.
  const containerRef = useRef<HTMLDivElement>(null!)
  const [internal, dispatch] = useReducer(reducer, INITIAL)
  const handleRef = useRef<ProviderHandle | null>(null)
  // Owned at hook scope (not inside the mount effect) so `replay()` can reset
  // it without having to remount the provider.
  const endedFiredRef = useRef(false)

  // Latest callbacks held in a ref so we don't tear down the provider every
  // time the consumer rebinds an inline arrow function.
  const callbacksRef = useRef({
    onReady: options.onReady,
    onPlay: options.onPlay,
    onPause: options.onPause,
    onProgress: options.onProgress,
    onEnded: options.onEnded,
  })
  callbacksRef.current = {
    onReady: options.onReady,
    onPlay: options.onPlay,
    onPause: options.onPause,
    onProgress: options.onProgress,
    onEnded: options.onEnded,
  }

  // We intentionally key the mount effect on the *content* of source — not
  // the object identity — so consumers passing inline objects don't remount
  // on every render. JSON.stringify is fine for our small, primitive shape.
  const sourceKey = JSON.stringify(options.source)
  const autoPlay = !!options.autoPlay
  const loop = !!options.loop
  const poster = options.poster

  // Versioned mount counter lets `replay()` and error-retry trigger a fresh
  // provider mount without changing the source.
  const [mountVersion, bumpMount] = useReducer((v: number) => v + 1, 0)

  useEffect(() => {
    let cancelled = false
    const container = containerRef.current
    if (!container) return

    dispatch({ type: 'loading' })

    endedFiredRef.current = false
    const throttledProgress = throttle((percent: number) => {
      callbacksRef.current.onProgress?.(percent)
    }, 250)

    let unsubs: Array<() => void> = []

    void (async () => {
      try {
        const provider = await resolveProvider(options.source)
        if (cancelled) return
        const handle = await provider.mount(container, {
          source: options.source,
          autoPlay,
          loop,
          poster,
        })
        if (cancelled) {
          handle.destroy()
          return
        }
        handleRef.current = handle

        unsubs.push(
          handle.on('ready', () => {
            dispatch({ type: 'ready' })
            callbacksRef.current.onReady?.()
          }),
        )
        unsubs.push(
          handle.on('play', () => {
            dispatch({ type: 'play' })
            callbacksRef.current.onPlay?.()
          }),
        )
        unsubs.push(
          handle.on('pause', () => {
            dispatch({ type: 'pause' })
            callbacksRef.current.onPause?.()
          }),
        )
        unsubs.push(
          handle.on('ended', () => {
            if (endedFiredRef.current) return
            endedFiredRef.current = true
            dispatch({ type: 'ended' })
            callbacksRef.current.onEnded?.()
          }),
        )
        unsubs.push(
          handle.on('error', () => {
            dispatch({ type: 'error', error: new Error('Video playback failed') })
          }),
        )
        unsubs.push(handle.onProgress(throttledProgress))
      } catch (err) {
        if (cancelled) return
        const error =
          err instanceof Error ? err : new Error('Failed to mount video provider')
        dispatch({ type: 'error', error })
      }
    })()

    return () => {
      cancelled = true
      for (const u of unsubs) u()
      unsubs = []
      const handle = handleRef.current
      handleRef.current = null
      if (handle) handle.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey, autoPlay, loop, poster, mountVersion])

  const play = useCallback(() => {
    handleRef.current?.play()
  }, [])
  const pause = useCallback(() => {
    handleRef.current?.pause()
  }, [])
  const seek = useCallback((seconds: number) => {
    handleRef.current?.seek(seconds)
  }, [])
  const replay = useCallback(() => {
    const handle = handleRef.current
    if (!handle) {
      // No live handle (likely after an error) — re-mount.
      dispatch({ type: 'reset' })
      bumpMount()
      return
    }
    endedFiredRef.current = false
    handle.seek(0)
    handle.play()
    dispatch({ type: 'replay' })
  }, [])
  const skip = useCallback(() => {
    handleRef.current?.pause()
    // Skip transitions to 'ended' but does NOT fire onEnded — the component
    // wires onSkip separately.
    dispatch({ type: 'ended' })
  }, [])

  return {
    containerRef,
    state: internal.state,
    error: internal.error,
    controls: { play, pause, replay, seek, skip },
  }
}
