'use client'

import { useState, useRef } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL

type Stage = 'idle' | 'loading' | 'previewing' | 'downloading' | 'done' | 'error'

export default function Home() {
  const [url, setUrl] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [shots, setShots] = useState<string[]>([])
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const isValidUrl = (v: string) => {
    try { new URL(v.startsWith('http') ? v : 'https://' + v); return true } catch { return false }
  }

  const handleCapture = async () => {
    if (!url.trim() || !isValidUrl(url)) {
      setError('Enter a valid URL to continue')
      return
    }
    setError('')
    setShots([])
    setStage('loading')
    setProgress('Launching browser...')

    try {
      const fullUrl = url.startsWith('http') ? url : 'https://' + url

      setTimeout(() => setProgress('Scrolling page to load all images...'), 1200)
      setTimeout(() => setProgress('Capturing each section...'), 4000)
      setTimeout(() => setProgress('Almost done...'), 8000)

      const res = await fetch(`${API}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fullUrl }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Capture failed')
      }

      const data = await res.json()
      setShots(data.shots)
      setStage('previewing')
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Try again.')
      setStage('error')
    }
  }

  const handleDownload = async () => {
    setStage('downloading')
    try {
      const fullUrl = url.startsWith('http') ? url : 'https://' + url
      const res = await fetch(`${API}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fullUrl }),
      })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'screenshots.zip'
      a.click()
      setStage('done')
    } catch (e: any) {
      setError(e.message)
      setStage('error')
    }
  }

  const reset = () => {
    setStage('idle')
    setUrl('')
    setShots([])
    setError('')
    setProgress('')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-5" style={{ paddingTop: '15vh' }}>

      {/* Ambient glow */}
      <div style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '400px',
        background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      {/* Hero */}
      <div className="text-center mb-12 animate-fade-up" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '100px', padding: '4px 12px', marginBottom: '24px'
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse-ring 2s infinite' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.01em', fontWeight: 400 }}>Free · No account needed</span>
        </div>

        <h1 style={{
          fontSize: 'clamp(40px, 7vw, 72px)',
          fontWeight: 700,
          letterSpacing: '-0.04em',
          lineHeight: 1.05,
          marginBottom: '16px',
          color: '#fff',
          fontFamily: "'Inter', -apple-system, 'SF Pro Display', sans-serif",
          fontFeatureSettings: "'ss01', 'cv01'",
        }}>
          Screenshot<br />any webpage.
        </h1>

        <p style={{
          fontSize: 19,
          color: 'rgba(255,255,255,0.5)',
          fontWeight: 300,
          letterSpacing: '-0.01em',
          lineHeight: 1.6,
          fontFamily: "'Inter', -apple-system, 'SF Pro Text', sans-serif",
          maxWidth: 380,
          margin: '0 auto',
        }}>
          Paste a URL. We scroll the full page, capture every section, and hand you a ZIP.
        </p>
      </div>

      {/* Input card */}
      {(stage === 'idle' || stage === 'error') && (
        <div className="animate-fade-up glass glow" style={{
          width: '100%', maxWidth: 560, borderRadius: 20, padding: '8px 8px 8px 20px',
          display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.3 }}>
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={e => { setUrl(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleCapture()}
            placeholder="https://behance.net/gallery/..."
            autoFocus
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#fff', fontSize: 15, fontFamily: 'inherit',
              caretColor: 'rgba(255,255,255,0.6)',
            }}
          />
          <button
            onClick={handleCapture}
            style={{
              background: '#fff', color: '#000', border: 'none', cursor: 'pointer',
              borderRadius: 12, padding: '10px 20px', fontSize: 14, fontWeight: 600,
              fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Capture →
          </button>
        </div>
      )}

      {error && (
        <p style={{ color: 'rgba(255,100,100,0.8)', fontSize: 13, marginTop: 10, zIndex: 1, position: 'relative' }}>{error}</p>
      )}

      {/* Loading state */}
      {stage === 'loading' && (
        <div className="animate-fade-up" style={{ textAlign: 'center', zIndex: 1, position: 'relative' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            border: '1.5px solid rgba(255,255,255,0.08)',
            borderTop: '1.5px solid rgba(255,255,255,0.6)',
            margin: '0 auto 20px',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{progress}</p>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 6 }}>This takes 15–30 seconds</p>
        </div>
      )}

      {/* Preview grid */}
      {stage === 'previewing' && shots.length > 0 && (
        <div className="animate-fade-up" style={{ width: '100%', maxWidth: 900, zIndex: 1, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>{shots.length} screenshots</span> captured
            </p>
            <button onClick={reset} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
              fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
            }}>New capture</button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 10, marginBottom: 20
          }}>
            {shots.map((b64, i) => (
              <div key={i} className="glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ position: 'relative' }}>
                  <img
                    src={`data:image/png;base64,${b64}`}
                    alt={`Screenshot ${i + 1}`}
                    style={{ width: '100%', display: 'block', aspectRatio: '16/9', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute', bottom: 6, left: 6,
                    background: 'rgba(0,0,0,0.6)', borderRadius: 6,
                    padding: '2px 7px', fontSize: 11, color: 'rgba(255,255,255,0.6)',
                    backdropFilter: 'blur(8px)'
                  }}>
                    {i + 1} / {shots.length}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleDownload}
            style={{
              width: '100%', background: '#fff', color: '#000', border: 'none',
              borderRadius: 14, padding: '16px', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Download all as ZIP ↓
          </button>
        </div>
      )}

      {/* Downloading */}
      {stage === 'downloading' && (
        <div className="animate-fade-up" style={{ textAlign: 'center', zIndex: 1, position: 'relative' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            border: '1.5px solid rgba(255,255,255,0.08)',
            borderTop: '1.5px solid rgba(255,255,255,0.6)',
            margin: '0 auto 20px',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Packaging your ZIP...</p>
        </div>
      )}

      {/* Done */}
      {stage === 'done' && (
        <div className="animate-fade-up" style={{ textAlign: 'center', zIndex: 1, position: 'relative' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p style={{ color: '#fff', fontSize: 17, fontWeight: 600, marginBottom: 6 }}>ZIP downloaded!</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 24 }}>Check your Downloads folder</p>
          <button onClick={reset} style={{
            background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, padding: '10px 24px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit'
          }}>
            Capture another →
          </button>
        </div>
      )}

      {/* Footer */}
      <div style={{
        position: 'fixed', bottom: 28, left: 0, right: 0, textAlign: 'center',
        color: 'rgba(255,255,255,0.15)', fontSize: 12, zIndex: 1
      }}>
        SnapFlow · Built by Mukundha, a cybersecurity enthusiast
      </div>

    </main>
  )
}
