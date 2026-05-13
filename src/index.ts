// Concrete imports followed by named re-exports. Pure `export { X } from './x'`
// chains tend to confuse bundlers (Bun's current bundler skips them entirely
// when nothing else in the entry file references them), so we bind to a local
// identifier first.
import { OnboardingVideo } from './component'
import { useOnboardingVideo } from './hook'
import { useVideoWatchState } from './persistence'

export { OnboardingVideo, useOnboardingVideo, useVideoWatchState }

export type {
  VideoSource,
  VideoState,
  OnboardingVideoProps,
  UseOnboardingVideoOptions,
  UseOnboardingVideoReturn,
  WatchStateStorage,
} from './types'
