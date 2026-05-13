import { useEffect, useRef, useState, type RefObject } from 'react'
import type { FloatingCorner } from '../types'
import { cornerOffset, nearestCorner } from './snap'

export interface UseDraggableFloatingOpts {
  /** When false, the hook is a no-op and returns identity refs. */
  enabled: boolean
  /** Corner the frame snaps to on first mount. */
  initialCorner: FloatingCorner
  /** Distance in px from the viewport edges when snapped. */
  margin: number
  /** Fires after each snap so consumers can react to corner changes. */
  onSnap?: (corner: FloatingCorner) => void
}

export interface UseDraggableFloatingReturn {
  /** Attach to the floating frame's outer element. */
  rootRef: RefObject<HTMLDivElement>
  /** Attach to the drag handle (e.g. a top-bar grip). */
  handleRef: RefObject<HTMLDivElement>
  /** Current top-left position in viewport coords. */
  position: { x: number; y: number }
  /** True while the user is actively dragging. */
  dragging: boolean
  /** Last settled corner. Useful for data-attribute styling. */
  corner: FloatingCorner
}

/**
 * Manages drag-and-snap behavior for a fixed-position floating frame. Uses
 * Pointer Events with pointer capture so a single set of listeners handles
 * mouse, touch, and pen consistently and survives the pointer leaving the
 * handle's box during a drag.
 *
 * The handle is responsible for the drag interaction (so clicks on the video
 * surface itself remain unaffected). On `pointerup` the frame snaps to the
 * nearest corner; CSS supplies the animation via a `transform` transition.
 */
export function useDraggableFloating(
  opts: UseDraggableFloatingOpts,
): UseDraggableFloatingReturn {
  const { enabled, initialCorner, margin, onSnap } = opts

  const rootRef = useRef<HTMLDivElement>(null!)
  const handleRef = useRef<HTMLDivElement>(null!)

  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [corner, setCorner] = useState<FloatingCorner>(initialCorner)

  // Mirror state into refs so pointer-event listeners don't need to be
  // re-attached on every render. The listeners read the latest values via
  // refs; React state drives renders.
  const positionRef = useRef(position)
  positionRef.current = position
  const cornerRef = useRef(corner)
  cornerRef.current = corner
  const marginRef = useRef(margin)
  marginRef.current = margin
  const onSnapRef = useRef(onSnap)
  onSnapRef.current = onSnap

  // Position the element at the initial corner once mounted, and re-snap when
  // the viewport resizes so the frame never strands off-screen.
  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return
    const root = rootRef.current
    if (!root) return

    const apply = (targetCorner: FloatingCorner) => {
      const r = root.getBoundingClientRect()
      const vp = { w: window.innerWidth, h: window.innerHeight }
      setPosition(cornerOffset(targetCorner, { w: r.width, h: r.height }, vp, marginRef.current))
    }

    // Defer one frame so the element's CSS-defined size is finalized before
    // we measure with getBoundingClientRect.
    const raf = requestAnimationFrame(() => apply(initialCorner))
    const onResize = () => apply(cornerRef.current)
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [enabled, initialCorner])

  // Pointer-event drag wiring on the handle. Stable across renders since deps
  // are limited to `enabled`; all mutable values flow through refs above.
  useEffect(() => {
    if (!enabled) return
    const handle = handleRef.current
    if (!handle) return

    const ctx = { active: false, startPX: 0, startPY: 0, startX: 0, startY: 0 }

    const onDown = (e: PointerEvent) => {
      // Mouse: primary button only. Touch/pen always counts.
      if (e.pointerType === 'mouse' && e.button !== 0) return
      try {
        handle.setPointerCapture(e.pointerId)
      } catch {
        /* test environments may not implement capture */
      }
      ctx.active = true
      ctx.startPX = e.clientX
      ctx.startPY = e.clientY
      ctx.startX = positionRef.current.x
      ctx.startY = positionRef.current.y
      setDragging(true)
      e.preventDefault()
    }

    const onMove = (e: PointerEvent) => {
      if (!ctx.active) return
      const root = rootRef.current
      if (!root) return
      const r = root.getBoundingClientRect()
      const vp = { w: window.innerWidth, h: window.innerHeight }
      const maxX = Math.max(0, vp.w - r.width)
      const maxY = Math.max(0, vp.h - r.height)
      const x = Math.min(Math.max(0, ctx.startX + (e.clientX - ctx.startPX)), maxX)
      const y = Math.min(Math.max(0, ctx.startY + (e.clientY - ctx.startPY)), maxY)
      setPosition({ x, y })
    }

    const onUp = (e: PointerEvent) => {
      if (!ctx.active) return
      ctx.active = false
      try {
        handle.releasePointerCapture(e.pointerId)
      } catch {
        /* not always supported */
      }
      const root = rootRef.current
      if (!root) {
        setDragging(false)
        return
      }
      const r = root.getBoundingClientRect()
      const vp = { w: window.innerWidth, h: window.innerHeight }
      const next = nearestCorner(
        positionRef.current,
        { w: r.width, h: r.height },
        vp,
        marginRef.current,
      )
      setCorner(next)
      setPosition(cornerOffset(next, { w: r.width, h: r.height }, vp, marginRef.current))
      setDragging(false)
      onSnapRef.current?.(next)
    }

    handle.addEventListener('pointerdown', onDown)
    handle.addEventListener('pointermove', onMove)
    handle.addEventListener('pointerup', onUp)
    handle.addEventListener('pointercancel', onUp)
    return () => {
      handle.removeEventListener('pointerdown', onDown)
      handle.removeEventListener('pointermove', onMove)
      handle.removeEventListener('pointerup', onUp)
      handle.removeEventListener('pointercancel', onUp)
    }
  }, [enabled])

  return { rootRef, handleRef, position, dragging, corner }
}
