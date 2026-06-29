import { useEffect, useRef, useState, useCallback } from 'react';
import DailyIframe from '@daily-co/daily-js';
import { meetingsApi } from '../../services/meetings.api';

// ─── Icons ────────────────────────────────────────────────────────────────────

const IcoMic = ({ muted }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {muted ? (
      <>
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
        <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
      </>
    ) : (
      <>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
      </>
    )}
  </svg>
);

const IcoCamera = ({ off }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {off ? (
      <>
        <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34"/>
        <path d="M23 7l-7 5 7 5V7z"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </>
    ) : (
      <>
        <polygon points="23 7 16 12 23 17 23 7"/>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </>
    )}
  </svg>
);

const IcoScreen = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="13"/>
  </svg>
);

const IcoPhone = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-3.41m-2.7-5.24a19.42 19.42 0 0 1-1.07-3.5 2 2 0 0 1 2-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11l-1.27 1.27"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const IcoUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

// ─── Timer ────────────────────────────────────────────────────────────────────

function CallTimer() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
  const s = (elapsed % 60).toString().padStart(2, '0');
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em' }}>
      {h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`}
    </span>
  );
}

// ─── Control button ───────────────────────────────────────────────────────────

function CtrlBtn({ onClick, active, danger, children, label }) {
  const [hover, setHover] = useState(false);
  const bg = danger
    ? (hover ? '#DC2626' : '#EF4444')
    : active
      ? (hover ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)')
      : (hover ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.12)');
  const color = danger ? '#fff' : active ? '#fff' : '#FCA5A5';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title={label}
        style={{
          width: 52, height: 52, borderRadius: '50%',
          background: bg, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color, transition: 'all 0.15s cubic-bezier(0.4,0,0.2,1)',
          transform: hover ? 'scale(1.08)' : 'scale(1)',
          boxShadow: danger ? (hover ? '0 6px 20px rgba(239,68,68,0.5)' : '0 4px 14px rgba(239,68,68,0.35)') : 'none',
        }}
      >
        {children}
      </button>
      <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.42)', letterSpacing: '0.04em', fontWeight: 500 }}>
        {label}
      </span>
    </div>
  );
}

// ─── Main CallRoom ────────────────────────────────────────────────────────────

export default function CallRoom({ roomUrl, sessionId, title, onLeave }) {
  const containerRef  = useRef(null);
  const callFrameRef  = useRef(null);
  const [joined,      setJoined]      = useState(false);
  const [muted,       setMuted]       = useState(false);
  const [cameraOff,   setCameraOff]   = useState(false);
  const [sharing,     setSharing]     = useState(false);
  const [participants, setParticipants] = useState(0);
  const [error,       setError]       = useState('');

  // Build and join the Daily call frame
  useEffect(() => {
    if (!containerRef.current || !roomUrl) return;

    const frame = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: {
        width:    '100%',
        height:   '100%',
        border:   'none',
        borderRadius: '0',
      },
      showLeaveButton:  false,
      showFullscreenButton: false,
    });
    callFrameRef.current = frame;

    frame
      .on('joined-meeting',   (e) => { setJoined(true); setParticipants(Object.keys(e.participants || {}).length); })
      .on('left-meeting',     ()  => handleLeave())
      .on('participant-joined', () => setParticipants(p => p + 1))
      .on('participant-left',   () => setParticipants(p => Math.max(0, p - 1)))
      .on('error',            (e) => setError(e?.errorMsg || 'Call error occurred'))
      .join({ url: roomUrl });

    return () => {
      frame.destroy().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomUrl]);

  const handleLeave = useCallback(async () => {
    if (callFrameRef.current) {
      try { await callFrameRef.current.leave(); } catch (_) {}
      try { await callFrameRef.current.destroy(); } catch (_) {}
      callFrameRef.current = null;
    }
    if (sessionId) {
      await meetingsApi.updateCallStatus(sessionId, 'ended').catch(() => {});
    }
    onLeave?.();
  }, [sessionId, onLeave]);

  const toggleMic = useCallback(() => {
    if (!callFrameRef.current) return;
    callFrameRef.current.setLocalAudio(muted);
    setMuted(m => !m);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    if (!callFrameRef.current) return;
    callFrameRef.current.setLocalVideo(cameraOff);
    setCameraOff(c => !c);
  }, [cameraOff]);

  const toggleScreenShare = useCallback(async () => {
    if (!callFrameRef.current) return;
    try {
      if (sharing) {
        await callFrameRef.current.stopScreenShare();
        setSharing(false);
      } else {
        await callFrameRef.current.startScreenShare();
        setSharing(true);
      }
    } catch (_) {}
  }, [sharing]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0B1120',
      display: 'flex', flexDirection: 'column',
      animation: 'fadeIn 0.2s ease',
    }}>
      {/* ── Header bar ──────────────────────────────────────────── */}
      <div style={{
        height: 60, flexShrink: 0,
        background: 'rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 16,
      }}>
        {/* Logo mark */}
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
        }}>
          <span style={{ fontWeight: 900, fontSize: '0.85rem', color: '#fff' }}>S</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title || 'Team Call'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 1 }}>
            {joined && <CallTimer />}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: joined ? '#10B981' : '#F59E0B', display: 'inline-block', boxShadow: joined ? '0 0 0 3px rgba(16,185,129,0.2)' : 'none' }} />
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
                {joined ? 'Connected' : 'Connecting…'}
              </span>
            </div>
          </div>
        </div>

        {/* Participant count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
          <IcoUsers />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{participants}</span>
        </div>
      </div>

      {/* ── Call frame ──────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {/* Daily.co iframe mounts here */}
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Connecting overlay */}
        {!joined && !error && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 20, background: '#0B1120',
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366F150, #8B5CF650)',
              border: '2px solid rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'pulse-dot 2s infinite',
            }}>
              <span style={{ fontWeight: 900, fontSize: '1.6rem', color: '#818CF8' }}>S</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff', marginBottom: 6 }}>Joining call…</div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>Setting up your audio and video</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366F1', opacity: 0.6, animation: `pulse-dot 1.2s ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 16, background: '#0B1120',
          }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>Call error</div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', maxWidth: 320, textAlign: 'center' }}>{error}</div>
            <button onClick={handleLeave} style={{ marginTop: 8, padding: '10px 28px', borderRadius: 99, background: '#EF4444', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Leave
            </button>
          </div>
        )}
      </div>

      {/* ── Controls bar ────────────────────────────────────────── */}
      <div style={{
        height: 100, flexShrink: 0,
        background: 'rgba(255,255,255,0.04)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 16, padding: '0 24px',
      }}>
        <CtrlBtn onClick={toggleMic} active={!muted} label={muted ? 'Unmute' : 'Mute'}>
          <IcoMic muted={muted} />
        </CtrlBtn>

        <CtrlBtn onClick={toggleCamera} active={!cameraOff} label={cameraOff ? 'Start video' : 'Stop video'}>
          <IcoCamera off={cameraOff} />
        </CtrlBtn>

        <CtrlBtn onClick={toggleScreenShare} active={!sharing} label={sharing ? 'Stop share' : 'Share screen'}>
          <IcoScreen />
        </CtrlBtn>

        {/* End call — always prominent red */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginLeft: 8 }}>
          <button
            onClick={handleLeave}
            style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'linear-gradient(135deg, #DC2626, #EF4444)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', transition: 'all 0.15s',
              boxShadow: '0 4px 16px rgba(239,68,68,0.45)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(239,68,68,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(239,68,68,0.45)'; }}
            title="End call"
          >
            <IcoPhone />
          </button>
          <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.42)', letterSpacing: '0.04em', fontWeight: 500 }}>End call</span>
        </div>
      </div>
    </div>
  );
}
