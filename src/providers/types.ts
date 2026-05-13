import type { VideoSource } from '../types'

/** Lifecycle events emitted by every provider. `progress` is delivered via its own callback. */
export type ProviderEvent = 'ready' | 'play' | 'pause' | 'ended' | 'error'

export interface ProviderMountOptions {
  source: VideoSource
  autoPlay: boolean
  loop: boolean
  poster?: string
}

/**
 * Handle returned by `provider.mount()`. The hook owns this handle for the
 * lifetime of the mount and calls `destroy()` on unmount.
 */
export interface ProviderHandle {
  play(): void
  pause(): void
  seek(seconds: number): void
  destroy(): void
  /** Subscribe to a lifecycle event. Returns an unsubscribe function. */
  on(event: ProviderEvent, cb: () => void): () => void
  /** Subscribe to progress updates. Returns an unsubscribe function. */
  onProgress(cb: (percent: number) => void): () => void
}

export interface VideoProvider {
  mount(container: HTMLElement, opts: ProviderMountOptions): Promise<ProviderHandle>
}
