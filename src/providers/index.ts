import type { VideoSource } from '../types'
import { cloudinaryProvider } from './cloudinary'
import { mp4Provider } from './mp4'
import type { VideoProvider } from './types'

/**
 * Map a `VideoSource` to its provider implementation.
 *
 * YouTube is loaded dynamically so the static bundle (and consumers who never
 * use YouTube) doesn't pay for the IFrame API plumbing. Cloudinary and MP4 are
 * tiny enough to stay in the main chunk.
 */
export async function resolveProvider(source: VideoSource): Promise<VideoProvider> {
  switch (source.provider) {
    case 'mp4':
      return mp4Provider
    case 'cloudinary':
      return cloudinaryProvider
    case 'youtube': {
      const mod = await import('./youtube')
      return mod.youtubeProvider
    }
  }
}
