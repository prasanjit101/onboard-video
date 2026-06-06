import { useState, useRef, useEffect } from 'react'
import { OnboardingVideo, useOnboardingVideo, useVideoWatchState } from '../../src'
import 'lite-youtube-embed/src/lite-yt-embed.css'

interface LogEntry {
  id: string
  time: string
  msg: string
}

export default function App() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [headlessKey, setHeadlessKey] = useState(0) // used to remount headless video

  // Floating states for each player
  const [mp4Floating, setMp4Floating] = useState(false)
  const [mp4Corner, setMp4Corner] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('bottom-right')

  const [youtubeFloating, setYoutubeFloating] = useState(false)
  const [youtubeCorner, setYoutubeCorner] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('bottom-left')

  const [cloudinaryFloating, setCloudinaryFloating] = useState(false)
  const [cloudinaryCorner, setCloudinaryCorner] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('top-right')

  const [persistenceFloating, setPersistenceFloating] = useState(false)
  const [persistenceCorner, setPersistenceCorner] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('top-left')

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString()
    setLogs((prev) => [{ id: Math.random().toString(), time, msg }, ...prev].slice(0, 20))
  }

  // 1. Headless mode setup
  const {
    containerRef: headlessContainerRef,
    state: headlessState,
    error: headlessError,
    controls: headlessControls,
  } = useOnboardingVideo({
    source: {
      provider: 'mp4',
      src: 'https://res.cloudinary.com/demo/video/upload/dog.mp4',
    },
    key: headlessKey.toString(),
    onReady: () => addLog('Headless: Video ready'),
    onPlay: () => addLog('Headless: Playing'),
    onPause: () => addLog('Headless: Paused'),
    onProgress: (pct) => addLog(`Headless: Progress: ${Math.round(pct)}%`),
    onEnded: () => addLog('Headless: Ended'),
  })

  // 2. Watch State persistence setup
  const { hasWatched, markWatched, reset: resetWatchState } = useVideoWatchState('demo-watch-state-v1')

  return (
    <div className="container">
      <header>
        <h1>🎬 Onboard Video Playground</h1>
        <p className="subtitle">
          Interactive tester for <code>onboard-video</code>. Watch events fire in real-time below!
        </p>
      </header>

      {/* Real-time Event Logger */}
      <div className="card" style={{ background: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, textTransform: 'uppercase', fontSize: '1rem', letterSpacing: '0.05em' }}>📡 Live Event Stream</h3>
          <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setLogs([])}>
            Clear Logs
          </button>
        </div>
        <div className="logs-panel">
          {logs.length === 0 ? (
            <div style={{ color: '#888888', fontStyle: 'italic' }}>Interact with the players below to stream logs...</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="log-entry">
                <span style={{ color: '#666666', marginRight: '8px', fontWeight: 'bold' }}>[{log.time}]</span>
                {log.msg}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="demo-grid">
        {/* MP4 Player */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-mp4">MP4</span>
            <span style={{ fontSize: '0.8rem', color: '#666666' }}>allowSkipAfter=5</span>
          </div>
          <div>
            <h3 className="card-title">Standard MP4 Embed</h3>
            <p className="card-desc">Standard HTML5 video player with automatic fallback. Skip button appears after 5s.</p>
          </div>
          <div className="video-wrapper" style={{ minHeight: mp4Floating ? '180px' : 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {mp4Floating ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem' }}>Floating in <strong>{mp4Corner}</strong></p>
                <button className="btn btn-secondary" style={{ fontSize: '0.75rem' }} onClick={() => setMp4Floating(false)}>Dock Inline</button>
              </div>
            ) : (
              <OnboardingVideo
                source={{
                  provider: 'mp4',
                  src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                }}
                allowSkipAfter={5}
                controls
                onReady={() => addLog('MP4: Ready')}
                onPlay={() => addLog('MP4: Play')}
                onPause={() => addLog('MP4: Pause')}
                onProgress={(pct) => addLog(`MP4: Progress ${Math.round(pct)}%`)}
                onSkip={() => addLog('MP4: User skipped')}
                onEnded={() => addLog('MP4: Ended')}
              />
            )}
          </div>
          {!mp4Floating && (
            <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.75rem' }} onClick={() => setMp4Floating(true)}>Float Player</button>
          )}
        </div>

        {/* YouTube Player */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-youtube">YouTube</span>
            <span style={{ fontSize: '0.8rem', color: '#666666' }}>allowSkipAfter=3</span>
          </div>
          <div>
            <h3 className="card-title">YouTube Lite-Embed</h3>
            <p className="card-desc">Uses <code>lite-youtube-embed</code> placeholder. Loads the full YouTube iframe API on-demand.</p>
          </div>
          <div className="video-wrapper" style={{ minHeight: youtubeFloating ? '180px' : 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {youtubeFloating ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem' }}>Floating in <strong>{youtubeCorner}</strong></p>
                <button className="btn btn-secondary" style={{ fontSize: '0.75rem' }} onClick={() => setYoutubeFloating(false)}>Dock Inline</button>
              </div>
            ) : (
              <OnboardingVideo
                source={{
                  provider: 'youtube',
                  videoId: 'dQw4w9WgXcQ', // Rick Astley
                }}
                allowSkipAfter={3}
                controls
                onReady={() => addLog('YouTube: Ready')}
                onPlay={() => addLog('YouTube: Play')}
                onPause={() => addLog('YouTube: Pause')}
                onProgress={(pct) => addLog(`YouTube: Progress ${Math.round(pct)}%`)}
                onSkip={() => addLog('YouTube: User skipped')}
                onEnded={() => addLog('YouTube: Ended')}
              />
            )}
          </div>
          {!youtubeFloating && (
            <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.75rem' }} onClick={() => setYoutubeFloating(true)}>Float Player</button>
          )}
        </div>

        {/* Cloudinary Player */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-cloudinary">Cloudinary</span>
            <span style={{ fontSize: '0.8rem', color: '#666666' }}>always skip</span>
          </div>
          <div>
            <h3 className="card-title">Cloudinary Embed</h3>
            <p className="card-desc">Fetches video and auto-derives poster using Cloudinary's dynamic CDN transformations.</p>
          </div>
          <div className="video-wrapper" style={{ minHeight: cloudinaryFloating ? '180px' : 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {cloudinaryFloating ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem' }}>Floating in <strong>{cloudinaryCorner}</strong></p>
                <button className="btn btn-secondary" style={{ fontSize: '0.75rem' }} onClick={() => setCloudinaryFloating(false)}>Dock Inline</button>
              </div>
            ) : (
              <OnboardingVideo
                source={{
                  provider: 'cloudinary',
                  publicId: 'samples/sea-turtle',
                  cloudName: 'demo',
                }}
                allowSkipAfter={null} // always show
                controls
                onReady={() => addLog('Cloudinary: Ready')}
                onPlay={() => addLog('Cloudinary: Play')}
                onPause={() => addLog('Cloudinary: Pause')}
                onProgress={(pct) => addLog(`Cloudinary: Progress ${Math.round(pct)}%`)}
                onSkip={() => addLog('Cloudinary: User skipped')}
                onEnded={() => addLog('Cloudinary: Ended')}
              />
            )}
          </div>
          {!cloudinaryFloating && (
            <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.75rem' }} onClick={() => setCloudinaryFloating(true)}>Float Player</button>
          )}
        </div>

        {/* Persistence Hook demo */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-hook">Hook</span>
            <span style={{ fontSize: '0.8rem', color: '#666666' }}>useVideoWatchState</span>
          </div>
          <div>
            <h3 className="card-title">Persistence & Watch State</h3>
            <p className="card-desc">Tracks if a user has completed the onboarding. Retained across browser reloads.</p>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem', minHeight: '180px' }}>
            {hasWatched ? (
              <div style={{ textAlign: 'center', padding: '1rem', background: '#fafafa', border: '1px solid #111111', borderRadius: '2px' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>✓ Watched</div>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#666666' }}>The watch state is stored in localStorage.</p>
                <button className="btn btn-secondary" onClick={() => { resetWatchState(); addLog('WatchState: Reset watch state'); }}>
                  Reset Watch State
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="video-wrapper" style={{ minHeight: persistenceFloating ? '180px' : 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {persistenceFloating ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>
                      <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem' }}>Floating in <strong>{persistenceCorner}</strong></p>
                      <button className="btn btn-secondary" style={{ fontSize: '0.75rem' }} onClick={() => setPersistenceFloating(false)}>Dock Inline</button>
                    </div>
                  ) : (
                    <OnboardingVideo
                      source={{
                        provider: 'mp4',
                        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                      }}
                      controls
                      onEnded={() => {
                        markWatched()
                        addLog('WatchState: Video watched completely, state marked!')
                      }}
                    />
                  )}
                </div>
                {!persistenceFloating && (
                  <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.75rem' }} onClick={() => setPersistenceFloating(true)}>Float Player</button>
                )}
                <div style={{ fontSize: '0.8rem', color: '#666666', textAlign: 'center' }}>
                  Finish watching the video above to trigger <code>markWatched</code>.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Headless Player Custom UI */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-hook">Headless</span>
            <span className="state-badge">State: {headlessState}</span>
          </div>
          <div>
            <h3 className="card-title">Headless Custom Player</h3>
            <p className="card-desc">Fully customized controls layout using <code>useOnboardingVideo</code> API hook.</p>
          </div>
          <div className="video-wrapper" style={{ aspectRatio: '16/9' }} ref={headlessContainerRef} />
          {headlessError && <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>Error: {headlessError.message}</div>}
          <div className="btn-group">
            <button className="btn" onClick={() => headlessControls.play()}>Play</button>
            <button className="btn btn-secondary" onClick={() => headlessControls.pause()}>Pause</button>
            <button className="btn btn-secondary" onClick={() => headlessControls.seek(10)}>Seek 10s</button>
            <button className="btn btn-secondary" onClick={() => headlessControls.replay()}>Replay</button>
            <button className="btn btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => setHeadlessKey(k => k + 1)}>Reset</button>
          </div>
        </div>
      </div>

      {/* Floating Video Overlays */}
      {mp4Floating && (
        <OnboardingVideo
          source={{
            provider: 'mp4',
            src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          }}
          draggable={{
            initialCorner: 'bottom-right',
            margin: 24,
            width: 320,
            onSnap: (corner) => {
              setMp4Corner(corner)
              addLog(`MP4 Floating: Snapped to ${corner}`)
            },
          }}
          allowSkipAfter={5}
          controls
          onSkip={() => {
            setMp4Floating(false)
            addLog('MP4 Floating: Docked via skip')
          }}
          onReady={() => addLog('MP4 Floating: Ready')}
          onPlay={() => addLog('MP4 Floating: Play')}
          onPause={() => addLog('MP4 Floating: Pause')}
          onEnded={() => addLog('MP4 Floating: Ended')}
        />
      )}

      {youtubeFloating && (
        <OnboardingVideo
          source={{
            provider: 'youtube',
            videoId: 'dQw4w9WgXcQ',
          }}
          draggable={{
            initialCorner: 'bottom-left',
            margin: 24,
            width: 320,
            onSnap: (corner) => {
              setYoutubeCorner(corner)
              addLog(`YouTube Floating: Snapped to ${corner}`)
            },
          }}
          allowSkipAfter={3}
          controls
          onSkip={() => {
            setYoutubeFloating(false)
            addLog('YouTube Floating: Docked via skip')
          }}
          onReady={() => addLog('YouTube Floating: Ready')}
          onPlay={() => addLog('YouTube Floating: Play')}
          onPause={() => addLog('YouTube Floating: Pause')}
          onEnded={() => addLog('YouTube Floating: Ended')}
        />
      )}

      {cloudinaryFloating && (
        <OnboardingVideo
          source={{
            provider: 'cloudinary',
            publicId: 'samples/sea-turtle',
            cloudName: 'demo',
          }}
          draggable={{
            initialCorner: 'top-right',
            margin: 24,
            width: 320,
            onSnap: (corner) => {
              setCloudinaryCorner(corner)
              addLog(`Cloudinary Floating: Snapped to ${corner}`)
            },
          }}
          allowSkipAfter={null}
          controls
          onSkip={() => {
            setCloudinaryFloating(false)
            addLog('Cloudinary Floating: Docked via skip')
          }}
          onReady={() => addLog('Cloudinary Floating: Ready')}
          onPlay={() => addLog('Cloudinary Floating: Play')}
          onPause={() => addLog('Cloudinary Floating: Pause')}
          onEnded={() => addLog('Cloudinary Floating: Ended')}
        />
      )}

      {persistenceFloating && !hasWatched && (
        <OnboardingVideo
          source={{
            provider: 'mp4',
            src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          }}
          draggable={{
            initialCorner: 'top-left',
            margin: 24,
            width: 320,
            onSnap: (corner) => {
              setPersistenceCorner(corner)
              addLog(`Persistence Floating: Snapped to ${corner}`)
            },
          }}
          controls
          onSkip={() => {
            setPersistenceFloating(false)
            addLog('Persistence Floating: Docked via skip')
          }}
          onEnded={() => {
            markWatched()
            setPersistenceFloating(false)
            addLog('Persistence Floating: Video watched completely, state marked!')
          }}
          onReady={() => addLog('Persistence Floating: Ready')}
          onPlay={() => addLog('Persistence Floating: Play')}
          onPause={() => addLog('Persistence Floating: Pause')}
        />
      )}
    </div>
  )
}
