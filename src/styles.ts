/**
 * One-time CSS injection for the opinionated component. All classnames are
 * scoped with the `ov-` prefix to avoid collisions with the host app's styles.
 *
 * Importing this module from SSR is safe — `injectStyles()` no-ops when there
 * is no document.
 */

const STYLE_ID = 'ov-styles'

const CSS = `
.ov-root {
  position: relative;
  width: 100%;
  background: #000;
  overflow: hidden;
  border-radius: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.ov-stage {
  position: relative;
  width: 100%;
  height: 100%;
}
.ov-stage > video,
.ov-stage > lite-youtube,
.ov-stage > iframe {
  width: 100%;
  height: 100%;
  display: block;
}
.ov-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-size: cover;
  background-position: center;
  background-color: #000;
  cursor: pointer;
  transition: opacity 200ms ease;
}
.ov-overlay[data-hidden="true"] {
  pointer-events: none;
  opacity: 0;
}
.ov-play-button {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  border: 2px solid rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 28px;
  line-height: 1;
  padding-left: 4px;
  cursor: pointer;
  transition: transform 150ms ease, background 150ms ease;
}
.ov-play-button:hover {
  background: rgba(0, 0, 0, 0.75);
  transform: scale(1.05);
}
.ov-skip {
  position: absolute;
  right: 12px;
  bottom: 12px;
  padding: 8px 14px;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 200ms ease, transform 200ms ease, background 150ms ease;
  pointer-events: none;
}
.ov-skip[data-visible="true"] {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
.ov-skip:hover {
  background: rgba(0, 0, 0, 0.85);
}
.ov-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #fff;
  background: #111;
  padding: 16px;
  text-align: center;
}
.ov-error-button {
  padding: 8px 16px;
  border-radius: 6px;
  background: #fff;
  color: #000;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
`

let injected = false

/** Inject scoped styles once per document. No-op in non-browser environments. */
export function injectStyles(): void {
  if (injected) return
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) {
    injected = true
    return
  }
  const tag = document.createElement('style')
  tag.id = STYLE_ID
  tag.textContent = CSS
  document.head.appendChild(tag)
  injected = true
}
