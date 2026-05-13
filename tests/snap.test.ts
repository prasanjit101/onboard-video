import { describe, expect, test } from 'bun:test'
import { FLOATING_CORNERS, cornerOffset, nearestCorner } from '../src/utils/snap'

const viewport = { w: 1000, h: 800 }
const rect = { w: 320, h: 180 }
const margin = 20

describe('cornerOffset', () => {
  test('top-left anchors to (margin, margin)', () => {
    expect(cornerOffset('top-left', rect, viewport, margin)).toEqual({
      x: 20,
      y: 20,
    })
  })

  test('top-right anchors to the right edge minus rect width and margin', () => {
    expect(cornerOffset('top-right', rect, viewport, margin)).toEqual({
      x: 1000 - 320 - 20,
      y: 20,
    })
  })

  test('bottom-left anchors to the bottom edge minus rect height and margin', () => {
    expect(cornerOffset('bottom-left', rect, viewport, margin)).toEqual({
      x: 20,
      y: 800 - 180 - 20,
    })
  })

  test('bottom-right anchors to the opposite corner', () => {
    expect(cornerOffset('bottom-right', rect, viewport, margin)).toEqual({
      x: 1000 - 320 - 20,
      y: 800 - 180 - 20,
    })
  })

  test('clamps to margin when viewport is smaller than the rect', () => {
    const tiny = { w: 200, h: 100 }
    expect(cornerOffset('bottom-right', rect, tiny, margin)).toEqual({
      x: 20,
      y: 20,
    })
  })
})

describe('nearestCorner', () => {
  test('finds top-left when close to origin', () => {
    expect(nearestCorner({ x: 30, y: 25 }, rect, viewport, margin)).toBe(
      'top-left',
    )
  })

  test('finds top-right when close to top-right anchor', () => {
    expect(nearestCorner({ x: 650, y: 25 }, rect, viewport, margin)).toBe(
      'top-right',
    )
  })

  test('finds bottom-left when close to bottom-left anchor', () => {
    expect(nearestCorner({ x: 30, y: 590 }, rect, viewport, margin)).toBe(
      'bottom-left',
    )
  })

  test('finds bottom-right when close to bottom-right anchor', () => {
    expect(nearestCorner({ x: 650, y: 590 }, rect, viewport, margin)).toBe(
      'bottom-right',
    )
  })

  test('returns a corner from the canonical list', () => {
    const c = nearestCorner({ x: 500, y: 400 }, rect, viewport, margin)
    expect(FLOATING_CORNERS).toContain(c)
  })
})
