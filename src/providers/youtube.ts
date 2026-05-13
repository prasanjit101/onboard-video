import { computePercent } from '../utils/progress'
import type { ProviderEvent, VideoProvider } from './types'

/**
 * YouTube IFrame API state codes (from the public docs):
 *   -1 = unstarted, 0 = ended, 1 = playing, 2 = paused, 3 = buffering, 5 = cued.
 */
const YT_STATE_ENDED = 0
const YT_STATE_PLAYING = 1
const YT_STATE_PAUSED = 2

const YT_API_SRC = 'https://www.youtube.com/iframe_api'

/**
 * Cache the IFrame API load so multiple mounts share a single script tag and a
 * single `onYouTubeIframeAPIReady` callback.
 */
let iframeApiPromise: Promise<YouTubeApi> | null = null

interface YouTubeApi {
  Player: new (
    element: HTMLElement | string,
    options: {
      videoId: string
      playerVars?: Record<string, string | number>
      events?: {
        onReady?: (event: { target: YouTubePlayer }) => void
        onStateChange?: (event: { data: number; target: YouTubePlayer }) => void
        onError?: (event: { data: number }) => void
      },
    },
  ) => YouTubePlayer
}

interface YouTubePlayer {
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getCurrentTime(): number
  getDuration(): number
  destroy(): void
}

function loadIframeApi(): Promise<YouTubeApi> {
  if (iframeApiPromise) return iframeApiPromise
  iframeApiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    type WindowWithYT = typeof window & {
      YT?: YouTubeApi
      onYouTubeIframeAPIReady?: () => void
    }
    const w = window as WindowWithYT
    if (w.YT && w.YT.Player) {
      resolve(w.YT)
      return
    }
    const previous = w.onYouTubeIframeAPIReady
    w.onYouTubeIframeAPIReady = () => {
      previous?.()
      if (w.YT && w.YT.Player) resolve(w.YT)
      else reject(new Error('YouTube IFrame API failed to load'))
    }
    // If a script tag already exists, reuse it; otherwise inject one.
    const existing = document.querySelector(`script[src="${YT_API_SRC}"]`)
    if (!existing) {
      const tag = document.createElement('script')
      tag.src = YT_API_SRC
      tag.async = true
      tag.onerror = () => reject(new Error('Failed to load YouTube IFrame API'))
      document.head.appendChild(tag)
    }
  })
  return iframeApiPromise
}

/**
 * Tries to dynamically import `lite-youtube-embed` (the lightweight placeholder).
 * If it isn't installed in the consumer's project, we fall back to rendering the
 * IFrame directly — the API still works, we just lose the lite-embed niceties.
 */
async function tryLoadLiteEmbed(): Promise<boolean> {
  try {
    // Dynamic imports keep this out of the core bundle and let the consumer pin
    // their own version via `optionalDependencies`.
    await import(/* @vite-ignore */ 'lite-youtube-embed')
    try {
      await import(/* @vite-ignore */ 'lite-youtube-embed/src/lite-yt-embed.css')
    } catch {
      // CSS resolution may fail in some bundlers; not fatal.
    }
    return true
  } catch {
    return false
  }
}

export const youtubeProvider: VideoProvider = {
  async mount(container, opts) {
    if (opts.source.provider !== 'youtube') {
      throw new Error(`youtubeProvider received a ${opts.source.provider} source`)
    }
    const videoId = opts.source.videoId

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

    let player: YouTubePlayer | null = null
    let progressTimer: ReturnType<typeof setInterval> | null = null
    let lastEndedAt = 0
    let destroyed = false
    let pendingPlay = false

    // Reliability: YouTube occasionally double-fires 'ended' when looping is on.
    // Coalesce events within 500ms.
    const fireEnded = () => {
      const now = Date.now()
      if (now - lastEndedAt < 500) return
      lastEndedAt = now
      emit('ended')
    }

    const startProgressPolling = () => {
      if (progressTimer) return
      progressTimer = setInterval(() => {
        if (!player) return
        try {
          emitProgress(computePercent(player.getCurrentTime(), player.getDuration()))
        } catch {
          /* player not ready yet */
        }
      }, 250)
    }
    const stopProgressPolling = () => {
      if (progressTimer) {
        clearInterval(progressTimer)
        progressTimer = null
      }
    }

    /**
     * Build the real IFrame player. Called either on user click (lite-embed path)
     * or immediately when autoPlay is true / the lite-embed fallback is in use.
     */
    const upgradeToIframe = async () => {
      if (player || destroyed) return
      const api = await loadIframeApi()
      if (destroyed) return

      // Clear the placeholder so the IFrame slots in.
      container.innerHTML = ''
      const playerDiv = document.createElement('div')
      playerDiv.style.width = '100%'
      playerDiv.style.height = '100%'
      container.appendChild(playerDiv)

      const playerVars: Record<string, string | number> = {
        // Onboarding videos: hide branding chrome, autoplay if requested, mute
        // is mandatory for autoplay in modern browsers.
        autoplay: opts.autoPlay || pendingPlay ? 1 : 0,
        mute: opts.autoPlay ? 1 : 0,
        loop: opts.loop ? 1 : 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
      }
      // YouTube's loop=1 only works when paired with a playlist; the convention
      // is to set playlist to the same videoId so it loops itself.
      if (opts.loop) playerVars.playlist = videoId

      player = new api.Player(playerDiv, {
        videoId,
        playerVars,
        events: {
          onReady() {
            emit('ready')
            if (pendingPlay && player) {
              pendingPlay = false
              player.playVideo()
            }
          },
          onStateChange(event) {
            if (event.data === YT_STATE_PLAYING) {
              emit('play')
              startProgressPolling()
            } else if (event.data === YT_STATE_PAUSED) {
              emit('pause')
              stopProgressPolling()
            } else if (event.data === YT_STATE_ENDED) {
              stopProgressPolling()
              fireEnded()
            }
          },
          onError() {
            emit('error')
          },
        },
      })
    }

    // Render a lite-youtube placeholder if we can; otherwise fall through to a
    // poster image with a play button, which on click upgrades to the iframe.
    const liteLoaded = await tryLoadLiteEmbed()
    container.innerHTML = ''

    if (liteLoaded) {
      const lite = document.createElement('lite-youtube')
      lite.setAttribute('videoid', videoId)
      lite.setAttribute('style', 'width:100%;height:100%;display:block;')
      if (opts.poster) {
        // lite-youtube uses CSS background; setting a custom poster requires the
        // 'posterquality' or a direct style override. Keep it simple and trust
        // lite-youtube's own thumbnail logic if the consumer didn't override.
        lite.style.backgroundImage = `url('${opts.poster}')`
      }
      container.appendChild(lite)

      // First user gesture upgrades to the real iframe — this is the moment we
      // accept the YouTube weight.
      const onPointer = () => {
        lite.removeEventListener('pointerdown', onPointer)
        pendingPlay = true
        void upgradeToIframe()
      }
      lite.addEventListener('pointerdown', onPointer, { once: true })

      // The placeholder itself is "ready enough" to interact with.
      // Emit ready on next tick so listeners attached after mount() resolves still see it.
      queueMicrotask(() => {
        if (!destroyed) emit('ready')
      })
    } else {
      // No lite-embed: load the IFrame API immediately.
      void upgradeToIframe()
    }

    // If autoPlay was requested up front, kick off the iframe regardless.
    if (opts.autoPlay && liteLoaded) {
      void upgradeToIframe()
    }

    return {
      play() {
        if (player) {
          try {
            player.playVideo()
          } catch {
            /* not ready */
          }
        } else {
          pendingPlay = true
          void upgradeToIframe()
        }
      },
      pause() {
        if (player) {
          try {
            player.pauseVideo()
          } catch {
            /* not ready */
          }
        }
      },
      seek(seconds: number) {
        if (player) {
          try {
            player.seekTo(seconds, true)
          } catch {
            /* not ready */
          }
        }
        // If the iframe isn't loaded yet, silently degrade (per spec note 9.1).
      },
      destroy() {
        destroyed = true
        stopProgressPolling()
        if (player) {
          try {
            player.destroy()
          } catch {
            /* noop */
          }
          player = null
        }
        container.innerHTML = ''
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
  },
}
