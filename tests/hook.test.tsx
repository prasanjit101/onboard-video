import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useOnboardingVideo } from '../src/hook'
import type { UseOnboardingVideoReturn, VideoSource } from '../src/types'

/**
 * Hook integration tests use the MP4 provider against a stubbed `<video>` since
 * happy-dom doesn't run real media playback. We dispatch the native media
 * events manually to exercise the state machine.
 */

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
})

function Harness(props: {
  source: VideoSource
  onResult: (r: UseOnboardingVideoReturn) => void
  onEnded?: () => void
  onPlay?: () => void
}) {
  const result = useOnboardingVideo({
    source: props.source,
    onEnded: props.onEnded,
    onPlay: props.onPlay,
  })
  props.onResult(result)
  return <div ref={result.containerRef} data-testid="video-host" />
}

async function flushMicrotasks() {
  await new Promise((r) => setTimeout(r, 0))
  await new Promise((r) => setTimeout(r, 0))
}

function findVideo(): HTMLVideoElement {
  const el = container.querySelector('video')
  if (!el) throw new Error('Expected a <video> element to be mounted')
  return el as HTMLVideoElement
}

describe('useOnboardingVideo (mp4 provider)', () => {
  test('progresses idle → loading → ready → playing → ended', async () => {
    let latest!: UseOnboardingVideoReturn
    let endedCalls = 0

    act(() => {
      root.render(
        <Harness
          source={{ provider: 'mp4', src: 'demo.mp4' }}
          onResult={(r) => (latest = r)}
          onEnded={() => endedCalls++}
        />,
      )
    })
    // Inside act(), effects flush — so we land on 'loading' synchronously.
    expect(latest.state).toBe('loading')

    await flushMicrotasks()
    // Provider mount has resolved by now; state may stay at 'loading' until the
    // <video> fires its loadedmetadata event below.
    expect(['loading', 'ready']).toContain(latest.state)

    const video = findVideo()
    act(() => {
      video.dispatchEvent(new Event('loadedmetadata'))
    })
    expect(latest.state).toBe('ready')

    act(() => {
      video.dispatchEvent(new Event('play'))
    })
    expect(latest.state).toBe('playing')

    act(() => {
      video.dispatchEvent(new Event('ended'))
    })
    expect(latest.state).toBe('ended')
    expect(endedCalls).toBe(1)

    // Double-fire guard: a second `ended` should not retrigger the callback.
    act(() => {
      video.dispatchEvent(new Event('ended'))
    })
    expect(endedCalls).toBe(1)
  })

  test('skip() transitions to ended without firing onEnded', async () => {
    let latest!: UseOnboardingVideoReturn
    let endedCalls = 0

    act(() => {
      root.render(
        <Harness
          source={{ provider: 'mp4', src: 'demo.mp4' }}
          onResult={(r) => (latest = r)}
          onEnded={() => endedCalls++}
        />,
      )
    })
    await flushMicrotasks()
    const video = findVideo()
    act(() => {
      video.dispatchEvent(new Event('loadedmetadata'))
      video.dispatchEvent(new Event('play'))
    })
    expect(latest.state).toBe('playing')

    act(() => {
      latest.controls.skip()
    })
    expect(latest.state).toBe('ended')
    expect(endedCalls).toBe(0)
  })

  test('error event transitions to error state', async () => {
    let latest!: UseOnboardingVideoReturn

    act(() => {
      root.render(
        <Harness
          source={{ provider: 'mp4', src: 'demo.mp4' }}
          onResult={(r) => (latest = r)}
        />,
      )
    })
    await flushMicrotasks()
    const video = findVideo()
    act(() => {
      video.dispatchEvent(new Event('error'))
    })
    expect(latest.state).toBe('error')
    expect(latest.error).toBeInstanceOf(Error)
  })

  test('replay seeks to 0 and resets endedFired so onEnded can fire again', async () => {
    let latest!: UseOnboardingVideoReturn
    let endedCalls = 0

    act(() => {
      root.render(
        <Harness
          source={{ provider: 'mp4', src: 'demo.mp4' }}
          onResult={(r) => (latest = r)}
          onEnded={() => endedCalls++}
        />,
      )
    })
    await flushMicrotasks()
    const video = findVideo()
    act(() => {
      video.dispatchEvent(new Event('loadedmetadata'))
      video.dispatchEvent(new Event('play'))
      video.dispatchEvent(new Event('ended'))
    })
    expect(endedCalls).toBe(1)

    act(() => {
      latest.controls.replay()
    })
    expect(latest.state).toBe('playing')

    act(() => {
      video.dispatchEvent(new Event('ended'))
    })
    expect(endedCalls).toBe(2)
  })
})
