import { buildCloudinaryUrl } from '../utils/url'
import { mountMp4Video } from './mp4'
import type { VideoProvider } from './types'

/**
 * Cloudinary provider — builds a delivery URL from a structured source (or uses
 * the provided URL for the escape-hatch form) and delegates rendering to the
 * MP4 provider. No Cloudinary SDK is loaded.
 */
export const cloudinaryProvider: VideoProvider = {
  async mount(container, opts) {
    if (opts.source.provider !== 'cloudinary') {
      throw new Error(`cloudinaryProvider received a ${opts.source.provider} source`)
    }
    const url = buildCloudinaryUrl(opts.source)
    return mountMp4Video(container, url, {
      autoPlay: opts.autoPlay,
      loop: opts.loop,
      poster: opts.poster,
    })
  },
}
