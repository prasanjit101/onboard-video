# `onboard-video` — Specification

A lightweight React library for embedding and controlling onboarding videos in SaaS apps. Supports Cloudinary, YouTube (via `lite-youtube-embed`), and plain MP4 sources behind one consistent API.

---

## 1. Goals

- **Tiny.** Under 6KB gzipped for the core path (component + hook + MP4 + Cloudinary + draggable/floating mode). YouTube provider loads on demand.
- **Fast first paint.** No video provider JS in the critical path. YouTube uses `lite-youtube-embed`, which only loads the heavy iframe after click. Cloudinary uses plain `<video>` with delivery URLs (no Cloudinary SDK).
- **Onboarding-shaped API.** First-class events for `onEnded`, `onSkip`, `allowSkipAfter`, and a separate opt-in hook for "has this user watched this video before."
- **Provider-agnostic.** Adding Vimeo or another provider later is a single new file implementing one interface.

## 2. Non-goals

- Not a full media player. No volume controls, no fullscreen, no playback-speed UI. Onboarding videos are muted and short.
- No built-in analytics. Consumer fires their own events via the callback props.
- No server-side persistence. The persistence hook is localStorage-only by default, with a pluggable storage adapter for those who want to swap in their own backend.
- No SSR rendering of the video itself (component renders nothing until mounted). Importing the package in SSR must not crash.

## 3. Public API

The library exports exactly three things from its main entry:

```ts
export { OnboardingVideo } from './component'
export { useOnboardingVideo } from './hook'
export { useVideoWatchState } from './persistence'

export type {
  VideoSource,
  OnboardingVideoProps,
  UseOnboardingVideoOptions,
  UseOnboardingVideoReturn,
  VideoState,
} from './types'
```

### 3.1 `VideoSource` (discriminated union)

```ts
type VideoSource =
  | { provider: 'cloudinary'; publicId: string; cloudName: string; transformations?: string }
  | { provider: 'cloudinary'; url: string }              // escape hatch for pre-built URLs
  | { provider: 'youtube'; videoId: string }
  | { provider: 'mp4'; src: string }
```

- Cloudinary structured form auto-applies `q_auto,f_auto` for format and quality optimization. Extra transformations can be appended via `transformations` (e.g. `"w_640,h_360,c_fill"`).
- All other providers take their natural identifier.

### 3.2 `<OnboardingVideo />` — opinionated component

```tsx
<OnboardingVideo
  source={source}                            // required, VideoSource
  poster={string}                            // optional; auto-derived if omitted
  autoPlay                                   // optional; forces muted=true
  loop                                       // optional
  allowSkipAfter={number | null}             // seconds before skip button appears; null = always show; undefined = no skip button
  onReady={() => void}
  onPlay={() => void}
  onPause={() => void}
  onProgress={(percent: number) => void}     // throttled to ~250ms
  onEnded={() => void}                       // fires once per playback
  onSkip={() => void}                        // user clicked skip
  className={string}
  style={CSSProperties}
  aspectRatio={'16/9' | '4/3' | '1/1' | string}  // default '16/9'
  draggable={boolean | DraggableConfig}     // floating PiP-style frame with snap-to-corner
/>
```

Renders a container with the video, a click-to-play overlay using the poster, and (if `allowSkipAfter` is set) a skip button that fades in after the threshold. No external styling dependency — minimal scoped CSS injected once via a `<style>` tag with a unique class prefix (`ov-`).

`DraggableConfig`:

```ts
type FloatingCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

interface DraggableConfig {
  initialCorner?: FloatingCorner    // default 'bottom-right'
  width?: number | string           // overrides the built-in 320px width
  margin?: number                   // inset from viewport edges; default 20
  onSnap?: (corner: FloatingCorner) => void
}
```

### 3.3 `useOnboardingVideo()` — headless hook

```ts
function useOnboardingVideo(options: {
  source: VideoSource
  autoPlay?: boolean
  loop?: boolean
  onReady?: () => void
  onPlay?: () => void
  onPause?: () => void
  onProgress?: (percent: number) => void
  onEnded?: () => void
}): {
  containerRef: RefObject<HTMLDivElement>
  state: VideoState               // 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'error'
  error: Error | null
  controls: {
    play: () => void
    pause: () => void
    replay: () => void
    seek: (seconds: number) => void
    skip: () => void              // sets state to 'ended', fires no onEnded; consumer handles next step
  }
}
```

The opinionated component is implemented in terms of this hook — `useOnboardingVideo` is not a parallel implementation, it is the foundation.

### 3.4 `useVideoWatchState()` — opt-in persistence

```ts
function useVideoWatchState(
  videoId: string,
  options?: { storage?: WatchStateStorage }
): {
  hasWatched: boolean
  markWatched: () => void
  reset: () => void
}

interface WatchStateStorage {
  get(key: string): boolean | Promise<boolean>
  set(key: string, value: boolean): void | Promise<void>
}
```

Default storage is `localStorage` under the key `onboard-video:watched:{videoId}`. Consumer can pass a custom storage adapter to back this with their own DB.

The hook does **not** automatically integrate with `<OnboardingVideo />` — the consumer is responsible for wiring `onEnded={markWatched}` and conditionally rendering. This keeps the two concerns decoupled.

## 4. Architecture

```
src/
├── index.ts                    # public exports only
├── types.ts                    # shared TypeScript types
├── component.tsx               # <OnboardingVideo />, built on useOnboardingVideo
├── hook.ts                     # useOnboardingVideo()
├── persistence.ts              # useVideoWatchState()
├── styles.ts                   # injectStyles() — runs once, scoped 'ov-' classnames
├── providers/
│   ├── index.ts                # resolveProvider(source) → VideoProvider
│   ├── types.ts                # VideoProvider, ProviderHandle interfaces
│   ├── mp4.ts                  # plain <video> element
│   ├── cloudinary.ts           # builds delivery URL, delegates to mp4
│   └── youtube.ts              # lite-youtube-embed wrapper, dynamic import
└── utils/
    ├── poster.ts               # derivePoster(source) for Cloudinary/YouTube
    ├── progress.ts             # throttle helper for onProgress
    └── url.ts                  # buildCloudinaryUrl()
```

### 4.1 Provider interface

```ts
interface VideoProvider {
  mount(container: HTMLElement, opts: ProviderMountOptions): Promise<ProviderHandle>
}

interface ProviderMountOptions {
  source: VideoSource
  autoPlay: boolean
  loop: boolean
  poster?: string
}

interface ProviderHandle {
  play(): void
  pause(): void
  seek(seconds: number): void
  destroy(): void
  on(event: ProviderEvent, cb: () => void): () => void   // returns unsubscribe
  // for progress events specifically:
  onProgress(cb: (percent: number) => void): () => void
}

type ProviderEvent = 'ready' | 'play' | 'pause' | 'ended' | 'error'
```

The hook calls `provider.mount(containerRef.current, opts)`, subscribes to events, and translates them into React state via `useReducer`. On unmount, calls `handle.destroy()`.

### 4.2 Provider implementations

**`mp4.ts`** — Creates an HTML5 `<video>` element with `playsinline`, `muted` (when autoPlay), and the source URL. Wires native events (`loadedmetadata` → ready, `play`, `pause`, `ended`, `error`, `timeupdate` → progress).

**`cloudinary.ts`** — Builds a URL via `buildCloudinaryUrl()`:
- Structured: `https://res.cloudinary.com/{cloudName}/video/upload/q_auto,f_auto/{transformations}/{publicId}.mp4`
- URL form: uses the URL as-is
Then delegates to the MP4 provider's mount function. Zero extra runtime code beyond URL construction.

**`youtube.ts`** — Dynamically imports `lite-youtube-embed`'s component on first mount:
```ts
await import('lite-youtube-embed')
await import('lite-youtube-embed/src/lite-yt-embed.css')
```
Renders a `<lite-youtube videoid={videoId}>` element. Listens for `pointerdown` to detect "user clicked to play" and at that point upgrades to a real YouTube iframe with the IFrame Player API so we can get reliable `onEnded`. This is the one place we accept some YouTube weight — but only after explicit user interaction.

Reliability layer: ignore duplicate `ended` events fired within 500ms of each other; YouTube occasionally double-fires when looping is involved.

### 4.3 Auto-poster derivation

`derivePoster(source)`:
- Cloudinary structured: `https://res.cloudinary.com/{cloudName}/video/upload/so_0,w_640/{publicId}.jpg`
- YouTube: `https://i.ytimg.com/vi/{videoId}/hqdefault.jpg`
- MP4: returns `undefined` (no auto-poster possible)

Used when the consumer doesn't pass an explicit `poster` prop.

## 5. Behavior — important details

### 5.1 Autoplay rules

- If `autoPlay` is true, the library forces the underlying element to be muted regardless of any other prop. Browsers block autoplay-with-sound; respecting this prevents silent failures.
- Dev-mode warning if `autoPlay` is true with no `playsinline` support (iOS Safari edge case).

### 5.2 `allowSkipAfter` semantics

- `undefined` → no skip button rendered.
- `0` → skip button visible immediately.
- `n` (number) → skip button hidden until `n` seconds of playback elapsed.
- `null` → skip button always visible.
- Clicking skip calls `controls.skip()`, which sets state to `'ended'` and fires `onSkip` (not `onEnded`).

### 5.3 State machine

```
idle → loading → ready → playing ⇄ paused → ended
                                 ↘ error
```

`controls.replay()` from `ended` returns to `playing` and resets `currentTime` to 0. Internal `endedFired` flag prevents `onEnded` from firing twice in a single play session.

### 5.4 Throttled progress

`onProgress` fires at most every 250ms. Implemented via a small `throttle()` in `utils/progress.ts`. Percent is `(currentTime / duration) * 100`, clamped to `[0, 100]`. For YouTube, duration may not be available until after ready — emit 0% until then.

### 5.5 Error handling

- Provider mount rejects → state becomes `'error'`, `error` is populated, opinionated component shows a minimal fallback (`"Video unavailable"` + retry button that re-mounts the provider).
- Network errors during playback → same path.
- Headless hook consumers handle the error state themselves.

### 5.6 SSR safety

- All provider mounting happens in `useEffect`, never during render.
- `injectStyles()` is guarded by `typeof document !== 'undefined'`.
- Importing the package on the server must not throw. Test this explicitly.

### 5.7 Draggable / floating mode

When `draggable` is set on `<OnboardingVideo />` the video renders as a
fixed-position floating frame instead of inline:

- The root container becomes `position: fixed` with a default `320px` width
  (capped at `90vw`), rounded corners, and a soft shadow.
- A thin top handle (28px tall) is rendered with a grip indicator. Pointer
  events are wired on the handle only — the video body, play overlay, skip
  button, and error retry remain clickable.
- Pointer Events with pointer capture (`setPointerCapture`) drive the drag, so
  mouse, touch, and stylus behave identically and the gesture survives the
  pointer leaving the handle's box.
- The position is applied via `transform: translate3d(x, y, 0)` (GPU-friendly,
  no layout). During drag, transitions are disabled (`data-dragging="true"`);
  on release, the frame animates to the nearest corner with a
  `cubic-bezier(0.22, 1, 0.36, 1)` ease over ~320ms.
- "Nearest corner" is computed from the squared distance between the frame's
  top-left and each corner anchor (`cornerOffset`). The four corner anchors
  are `margin` in from each viewport edge.
- On `window.resize` the frame re-snaps to its current corner so it never
  strands off-screen on viewport shrink or device rotation.
- `onSnap(corner)` fires on each settle, useful for syncing UI state.

State outside the floating mode is untouched: the same hook, the same state
machine, the same provider plumbing. Floating is purely a layout/UX layer.

## 6. Build & tooling

- **Bun** for everything: package manager, test runner, bundler.
- `package.json`:
  - `"type": "module"`
  - `"main"`: CJS build
  - `"module"`: ESM build
  - `"types"`: `.d.ts` entry
  - `"exports"` field with both CJS and ESM conditions
  - `"sideEffects": false` (enables tree-shaking of unused providers)
  - `peerDependencies`: `react >=18`, `react-dom >=18`
  - `dependencies`: none
  - `optionalDependencies`: `lite-youtube-embed` (consumer can pin a version; we load it dynamically)
- Build script: `bun build src/index.ts --outdir dist --target browser --format esm` and same for `cjs`. Generate types with `tsc --emitDeclarationOnly`.
- TypeScript strict mode on.

## 7. Testing

- **Bun test** for unit tests.
- **happy-dom** for the DOM environment (lighter than jsdom, works well with Bun).
- Test surface:
  - `buildCloudinaryUrl()` — structured form, URL form, with/without transformations.
  - `derivePoster()` — each provider.
  - `throttle()` utility.
  - `useVideoWatchState()` — get/set/reset, custom storage adapter.
  - `useOnboardingVideo()` with the MP4 provider — mount, play, pause, ended, error. Mock `HTMLVideoElement` methods.
  - State machine transitions.
  - SSR safety: render `<OnboardingVideo />` with `react-dom/server` and assert it doesn't throw.
- YouTube provider integration is hard to unit-test (depends on real network and `lite-youtube-embed`). Skip in CI; smoke-test manually.

## 8. Acceptance criteria

1. `bun install onboard-video` followed by:
   ```tsx
   <OnboardingVideo
     source={{ provider: 'cloudinary', publicId: 'demo', cloudName: 'demo' }}
     onEnded={() => console.log('done')}
   />
   ```
   renders, plays on click, fires `onEnded` when the video finishes.
2. Same with `{ provider: 'youtube', videoId: '...' }` — no YouTube JS loads on initial page render; the poster image renders immediately; clicking play loads the iframe and the rest of the library.
3. Same with `{ provider: 'mp4', src: '...' }` — works against a self-hosted MP4.
4. Headless hook example in the README renders a fully custom UI.
5. Built bundle measured: core path under 6KB gzipped (component + hook + MP4 + Cloudinary + draggable/floating), YouTube provider chunk under 3KB gzipped (excluding `lite-youtube-embed` itself).
6. `useVideoWatchState('my-video')` returns `hasWatched: false` initially, `true` after `markWatched()`, persists across page reload.
7. `bun test` passes; SSR test passes.
8. Importing the package in a Next.js server component does not throw.

## 9. Open questions for the implementer

- Whether to expose `controls.seek()` on the YouTube provider. The IFrame API supports it but adds complexity. **Default: yes, expose it; degrade gracefully if the API isn't loaded yet.**
- README example app: ship a `examples/` directory with a Vite app demonstrating all three providers, or just code snippets in the README? **Default: snippets only for v1; examples directory in v1.1.**
- Whether to ship a `<OnboardingFlow />` wrapper that chains multiple videos. **Out of scope for v1.** Consumer composes their own flow using `useVideoWatchState` + `<OnboardingVideo />`.

## 10. Out of scope for v1

- Vimeo, Wistia, Mux providers.
- Captions/subtitles UI.
- Native browser Picture-in-Picture API (the `draggable` prop covers the
  PiP-style UX without depending on the per-browser native PiP feature).
- Adaptive bitrate (HLS/DASH).
- Server-side analytics integration.
- A `<VideoFlow />` orchestration component.
