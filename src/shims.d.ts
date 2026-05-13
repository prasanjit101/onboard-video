// Ambient module declarations for optional dependencies that don't ship types.
// These resolve at type-check time only; the runtime imports use dynamic
// `import()` so the modules are never required to be installed.

declare module 'lite-youtube-embed'
declare module 'lite-youtube-embed/src/lite-yt-embed.css'

// Augment JSX so `<lite-youtube>` doesn't error in TSX. The element is defined
// by the optional `lite-youtube-embed` custom element; we only need TypeScript
// to accept the tag.
declare namespace JSX {
  interface IntrinsicElements {
    'lite-youtube': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & { videoid?: string },
      HTMLElement
    >
  }
}
