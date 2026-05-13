import type { CSSProperties, RefObject } from 'react'

/**
 * A source descriptor for the video. Discriminated by `provider`.
 *
 * Cloudinary can be specified either:
 *  - Structurally (publicId + cloudName + optional transformations), in which case
 *    the library builds a `q_auto,f_auto` delivery URL for you, or
 *  - As a pre-built URL escape hatch.
 */
export type VideoSource =
  | {
      provider: 'cloudinary'
      publicId: string
      cloudName: string
      transformations?: string
    }
  | { provider: 'cloudinary'; url: string }
  | { provider: 'youtube'; videoId: string }
  | { provider: 'mp4'; src: string }

/** Internal state machine values surfaced to consumers. */
export type VideoState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'error'

/** Aspect-ratio prop accepts the common shortcuts or any valid CSS aspect-ratio string. */
export type AspectRatio = '16/9' | '4/3' | '1/1' | (string & {})

/** Props accepted by the opinionated `<OnboardingVideo />` component. */
export interface OnboardingVideoProps {
  source: VideoSource
  poster?: string
  autoPlay?: boolean
  loop?: boolean
  /**
   * Seconds of playback before the skip button appears.
   *  - `undefined` → no skip button rendered
   *  - `0` → skip visible immediately
   *  - `n` → skip appears after n seconds
   *  - `null` → skip always visible
   */
  allowSkipAfter?: number | null
  onReady?: () => void
  onPlay?: () => void
  onPause?: () => void
  /** Fired at most every 250ms; argument is clamped to [0, 100]. */
  onProgress?: (percent: number) => void
  /** Fires once per playback. */
  onEnded?: () => void
  /** Fired when the user clicks the skip button. Does not fire `onEnded`. */
  onSkip?: () => void
  className?: string
  style?: CSSProperties
  aspectRatio?: AspectRatio
}

/** Options consumed by the headless `useOnboardingVideo` hook. */
export interface UseOnboardingVideoOptions {
  source: VideoSource
  autoPlay?: boolean
  loop?: boolean
  poster?: string
  onReady?: () => void
  onPlay?: () => void
  onPause?: () => void
  onProgress?: (percent: number) => void
  onEnded?: () => void
}

/** Return shape of the headless hook. */
export interface UseOnboardingVideoReturn {
  containerRef: RefObject<HTMLDivElement>
  state: VideoState
  error: Error | null
  controls: {
    play: () => void
    pause: () => void
    replay: () => void
    seek: (seconds: number) => void
    /** Skip: sets state to 'ended', does NOT fire onEnded. Consumer wires onSkip. */
    skip: () => void
  }
}

/** Storage adapter for the watch-state persistence hook. */
export interface WatchStateStorage {
  get(key: string): boolean | Promise<boolean>
  set(key: string, value: boolean): void | Promise<void>
}
