import { describe, expect, test } from 'bun:test'
import { buildCloudinaryUrl } from '../src/utils/url'

describe('buildCloudinaryUrl', () => {
  test('structured form injects q_auto,f_auto defaults', () => {
    const url = buildCloudinaryUrl({
      provider: 'cloudinary',
      publicId: 'demo',
      cloudName: 'demo',
    })
    expect(url).toBe(
      'https://res.cloudinary.com/demo/video/upload/q_auto,f_auto/demo.mp4',
    )
  })

  test('appends extra transformations after defaults', () => {
    const url = buildCloudinaryUrl({
      provider: 'cloudinary',
      publicId: 'demo',
      cloudName: 'demo',
      transformations: 'w_640,h_360,c_fill',
    })
    expect(url).toBe(
      'https://res.cloudinary.com/demo/video/upload/q_auto,f_auto/w_640,h_360,c_fill/demo.mp4',
    )
  })

  test('URL escape-hatch is returned as-is', () => {
    const raw = 'https://example.com/custom.mp4'
    const url = buildCloudinaryUrl({ provider: 'cloudinary', url: raw })
    expect(url).toBe(raw)
  })
})
