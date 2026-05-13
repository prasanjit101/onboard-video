/**
 * Trailing-edge throttle: leading call runs immediately, subsequent calls during
 * the cooldown coalesce and fire once when the window expires with the latest args.
 *
 * Used to cap `onProgress` at ~one call per `wait` ms (default 250).
 */
export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait: number,
): (...args: Args) => void {
  let lastCall = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let pendingArgs: Args | null = null

  return (...args: Args) => {
    const now = Date.now()
    const remaining = wait - (now - lastCall)

    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      lastCall = now
      fn(...args)
      return
    }

    pendingArgs = args
    if (!timer) {
      timer = setTimeout(() => {
        lastCall = Date.now()
        timer = null
        if (pendingArgs) {
          fn(...pendingArgs)
          pendingArgs = null
        }
      }, remaining)
    }
  }
}

/** Compute playback percent, clamped to [0, 100]. Returns 0 if duration is unknown. */
export function computePercent(currentTime: number, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0
  const raw = (currentTime / duration) * 100
  if (raw < 0) return 0
  if (raw > 100) return 100
  return raw
}
