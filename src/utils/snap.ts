import type { FloatingCorner } from '../types'

/** All four corners, ordered for deterministic iteration in tests. */
export const FLOATING_CORNERS: readonly FloatingCorner[] = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
] as const

interface Size {
  w: number
  h: number
}
interface Point {
  x: number
  y: number
}

/**
 * Compute the top-left position (in viewport coordinates) the floating frame
 * should occupy when snapped to a given corner. `margin` is the inset from
 * each viewport edge. If the viewport is smaller than the frame, the result
 * clamps to `margin` so the frame remains visible.
 */
export function cornerOffset(
  corner: FloatingCorner,
  rect: Size,
  viewport: Size,
  margin: number,
): Point {
  const right = Math.max(margin, viewport.w - rect.w - margin)
  const bottom = Math.max(margin, viewport.h - rect.h - margin)
  switch (corner) {
    case 'top-left':
      return { x: margin, y: margin }
    case 'top-right':
      return { x: right, y: margin }
    case 'bottom-left':
      return { x: margin, y: bottom }
    case 'bottom-right':
      return { x: right, y: bottom }
  }
}

/**
 * Pick the corner whose anchor point is closest to the frame's current top-left
 * position. Squared distance is sufficient — we never need the actual distance.
 */
export function nearestCorner(
  pos: Point,
  rect: Size,
  viewport: Size,
  margin: number,
): FloatingCorner {
  let best: FloatingCorner = 'bottom-right'
  let bestDist = Infinity
  for (const c of FLOATING_CORNERS) {
    const o = cornerOffset(c, rect, viewport, margin)
    const dx = pos.x - o.x
    const dy = pos.y - o.y
    const d = dx * dx + dy * dy
    if (d < bestDist) {
      bestDist = d
      best = c
    }
  }
  return best
}
