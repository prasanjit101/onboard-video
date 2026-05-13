import { describe, expect, test } from 'bun:test'
import { computePercent, throttle } from '../src/utils/progress'

describe('computePercent', () => {
  test('clamps to [0, 100]', () => {
    expect(computePercent(50, 100)).toBe(50)
    expect(computePercent(0, 100)).toBe(0)
    expect(computePercent(150, 100)).toBe(100)
    expect(computePercent(-5, 100)).toBe(0)
  })

  test('returns 0 when duration is unknown or zero', () => {
    expect(computePercent(10, 0)).toBe(0)
    expect(computePercent(10, Number.NaN)).toBe(0)
    expect(computePercent(10, Number.POSITIVE_INFINITY)).toBe(0)
  })
})

describe('throttle', () => {
  test('fires immediately on first call, suppresses calls within window', async () => {
    let calls: number[] = []
    const fn = throttle((n: number) => calls.push(n), 50)
    fn(1)
    fn(2)
    fn(3)
    // Leading call: 1 should be present; 2 and 3 collapsed into trailing.
    expect(calls).toEqual([1])
    await new Promise((r) => setTimeout(r, 80))
    // After window, the latest pending arg (3) fires.
    expect(calls).toEqual([1, 3])
  })

  test('separate windows fire independently', async () => {
    const calls: number[] = []
    const fn = throttle((n: number) => calls.push(n), 30)
    fn(1)
    await new Promise((r) => setTimeout(r, 50))
    fn(2)
    expect(calls).toEqual([1, 2])
  })
})
