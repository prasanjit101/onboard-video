import { GlobalRegistrator } from '@happy-dom/global-registrator'

// Make `document`, `window`, and friends available in bun:test runs.
// Calling this once at preload time means every test file inherits the same
// DOM globals; resetting between tests would otherwise lose React's internals.
GlobalRegistrator.register({ url: 'http://localhost/' })

// Tell React this is an act-compatible test environment so `act()` works without
// the "not configured to support act(...)" warning.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true
