---
'onboard-video': minor
---

Add `draggable` prop to `<OnboardingVideo>` for a floating picture-in-picture frame. Pass `draggable` (true for defaults, or a `DraggableConfig` object) to render the video fixed-positioned with a top-bar drag handle; on release, the frame snaps to the nearest viewport corner with an animated transition. Config options: `initialCorner`, `width`, `margin`, and `onSnap` callback. Inline rendering is unchanged when `draggable` is omitted.
