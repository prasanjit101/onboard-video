# onboard-video

[![npm](https://img.shields.io/npm/v/onboard-video.svg)](https://www.npmjs.com/package/onboard-video)
[![bundle size](https://img.shields.io/bundlephobia/minzip/onboard-video)](https://bundlephobia.com/package/onboard-video)

A tiny React library for embedding onboarding videos from **Cloudinary**, **YouTube** (via `lite-youtube-embed`), or **plain MP4** behind one consistent API.

- **Core bundle: ~5 KB gzipped** (includes draggable/floating mode). YouTube provider loads on demand.
- **Onboarding-shaped API:** `onEnded`, `onSkip`, `allowSkipAfter`, plus an opt-in `useVideoWatchState` hook.
- **Provider-agnostic.** Adding Vimeo, Mux, or Wistia is a single new file.
- **SSR-safe.** Importing in a server component is a no-op until mount.

## Install

```sh
# npm
npm install onboard-video

# pnpm
pnpm add onboard-video

# bun
bun add onboard-video
```

If you use the `youtube` provider, also install the optional peer dependency:

```sh
npm install lite-youtube-embed
```

## Quick start

### Cloudinary

```tsx
import { OnboardingVideo } from "onboard-video";

<OnboardingVideo
  source={{
    provider: "cloudinary",
    publicId: "samples/sea-turtle",
    cloudName: "demo",
  }}
  onEnded={() => console.log("done")}
/>;
```

### YouTube (lazy-loaded)

```tsx
<OnboardingVideo
  source={{ provider: "youtube", videoId: "dQw4w9WgXcQ" }}
  allowSkipAfter={3}
  onSkip={() => console.log("skipped")}
  onEnded={() => console.log("done")}
/>
```

### MP4

```tsx
<OnboardingVideo
  source={{ provider: "mp4", src: "https://example.com/welcome.mp4" }}
/>
```

## API

### `<OnboardingVideo />`

| Prop                 | Type                                 | Notes                                                                                                                     |
| -------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `source`             | `VideoSource`                        | required, discriminated union                                                                                             |
| `poster`             | `string`                             | auto-derived for Cloudinary / YouTube if omitted                                                                          |
| `autoPlay`           | `boolean`                            | forces `muted=true` (browsers block autoplay-with-sound)                                                                  |
| `loop`               | `boolean`                            |                                                                                                                           |
| `allowSkipAfter`     | `number \| null \| undefined`        | seconds before Skip appears; `null` = always show; `undefined` = no skip button                                           |
| `onReady`            | `() => void`                         | provider mounted                                                                                                          |
| `onPlay`             | `() => void`                         |                                                                                                                           |
| `onPause`            | `() => void`                         |                                                                                                                           |
| `onProgress`         | `(percent: number) => void`          | throttled to ~250 ms                                                                                                      |
| `onEnded`            | `() => void`                         | fires once per playback                                                                                                   |
| `onSkip`             | `() => void`                         | user clicked skip; **does not** fire `onEnded`                                                                            |
| `aspectRatio`        | `'16/9' \| '4/3' \| '1/1' \| string` | default `'16/9'`                                                                                                          |
| `draggable`          | `boolean \| DraggableConfig`         | when set, video floats fixed-positioned; user drags it by the top handle and it animates to the nearest corner on release |
| `className`, `style` |                                      | passed to root container                                                                                                  |

#### `VideoSource`

```ts
type VideoSource =
  | {
      provider: "cloudinary";
      publicId: string;
      cloudName: string;
      transformations?: string;
    }
  | { provider: "cloudinary"; url: string }
  | { provider: "youtube"; videoId: string }
  | { provider: "mp4"; src: string };
```

Cloudinary structured form auto-applies `q_auto,f_auto`. Append extras via `transformations`, e.g. `"w_640,h_360,c_fill"`.

#### `DraggableConfig`

```ts
type FloatingCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface DraggableConfig {
  initialCorner?: FloatingCorner; // default 'bottom-right'
  width?: number | string; // default uses the built-in 320px
  margin?: number; // inset from viewport edges; default 20
  onSnap?: (corner: FloatingCorner) => void;
}
```

### Floating draggable mode

Set `draggable` to make the video a floating frame the user can drag around the screen. It snaps (with a spring-like animated transition) to whichever viewport corner is nearest when the user releases the pointer.

```tsx
<OnboardingVideo
  source={{ provider: 'mp4', src: '/welcome.mp4' }}
  draggable
/>

// or with options
<OnboardingVideo
  source={{ provider: 'youtube', videoId: 'dQw4w9WgXcQ' }}
  draggable={{
    initialCorner: 'top-right',
    width: 360,
    margin: 24,
    onSnap: (corner) => console.log('snapped to', corner),
  }}
/>
```

Notes:

- The drag grip sits at the top of the floating frame. Clicks on the video body (play, skip, retry) are unaffected — only the handle triggers dragging.
- Pointer Events with pointer capture are used so mouse, touch, and stylus all work the same way.
- The frame stays clamped inside the viewport and re-snaps to its current corner on window resize.

### `useOnboardingVideo()` — headless

For when you want full UI control:

```tsx
import { useOnboardingVideo } from "onboard-video";

function Custom() {
  const { containerRef, state, error, controls } = useOnboardingVideo({
    source: { provider: "mp4", src: "/intro.mp4" },
    onEnded: () => console.log("done"),
  });

  return (
    <div>
      <div ref={containerRef} style={{ width: 640, height: 360 }} />
      <p>State: {state}</p>
      {error && <p>Error: {error.message}</p>}
      <button onClick={controls.play}>Play</button>
      <button onClick={controls.pause}>Pause</button>
      <button onClick={() => controls.seek(10)}>Skip to 10s</button>
      <button onClick={controls.replay}>Replay</button>
    </div>
  );
}
```

State machine:

```
idle → loading → ready → playing ⇄ paused → ended
                                 ↘ error
```

### `useVideoWatchState()` — opt-in persistence

```tsx
import { OnboardingVideo, useVideoWatchState } from "onboard-video";

function WelcomeStep() {
  const { hasWatched, markWatched, reset } = useVideoWatchState("welcome-v1");

  if (hasWatched) {
    return <button onClick={reset}>Show me again</button>;
  }

  return (
    <OnboardingVideo
      source={{ provider: "youtube", videoId: "dQw4w9WgXcQ" }}
      onEnded={markWatched}
    />
  );
}
```

Default storage is `localStorage` under the key `onboard-video:watched:{videoId}`. Pass a custom adapter to back this with your own database:

```ts
useVideoWatchState("welcome-v1", {
  storage: {
    get: async (key) => api.get(`/preferences/${key}`),
    set: async (key, value) => api.put(`/preferences/${key}`, value),
  },
});
```

The persistence hook is **not** auto-wired into `<OnboardingVideo />` — you decide where to call `markWatched()` and how to conditionally render.

## Behavior notes

- **Autoplay** always forces `muted=true`. Browsers block autoplay-with-sound.
- **`allowSkipAfter`** semantics: `undefined` → no button; `0` → immediately visible; `n` → after `n` seconds of playback; `null` → always visible.
- **YouTube** renders a `lite-youtube` placeholder; clicking play upgrades to the real IFrame Player API so `onEnded` is reliable. Only the placeholder loads on initial render.
- **SSR-safe.** Importing in a server component never throws; nothing renders until mount.

## Browser support

Modern evergreen browsers. iOS Safari requires `playsinline` (always set). No IE support.

## License

MIT
