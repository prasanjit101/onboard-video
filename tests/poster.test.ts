import { describe, expect, test } from 'bun:test'
import { derivePoster } from '../src/utils/poster'

describe('derivePoster', () => {
  test('cloudinary structured form derives a frame URL', () => {
    expect(
      derivePoster({ provider: 'cloudinary', publicId: 'demo', cloudName: 'demo' }),
    ).toBe('https://res.cloudinary.com/demo/video/upload/so_0,w_640/demo.jpg')
  })

  test('cloudinary URL form returns undefined (no publicId)', () => {
    expect(
      derivePoster({ provider: 'cloudinary', url: 'https://example.com/v.mp4' }),
    ).toBeUndefined()
  })

  test('youtube uses ytimg CDN', () => {
    expect(derivePoster({ provider: 'youtube', videoId: 'abc123' })).toBe(
      'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
    )
  })

  test('mp4 returns undefined', () => {
    expect(derivePoster({ provider: 'mp4', src: 'video.mp4' })).toBeUndefined()
  })
})
