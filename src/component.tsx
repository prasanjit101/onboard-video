import { useEffect, useMemo, useRef, useState } from 'react'
import { useOnboardingVideo } from './hook'
import { injectStyles } from './styles'
import type { DraggableConfig, FloatingCorner, OnboardingVideoProps } from './types'
import { useDraggableFloating } from './utils/drag'
import { derivePoster } from './utils/poster'

/**
 * Opinionated onboarding-video component. Renders:
 *   - a container with the chosen aspect ratio
 *   - a poster overlay with a play button until first play
 *   - an auto-fading skip button (when `allowSkipAfter` is set)
 *   - a minimal error fallback with retry
 *   - an optional drag handle (when `draggable` is set) that lets the user
 *     reposition the floating frame to any viewport corner
 *
 * For full UI control, use `useOnboardingVideo()` directly.
 */
export function OnboardingVideo(props: OnboardingVideoProps): JSX.Element {
  const {
    source,
    poster,
    autoPlay,
    loop,
    allowSkipAfter,
    onReady,
    onPlay,
    onPause,
    onProgress,
    onEnded,
    onSkip,
    className,
    style,
    aspectRatio = '16/9',
    draggable,
  } = props

  // Inject scoped styles once on first mount. Safe on the server (no-ops).
  useEffect(() => {
    injectStyles()
  }, [])

  // Time since play started, for `allowSkipAfter` gating. We don't rely on the
  // progress callback alone (consumer might override it for analytics throttling).
  const [elapsedSec, setElapsedSec] = useState(0)
  const playStartRef = useRef<number | null>(null)
  const [retryNonce, setRetryNonce] = useState(0)

  const resolvedPoster = poster ?? derivePoster(source)

  const {
    containerRef,
    state,
    controls,
  } = useOnboardingVideo({
    source,
    autoPlay,
    loop,
    poster: resolvedPoster,
    onReady,
    onPlay: () => {
      if (playStartRef.current == null) playStartRef.current = Date.now()
      onPlay?.()
    },
    onPause,
    onProgress: (percent) => {
      // Track elapsed time alongside delegating to the consumer's callback.
      if (playStartRef.current != null) {
        setElapsedSec((Date.now() - playStartRef.current) / 1000)
      }
      onProgress?.(percent)
    },
    onEnded,
  })

  // Resolve the `draggable` prop into a normalized config (or null when off).
  // Memoized so the drag hook below sees a stable identity between renders.
  const dragConfig: (Required<Pick<DraggableConfig, 'initialCorner' | 'margin'>> &
    Pick<DraggableConfig, 'width' | 'onSnap'>) | null = useMemo(() => {
    if (!draggable) return null
    const c: DraggableConfig = draggable === true ? {} : draggable
    return {
      initialCorner: c.initialCorner ?? 'bottom-right',
      margin: c.margin ?? 20,
      width: c.width,
      onSnap: c.onSnap,
    }
  }, [draggable])

  const drag = useDraggableFloating({
    enabled: !!dragConfig,
    initialCorner: dragConfig?.initialCorner ?? ('bottom-right' as FloatingCorner),
    margin: dragConfig?.margin ?? 20,
    onSnap: dragConfig?.onSnap,
  })

  // Force a hook re-mount on retry: bumping retryNonce drives a remount via key.
  // (See the `key` prop on the render below.)
  void retryNonce

  // Skip-button visibility logic.
  const skipVisible = useMemo(() => {
    if (allowSkipAfter === undefined) return false
    if (allowSkipAfter === null) return true
    if (state !== 'playing' && state !== 'paused' && state !== 'ready') return false
    return elapsedSec >= allowSkipAfter
  }, [allowSkipAfter, elapsedSec, state])

  // The poster overlay is shown until the user (or autoPlay) starts playback.
  const showOverlay =
    state === 'idle' || state === 'loading' || state === 'ready'

  const handleOverlayClick = () => {
    controls.play()
  }

  const handleSkip = () => {
    controls.skip()
    onSkip?.()
  }

  const handleRetry = () => {
    setRetryNonce((n) => n + 1)
    controls.replay()
  }

  // CSS aspect-ratio supports a "/" form natively in modern browsers; fall back
  // to padding-bottom hack if you need IE compat (not a target for v1).
  const containerStyle: React.CSSProperties = {
    aspectRatio,
    ...style,
    ...(dragConfig
      ? {
          transform: `translate3d(${drag.position.x}px, ${drag.position.y}px, 0)`,
          ...(dragConfig.width !== undefined
            ? {
                width:
                  typeof dragConfig.width === 'number'
                    ? `${dragConfig.width}px`
                    : dragConfig.width,
              }
            : {}),
        }
      : {}),
  }

  return (
    <div
      ref={drag.rootRef}
      className={['ov-root', className].filter(Boolean).join(' ')}
      style={containerStyle}
      data-state={state}
      data-floating={dragConfig ? 'true' : undefined}
      data-dragging={dragConfig ? (drag.dragging ? 'true' : 'false') : undefined}
      data-corner={dragConfig ? drag.corner : undefined}
      key={retryNonce}
    >
      {dragConfig && (
        <div
          ref={drag.handleRef}
          className="ov-drag-handle"
          role="toolbar"
          aria-label="Drag video"
        >
          <span className="ov-drag-grip" aria-hidden="true" />
        </div>
      )}

      <div className="ov-stage" ref={containerRef} />

      {state === 'error' ? (
        <div className="ov-error" role="alert">
          <span>Video unavailable</span>
          <button
            type="button"
            className="ov-error-button"
            onClick={handleRetry}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div
            className="ov-overlay"
            data-hidden={!showOverlay}
            style={
              resolvedPoster
                ? { backgroundImage: `url('${resolvedPoster}')` }
                : undefined
            }
            onClick={handleOverlayClick}
            role="button"
            aria-label="Play video"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                controls.play()
              }
            }}
          >
            <span className="ov-play-button" aria-hidden="true">
              {'▶'}
            </span>
          </div>

          {allowSkipAfter !== undefined && (
            <button
              type="button"
              className="ov-skip"
              data-visible={skipVisible}
              onClick={handleSkip}
            >
              Skip
            </button>
          )}
        </>
      )}
    </div>
  )
}
