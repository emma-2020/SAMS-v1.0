import { useState, useEffect, useCallback } from 'react';
import { meetingsApi } from '../../services/meetings.api';
import CallRoom from './CallRoom';

const ROLE_COLOR = {
  Admin:  '#7C3AED',
  Coach:  '#2563EB',
  Player: '#059669',
  Parent: '#D97706',
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

function CallerAvatar({ caller }) {
  const color = ROLE_COLOR[caller?.users?.role] || '#6366F1';
  const name  = caller?.profiles ? `${caller.users.first_name} ${caller.users.last_name}` : 'Someone';
  const inits = name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div style={{
      width: 88, height: 88, borderRadius: '50%',
      background: `linear-gradient(135deg, ${color}30, ${color}18)`,
      border: `3px solid ${color}50`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1.8rem', fontWeight: 900, color,
      boxShadow: `0 0 0 8px ${color}15, 0 0 0 16px ${color}08`,
      animation: 'pulse-ring 2s infinite',
      letterSpacing: '-0.02em',
      flexShrink: 0,
    }}>
      {inits}
    </div>
  );
}

// ─── IncomingCallModal ────────────────────────────────────────────────────────

export default function IncomingCallModal() {
  const [pendingCall, setPendingCall] = useState(null);
  const [activeCall,  setActiveCall]  = useState(null);
  const [declining,   setDeclining]   = useState(false);
  const [ringing,     setRinging]     = useState(false);

  // Poll for incoming calls every 2 seconds
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const calls = await meetingsApi.getPendingCalls();
        if (active && calls?.length > 0 && !pendingCall && !activeCall) {
          setPendingCall(calls[0]);
          setRinging(true);
        }
      } catch (_) {}
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => { active = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCall]);

  const handleAccept = useCallback(async () => {
    if (!pendingCall) return;
    await meetingsApi.updateCallStatus(pendingCall.id, 'active').catch(() => {});
    setActiveCall(pendingCall);
    setPendingCall(null);
    setRinging(false);
  }, [pendingCall]);

  const handleDecline = useCallback(async () => {
    if (!pendingCall || declining) return;
    setDeclining(true);
    await meetingsApi.updateCallStatus(pendingCall.id, 'ended').catch(() => {});
    setPendingCall(null);
    setRinging(false);
    setDeclining(false);
  }, [pendingCall, declining]);

  const handleLeave = useCallback(() => {
    setActiveCall(null);
    setPendingCall(null);
  }, []);

  // Active call takes over the screen
  if (activeCall) {
    return (
      <CallRoom
        roomUrl={activeCall.daily_room_url}
        sessionId={activeCall.id}
        title="Incoming Call"
        onLeave={handleLeave}
      />
    );
  }

  // Incoming ring screen
  if (!pendingCall) return null;

  const caller = pendingCall;
  const callerName = caller.users
    ? `${caller.users.first_name} ${caller.users.last_name}`
    : 'Someone';

  return (
    <>
      {/* Global pulse-ring keyframes */}
      <style>{`
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 8px rgba(99,102,241,0.18), 0 0 0 16px rgba(99,102,241,0.08); }
          50%  { box-shadow: 0 0 0 12px rgba(99,102,241,0.10), 0 0 0 24px rgba(99,102,241,0.04); }
          100% { box-shadow: 0 0 0 8px rgba(99,102,241,0.18), 0 0 0 16px rgba(99,102,241,0.08); }
        }
        @keyframes slide-up-call {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9990,
        background: 'rgba(11,17,32,0.65)',
        backdropFilter: 'blur(6px)',
      }} />

      {/* Ring card */}
      <div style={{
        position: 'fixed', bottom: 32, left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9991,
        width: 360,
        background: 'linear-gradient(145deg, #1E293B, #0F172A)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 24,
        padding: '32px 28px 28px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        animation: 'slide-up-call 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Caller avatar */}
        <CallerAvatar caller={caller} />

        {/* Caller info */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
            Incoming call
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#fff', letterSpacing: '-0.02em' }}>
            {callerName}
          </div>
          {caller.users?.role && (
            <div style={{ marginTop: 6, display: 'inline-block', padding: '2px 10px', borderRadius: 99, background: `${ROLE_COLOR[caller.users.role]}20`, border: `1px solid ${ROLE_COLOR[caller.users.role]}35` }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: ROLE_COLOR[caller.users.role] }}>
                {caller.users.role}
              </span>
            </div>
          )}
        </div>

        {/* Accept / Decline */}
        <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
          {/* Decline */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleDecline}
              disabled={declining}
              style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'linear-gradient(135deg, #DC2626, #EF4444)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(239,68,68,0.4)',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23"/>
                <path d="M16.5 16.5l-4.5-4.5-4.5 4.5"/>
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-3.41m-2.7-5.24a19.42 19.42 0 0 1-1.07-3.5 2 2 0 0 1 2-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11l-1.27 1.27"/>
              </svg>
            </button>
            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Decline</span>
          </div>

          {/* Accept */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleAccept}
              style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'linear-gradient(135deg, #059669, #10B981)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(16,185,129,0.45)',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.58 1.25h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </button>
            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Accept</span>
          </div>
        </div>
      </div>
    </>
  );
}
