import type { VideoSource } from '../types'

/**
 * Build a Cloudinary video delivery URL from a structured `VideoSource`.
 *
 * Always injects `q_auto,f_auto` for automatic quality and format. If the consumer
 * passes additional `transformations`, those are appended as a second segment so
 * they compose with — rather than override — the defaults.
 *
 * Throws if called with the URL-form Cloudinary source; that variant should use
 * the `url` directly instead.
 */
export function buildCloudinaryUrl(
  source: Extract<VideoSource, { provider: 'cloudinary' }>,
): string {
  if ('url' in source) {
    return source.url
  }

  const { cloudName, publicId, transformations } = source
  const base = `https://res.cloudinary.com/${cloudName}/video/upload`
  const defaults = 'q_auto,f_auto'
  const extra = transformations ? `/${transformations}` : ''
  return `${base}/${defaults}${extra}/${publicId}.mp4`
}
