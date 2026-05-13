import type { VideoSource } from '../types'

/**
 * Derive a poster image URL for the given source where the provider can supply
 * one cheaply (Cloudinary frame extraction, YouTube thumbnail CDN). MP4 has no
 * universal way to derive a poster — returns `undefined` so the consumer can
 * pass one explicitly.
 */
export function derivePoster(source: VideoSource): string | undefined {
  if (source.provider === 'cloudinary') {
    if ('url' in source) {
      // URL-form has no structured publicId to build a poster from.
      return undefined
    }
    return `https://res.cloudinary.com/${source.cloudName}/video/upload/so_0,w_640/${source.publicId}.jpg`
  }

  if (source.provider === 'youtube') {
    return `https://i.ytimg.com/vi/${source.videoId}/hqdefault.jpg`
  }

  return undefined
}
