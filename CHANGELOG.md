# onboard-video

## 0.2.0

### Minor Changes

- 9282dff: Add interactive video controls (play/pause overlay button and progress timeline seek bar) enabled via the new `controls` prop. Also update the `onProgress` callback to pass three parameters: `(percent, duration, currentTime)` instead of just `percent`. Optimize draggable floating mode event listeners to bind to the window on pointer down.
- 2669dd8: Add `draggable` prop to `<OnboardingVideo>` for a floating picture-in-picture frame. Pass `draggable` (true for defaults, or a `DraggableConfig` object) to render the video fixed-positioned with a top-bar drag handle; on release, the frame snaps to the nearest viewport corner with an animated transition. Config options: `initialCorner`, `width`, `margin`, and `onSnap` callback. Inline rendering is unchanged when `draggable` is omitted.

## 0.2.0-beta.0

### Minor Changes

- 2669dd8: Add `draggable` prop to `<OnboardingVideo>` for a floating picture-in-picture frame. Pass `draggable` (true for defaults, or a `DraggableConfig` object) to render the video fixed-positioned with a top-bar drag handle; on release, the frame snaps to the nearest viewport corner with an animated transition. Config options: `initialCorner`, `width`, `margin`, and `onSnap` callback. Inline rendering is unchanged when `draggable` is omitted.
