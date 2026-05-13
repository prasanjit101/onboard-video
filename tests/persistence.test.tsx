import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useVideoWatchState } from '../src/persistence'
import type { WatchStateStorage } from '../src/types'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  window.localStorage.clear()
})

/**
 * Tiny test harness that exposes the hook's return values to assertions.
 * Avoids depending on @testing-library to keep the test surface minimal.
 */
function Harness(props: {
  videoId: string
  storage?: WatchStateStorage
  onResult: (result: ReturnType<typeof useVideoWatchState>) => void
}) {
  const result = useVideoWatchState(props.videoId, { storage: props.storage })
  useEffect(() => {
    props.onResult(result)
  }, [result.hasWatched]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

async function flush() {
  // Wait one microtask + macrotask for effects + state updates to settle.
  await new Promise((r) => setTimeout(r, 0))
}

describe('useVideoWatchState', () => {
  test('starts false, becomes true after markWatched, persists', async () => {
    let latest!: ReturnType<typeof useVideoWatchState>
    act(() => {
      root.render(
        <Harness videoId="v1" onResult={(r) => (latest = r)} />,
      )
    })
    await flush()
    expect(latest.hasWatched).toBe(false)

    act(() => {
      latest.markWatched()
    })
    await flush()
    expect(latest.hasWatched).toBe(true)
    expect(window.localStorage.getItem('onboard-video:watched:v1')).toBe('1')

    // Re-mount: should hydrate from storage.
    act(() => {
      root.unmount()
    })
    root = createRoot(container)
    let latest2!: ReturnType<typeof useVideoWatchState>
    act(() => {
      root.render(
        <Harness videoId="v1" onResult={(r) => (latest2 = r)} />,
      )
    })
    await flush()
    expect(latest2.hasWatched).toBe(true)
  })

  test('reset clears watched state', async () => {
    let latest!: ReturnType<typeof useVideoWatchState>
    act(() => {
      root.render(
        <Harness videoId="v2" onResult={(r) => (latest = r)} />,
      )
    })
    await flush()
    act(() => {
      latest.markWatched()
    })
    await flush()
    expect(latest.hasWatched).toBe(true)
    act(() => {
      latest.reset()
    })
    await flush()
    expect(latest.hasWatched).toBe(false)
    expect(window.localStorage.getItem('onboard-video:watched:v2')).toBeNull()
  })

  test('custom storage adapter is used in place of localStorage', async () => {
    const store = new Map<string, boolean>()
    const adapter: WatchStateStorage = {
      get: (k) => !!store.get(k),
      set: (k, v) => {
        store.set(k, v)
      },
    }
    let latest!: ReturnType<typeof useVideoWatchState>
    act(() => {
      root.render(
        <Harness videoId="v3" storage={adapter} onResult={(r) => (latest = r)} />,
      )
    })
    await flush()
    act(() => {
      latest.markWatched()
    })
    await flush()
    expect(store.get('onboard-video:watched:v3')).toBe(true)
    expect(window.localStorage.getItem('onboard-video:watched:v3')).toBeNull()
  })
})
