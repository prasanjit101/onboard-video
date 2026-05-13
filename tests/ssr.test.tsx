import { describe, expect, test } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { OnboardingVideo } from '../src/component'

describe('SSR safety', () => {
  test('renderToString does not throw for any provider', () => {
    expect(() =>
      renderToString(
        <OnboardingVideo
          source={{ provider: 'cloudinary', publicId: 'demo', cloudName: 'demo' }}
        />,
      ),
    ).not.toThrow()

    expect(() =>
      renderToString(
        <OnboardingVideo source={{ provider: 'youtube', videoId: 'abc123' }} />,
      ),
    ).not.toThrow()

    expect(() =>
      renderToString(
        <OnboardingVideo source={{ provider: 'mp4', src: 'demo.mp4' }} />,
      ),
    ).not.toThrow()
  })

  test('SSR output contains the root container with state=idle', () => {
    const html = renderToString(
      <OnboardingVideo
        source={{ provider: 'mp4', src: 'demo.mp4' }}
      />,
    )
    expect(html).toContain('ov-root')
    expect(html).toContain('data-state="idle"')
  })
})
