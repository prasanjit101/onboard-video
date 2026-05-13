import { computePercent } from '../utils/progress'
import type { ProviderEvent, ProviderHandle, VideoProvider } from './types'

/**
 * Mount an HTML5 `<video>` element configured for onboarding video defaults:
 *  - `playsinline` so iOS doesn't take over the screen
 *  - `muted` when `autoPlay` (browsers block autoplay-with-sound)
 *  - inline poster if provided
 *
 * The MP4 provider is also used internally by the Cloudinary provider; the only
 * thing Cloudinary adds is URL construction.
 */
export function mountMp4Video(
  container: HTMLElement,
  src: string,
  opts: { autoPlay: boolean; loop: boolean; poster?: string },
): ProviderHandle {
  const video = document.createElement('video')
  video.src = src
  video.playsInline = true
  video.preload = 'metadata'
  video.loop = opts.loop
  if (opts.poster) video.poster = opts.poster
  if (opts.autoPlay) {
    // Browsers reliably allow autoplay only when muted; enforce it.
    video.muted = true
    video.autoplay = true
  }
  video.style.width = '100%'
  video.style.height = '100%'
  video.style.display = 'block'
  video.setAttribute('data-ov-element', 'video')

  container.appendChild(video)

  const listeners: Record<ProviderEvent, Set<() => void>> = {
    ready: new Set(),
    play: new Set(),
    pause: new Set(),
    ended: new Set(),
    error: new Set(),
  }
  const progressListeners: Set<(p: number) => void> = new Set()

  const emit = (event: ProviderEvent) => {
    for (const cb of listeners[event]) cb()
  }
  const emitProgress = (percent: number) => {
    for (const cb of progressListeners) cb(percent)
  }

  const onLoaded = () => emit('ready')
  const onPlay = () => emit('play')
  const onPause = () => emit('pause')
  const onEnded = () => emit('ended')
  const onError = () => emit('error')
  const onTimeUpdate = () => {
    emitProgress(computePercent(video.currentTime, video.duration))
  }

  video.addEventListener('loadedmetadata', onLoaded)
  video.addEventListener('play', onPlay)
  video.addEventListener('pause', onPause)
  video.addEventListener('ended', onEnded)
  video.addEventListener('error', onError)
  video.addEventListener('timeupdate', onTimeUpdate)

  return {
    play() {
      const p = video.play()
      // Swallow the autoplay-rejection promise; the consumer's onError listener
      // will fire via the native error event if the underlying load failed.
      if (p && typeof p.catch === 'function') p.catch(() => {})
    },
    pause() {
      video.pause()
    },
    seek(seconds: number) {
      try {
        video.currentTime = seconds
      } catch {
        // Some browsers throw if seeking before metadata is loaded; ignore.
      }
    },
    destroy() {
      video.removeEventListener('loadedmetadata', onLoaded)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('error', onError)
      video.removeEventListener('timeupdate', onTimeUpdate)
      try {
        video.pause()
      } catch {
        /* noop */
      }
      // Clear src to release decoder/network resources.
      video.removeAttribute('src')
      video.load?.()
      if (video.parentNode === container) container.removeChild(video)
    },
    on(event, cb) {
      listeners[event].add(cb)
      return () => listeners[event].delete(cb)
    },
    onProgress(cb) {
      progressListeners.add(cb)
      return () => progressListeners.delete(cb)
    },
  }
}

export const mp4Provider: VideoProvider = {
  async mount(container, opts) {
    if (opts.source.provider !== 'mp4') {
      throw new Error(`mp4Provider received a ${opts.source.provider} source`)
    }
    return mountMp4Video(container, opts.source.src, {
      autoPlay: opts.autoPlay,
      loop: opts.loop,
      poster: opts.poster,
    })
  },
}
