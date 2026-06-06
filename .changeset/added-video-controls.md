---
'onboard-video': minor
---

Add interactive video controls (play/pause overlay button and progress timeline seek bar) enabled via the new `controls` prop. Also update the `onProgress` callback to pass three parameters: `(percent, duration, currentTime)` instead of just `percent`. Optimize draggable floating mode event listeners to bind to the window on pointer down.
