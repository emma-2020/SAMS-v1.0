'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { meetingsApi } from '@sams/api';
import type { Meeting, AcademyMember, CallSession } from '@sams/api';
import { useAuthStore } from '@sams/store';

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IcoVideo = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>;
const IcoPlus = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoClock = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IcoUsers = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IcoPhone = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.58 1.25h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const IcoPhoneOff = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.5 16.5l-4.5-4.5-4.5 4.5"/><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-3.41m-2.7-5.24a19.42 19.42 0 0 1-1.07-3.5 2 2 0 0 1 2-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11l-1.27 1.27"/></svg>;
const IcoMic = (p: { off?: boolean }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{p.off ? <><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></> : <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>}</svg>;
const IcoCam = (p: { off?: boolean }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{p.off ? <><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56"/></> : <><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></>}</svg>;
const IcoShare = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
const IcoX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function isUpcoming(iso: string) {
  return new Date(iso) > new Date();
}

function Avatar({ name, size = 28, color = '#6366F1' }: { name: string; size?: number; color?: string }) {
  const init = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: `${color}18`, border: `1.5px solid ${color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.35), fontWeight: 800, color }}>
      {init}
    </div>
  );
}

// ─── CallRoom — embeds Daily.co inside SAMS ────────────────────────────────────
function CallRoom({ roomUrl, sessionId, title, onLeave }: { roomUrl: string; sessionId?: string; title: string; onLeave: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef     = useRef<any>(null);
  const [muted,    setMuted]    = useState(false);
  const [camOff,   setCamOff]   = useState(false);
  const [elapsed,  setElapsed]  = useState(0);
  const [status,   setStatus]   = useState<'connecting' | 'connected'>('connecting');

  useEffect(() => {
    if (!containerRef.current) return;
    let frame: any;
    import('@daily-co/daily-js').then(mod => {
      const DailyIframe = mod.default ?? mod;
      frame = DailyIframe.createFrame(containerRef.current!, {
        iframeStyle: { width: '100%', height: '100%', border: 'none' },
        showLeaveButton: false,
        showFullscreenButton: false,
      });
      frameRef.current = frame;
      frame.on('joined-meeting', () => setStatus('connected'));
      frame.join({ url: roomUrl }).catch(console.error);
    });
    const timer = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => {
      clearInterval(timer);
      if (frame) { frame.leave().catch(() => {}); frame.destroy(); }
    };
  }, [roomUrl]);

  async function handleLeave() {
    if (frameRef.current) { await frameRef.current.leave().catch(() => {}); frameRef.current.destroy(); }
    if (sessionId) await meetingsApi.updateCallStatus(sessionId, 'ended').catch(() => {});
    onLeave();
  }

  function toggleMute() {
    if (!frameRef.current) return;
    const next = !muted;
    frameRef.current.setLocalAudio(!next);
    setMuted(next);
  }
  function toggleCam() {
    if (!frameRef.current) return;
    const next = !camOff;
    frameRef.current.setLocalVideo(!next);
    setCamOff(next);
  }
  function shareScreen() {
    if (!frameRef.current) return;
    frameRef.current.startScreenShare().catch(() => {});
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#080C16', display: 'flex', flexDirection: 'column' }}>
      {/* SAMS branded header */}
      <div style={{ height: 56, background: 'rgba(15,23,42,0.95)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, flexShrink: 0 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IcoVideo />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>{mm}:{ss} · {status === 'connected' ? 'Connected' : 'Connecting…'}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={toggleMute} style={{ width: 40, height: 40, borderRadius: '50%', background: muted ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)', border: `1px solid ${muted ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.15)'}`, color: muted ? '#EF4444' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IcoMic off={muted} />
          </button>
          <button onClick={toggleCam} style={{ width: 40, height: 40, borderRadius: '50%', background: camOff ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)', border: `1px solid ${camOff ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.15)'}`, color: camOff ? '#EF4444' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IcoCam off={camOff} />
          </button>
          <button onClick={shareScreen} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IcoShare />
          </button>
          <button onClick={handleLeave} style={{ height: 40, padding: '0 20px', borderRadius: 10, background: 'linear-gradient(135deg,#DC2626,#EF4444)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            <IcoPhoneOff /> End
          </button>
        </div>
      </div>
      {/* Daily.co iframe container */}
      <div ref={containerRef} style={{ flex: 1, background: '#080C16' }} />
    </div>
  );
}

// ─── IncomingCallModal ─────────────────────────────────────────────────────────
function IncomingCallModal() {
  const [pending,   setPending]   = useState<CallSession | null>(null);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [declining,  setDeclining]  = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const calls = await meetingsApi.getPendingCalls();
        if (alive && calls.length > 0 && !pending && !activeCall) setPending(calls[0]);
      } catch (_) {}
    };
    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => { alive = false; if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCall]);

  const accept = useCallback(async () => {
    if (!pending) return;
    await meetingsApi.updateCallStatus(pending.id, 'active').catch(() => {});
    setActiveCall(pending);
    setPending(null);
  }, [pending]);

  const decline = useCallback(async () => {
    if (!pending || declining) return;
    setDeclining(true);
    await meetingsApi.updateCallStatus(pending.id, 'ended').catch(() => {});
    setPending(null);
    setDeclining(false);
  }, [pending, declining]);

  if (activeCall) {
    return <CallRoom roomUrl={activeCall.daily_room_url} sessionId={activeCall.id} title="Incoming Call" onLeave={() => setActiveCall(null)} />;
  }
  if (!pending) return null;

  const caller = pending.users;
  const callerName = caller ? `${caller.first_name} ${caller.last_name}` : 'Someone';

  return (
    <>
      <style>{`
        @keyframes pulse-ring { 0%,100% { box-shadow: 0 0 0 8px rgba(99,102,241,.18),0 0 0 16px rgba(99,102,241,.08); } 50% { box-shadow: 0 0 0 12px rgba(99,102,241,.10),0 0 0 24px rgba(99,102,241,.04); } }
        @keyframes slide-up-call { from { transform: translate(-50%,30px); opacity:0; } to { transform: translate(-50%,0); opacity:1; } }
      `}</style>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9990, background: 'rgba(11,17,32,.6)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'fixed', bottom: 32, left: '50%', zIndex: 9991, width: 340, background: 'linear-gradient(145deg,#1E293B,#0F172A)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 24, padding: '28px 24px 24px', boxShadow: '0 32px 80px rgba(0,0,0,.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, animation: 'slide-up-call .3s cubic-bezier(.34,1.56,.64,1) forwards' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F120,#8B5CF615)', border: '2.5px solid #6366F140', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 900, color: '#818CF8', animation: 'pulse-ring 2s infinite' }}>
          {callerName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: 5 }}>Incoming call</div>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff', letterSpacing: '-.02em' }}>{callerName}</div>
          {caller?.role && <div style={{ fontSize: '0.7rem', color: '#818CF8', marginTop: 4 }}>{caller.role}</div>}
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <button onClick={decline} disabled={declining} style={{ width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(135deg,#DC2626,#EF4444)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 16px rgba(239,68,68,.4)' }}>
              <IcoPhoneOff />
            </button>
            <span style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.35)', fontWeight: 500 }}>Decline</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <button onClick={accept} style={{ width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(135deg,#059669,#10B981)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 16px rgba(16,185,129,.45)' }}>
              <IcoPhone />
            </button>
            <span style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.35)', fontWeight: 500 }}>Accept</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Schedule Meeting Modal ────────────────────────────────────────────────────
function ScheduleModal({ members, onClose, onCreated }: { members: AcademyMember[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ title: '', agenda: '', date: '', time: '14:00', duration: '60' });
  const [selected, setSelected] = useState<string[]>(members.map(m => m.id));
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function toggleMember(id: string) {
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setErr('Title is required'); return; }
    if (!form.date) { setErr('Date is required'); return; }
    if (selected.length === 0) { setErr('Select at least one attendee'); return; }
    setSaving(true); setErr('');
    try {
      const scheduledAt = new Date(`${form.date}T${form.time}:00`).toISOString();
      await meetingsApi.createMeeting({ title: form.title.trim(), agenda: form.agenda.trim() || undefined, scheduledAt, durationMinutes: parseInt(form.duration), attendeeIds: selected });
      onCreated();
      onClose();
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Failed to create meeting');
    } finally { setSaving(false); }
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 8001, width: 560, maxWidth: 'calc(100vw - 32px)', maxHeight: '90vh', background: 'var(--bg-surface)', borderRadius: 20, boxShadow: '0 32px 80px rgba(0,0,0,.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Schedule Meeting</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Invites + calendar files sent automatically</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><IcoX /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }}>
          <div>
            <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>Title *</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Team Strategy Review" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '.875rem', outline: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>Agenda</label>
            <textarea value={form.agenda} onChange={e => setForm(p => ({ ...p, agenda: e.target.value }))} rows={3} placeholder="Topics to cover…" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '.875rem', outline: 'none', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '.875rem', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>Time</label>
              <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '.875rem', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>Duration</label>
              <select value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '.875rem', outline: 'none' }}>
                <option value="30">30 min</option>
                <option value="60">60 min</option>
                <option value="90">90 min</option>
                <option value="120">2 hours</option>
              </select>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Attendees ({selected.length}/{members.length})</label>
              <button type="button" onClick={() => setSelected(selected.length === members.length ? [] : members.map(m => m.id))} style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {selected.length === members.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            {/* Role filter chips */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {(['All', 'Coach', 'Player', 'Parent'] as const).map(role => {
                const COLORS: Record<string, { active: string; text: string; border: string }> = {
                  All:    { active: '#6366F1', text: '#fff', border: '#6366F1' },
                  Coach:  { active: '#7C3AED', text: '#fff', border: '#7C3AED' },
                  Player: { active: '#059669', text: '#fff', border: '#059669' },
                  Parent: { active: '#D97706', text: '#fff', border: '#D97706' },
                };
                const c = COLORS[role];
                const isActive = roleFilter === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setRoleFilter(role);
                      if (role === 'All') {
                        setSelected(members.map(m => m.id));
                      } else {
                        setSelected(members.filter(m => m.role === role).map(m => m.id));
                      }
                    }}
                    style={{ padding: '4px 12px', borderRadius: 99, fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${isActive ? c.border : 'var(--border-default)'}`, background: isActive ? c.active : 'var(--bg-elevated)', color: isActive ? c.text : 'var(--text-secondary)', transition: 'all .12s' }}
                  >
                    {role === 'All' ? `All (${members.length})` : `${role}s (${members.filter(m => m.role === role).length})`}
                  </button>
                );
              })}
            </div>
            <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {members.filter(m => roleFilter === 'All' || m.role === roleFilter).map(m => (
                <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: selected.includes(m.id) ? 'var(--accent-subtle)' : 'transparent', border: `1px solid ${selected.includes(m.id) ? 'var(--accent-light)' : 'transparent'}`, transition: 'all .12s' }}>
                  <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggleMember(m.id)} style={{ accentColor: 'var(--accent)' }} />
                  <Avatar name={`${m.first_name} ${m.last_name}`} size={26} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{m.first_name} {m.last_name}</div>
                    <div style={{ fontSize: '.68rem', color: 'var(--text-muted)' }}>{m.role}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          {err && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--danger-subtle)', color: 'var(--danger)', fontSize: '.82rem', fontWeight: 600 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, height: 42, borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: '.875rem' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 2, height: 42, borderRadius: 10, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', border: 'none', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '.875rem', opacity: saving ? .75 : 1 }}>
              {saving ? 'Scheduling…' : 'Schedule & Send Invites'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Direct Call Modal ─────────────────────────────────────────────────────────
function DirectCallModal({ members, onClose, onCallStarted }: { members: AcademyMember[]; onClose: () => void; onCallStarted: (s: CallSession) => void }) {
  const [calling, setCalling] = useState<string | null>(null);

  async function callPerson(id: string) {
    setCalling(id);
    try {
      const session = await meetingsApi.startCall({ recipientId: id });
      onCallStarted(session);
      onClose();
    } catch (ex: unknown) {
      console.error(ex);
    } finally { setCalling(null); }
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 8001, width: 420, maxWidth: 'calc(100vw - 32px)', maxHeight: '80vh', background: 'var(--bg-surface)', borderRadius: 20, boxShadow: '0 32px 80px rgba(0,0,0,.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>Call Someone</div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><IcoX /></button>
        </div>
        <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <Avatar name={`${m.first_name} ${m.last_name}`} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{m.first_name} {m.last_name}</div>
                <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>{m.role}</div>
              </div>
              <button onClick={() => callPerson(m.id)} disabled={calling === m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#059669,#10B981)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '.78rem', cursor: calling ? 'not-allowed' : 'pointer', opacity: calling === m.id ? .7 : 1 }}>
                <IcoPhone /> {calling === m.id ? 'Calling…' : 'Call'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Meeting Card ──────────────────────────────────────────────────────────────
function MeetingCard({ meeting, onJoin }: { meeting: Meeting; onJoin: (m: Meeting) => void }) {
  const upcoming = isUpcoming(meeting.scheduled_at);
  const attendees = meeting.meeting_attendees ?? [];

  return (
    <div style={{ background: 'var(--bg-surface)', border: `1.5px solid ${upcoming ? 'var(--border-default)' : 'var(--border-subtle)'}`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, opacity: upcoming ? 1 : .75 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: upcoming ? 'linear-gradient(135deg,#6366F115,#8B5CF615)' : 'var(--bg-elevated)', border: `1.5px solid ${upcoming ? '#6366F130' : 'var(--border-subtle)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: upcoming ? '#6366F1' : 'var(--text-muted)', flexShrink: 0 }}>
          <IcoVideo />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meeting.title}</div>
          {meeting.agenda && <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meeting.agenda}</div>}
        </div>
        {upcoming && (
          <span style={{ flexShrink: 0, fontSize: '.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>Upcoming</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '.78rem', color: 'var(--text-secondary)' }}>
          <IcoClock /> {fmtDate(meeting.scheduled_at)} at {fmtTime(meeting.scheduled_at)}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '.78rem', color: 'var(--text-secondary)' }}>
          <IcoUsers /> {attendees.length} attendee{attendees.length !== 1 ? 's' : ''}
        </span>
        {meeting.duration_minutes && (
          <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>{meeting.duration_minutes} min</span>
        )}
      </div>
      {attendees.length > 0 && (
        <div style={{ display: 'flex', gap: -6 }}>
          {attendees.slice(0, 5).map((a, i) => (
            <div key={a.user_id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
              <Avatar name={a.users ? `${a.users.first_name} ${a.users.last_name}` : '?'} size={24} />
            </div>
          ))}
          {attendees.length > 5 && <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1.5px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.6rem', fontWeight: 700, color: 'var(--text-muted)', marginLeft: -8 }}>+{attendees.length - 5}</div>}
        </div>
      )}
      {upcoming && (
        <button onClick={() => onJoin(meeting)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '.85rem', cursor: 'pointer' }}>
          <IcoVideo /> Join Now
        </button>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function MeetingsPage() {
  const { user } = useAuthStore();
  const canSchedule = user?.role === 'Admin' || user?.role === 'Coach';

  const [meetings,     setMeetings]    = useState<Meeting[]>([]);
  const [members,      setMembers]     = useState<AcademyMember[]>([]);
  const [loading,      setLoading]     = useState(true);
  const [err,          setErr]         = useState('');
  const [tab,          setTab]         = useState<'upcoming' | 'past'>('upcoming');
  const [showSchedule, setShowSchedule] = useState(false);
  const [activeCall,   setActiveCall]  = useState<CallSession | null>(null);

  async function loadData() {
    setLoading(true); setErr('');
    try {
      const [m, mem] = await Promise.all([meetingsApi.getMeetings(), meetingsApi.getMembers()]);
      setMeetings(m);
      setMembers(mem.filter(m => m.id !== user?.id));
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Failed to load meetings');
    } finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  const upcoming = meetings.filter(m => isUpcoming(m.scheduled_at));
  const past     = meetings.filter(m => !isUpcoming(m.scheduled_at));
  const shown    = tab === 'upcoming' ? upcoming : past;

  if (activeCall) {
    return <CallRoom roomUrl={activeCall.daily_room_url} sessionId={activeCall.id} title="Team Call" onLeave={() => setActiveCall(null)} />;
  }

  return (
    <>
      <IncomingCallModal />

      {showSchedule && canSchedule && (
        <ScheduleModal members={[...members, ...(user ? [{ id: user.id, first_name: user.first_name ?? '', last_name: user.last_name ?? '', email: user.email ?? '', role: user.role }] : [])]} onClose={() => setShowSchedule(false)} onCreated={loadData} />
      )}

      <div style={{ animation: 'fadeIn .3s ease' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-.025em', margin: 0 }}>Meetings</h1>
              {loading ? (
                <span className="skeleton" style={{ display: 'inline-block', width: 78, height: 20, borderRadius: 99, verticalAlign: 'middle' }} />
              ) : (
                <span style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--accent-light)', borderRadius: 99, fontSize: '.72rem', fontWeight: 700, padding: '2px 10px' }}>
                  {upcoming.length} upcoming
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '.875rem', margin: '4px 0 0' }}>Video meetings and instant calls for your academy</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {canSchedule && (
              <button onClick={() => setShowSchedule(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, height: 40, padding: '0 18px', borderRadius: 10, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '.85rem', cursor: 'pointer' }}>
                <IcoPlus /> Schedule Meeting
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-elevated)', padding: 4, borderRadius: 12, width: 'fit-content', border: '1px solid var(--border-subtle)' }}>
          {(['upcoming', 'past'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 20px', borderRadius: 9, border: 'none', fontWeight: 600, fontSize: '.82rem', cursor: 'pointer', background: tab === t ? 'var(--bg-surface)' : 'transparent', color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,.08)' : 'none', transition: 'all .15s', textTransform: 'capitalize' }}>
              {t === 'upcoming' ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 16 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 16 }} />)}
          </div>
        ) : err ? (
          <div className="alert alert-error"><span>{err}</span><button onClick={loadData} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit' }}>Retry</button></div>
        ) : shown.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '56px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: 'var(--text-muted)' }}><IcoVideo /></div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-secondary)' }}>
              {tab === 'upcoming' ? 'No upcoming meetings' : 'No past meetings'}
            </div>
            <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginTop: 6, maxWidth: 300, margin: '6px auto 0' }}>
              {tab === 'upcoming' && canSchedule ? 'Schedule your first meeting to get started.' : 'Meetings will appear here once they are created.'}
            </div>
            {tab === 'upcoming' && canSchedule && (
              <button onClick={() => setShowSchedule(true)} style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 7, height: 40, padding: '0 20px', borderRadius: 10, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '.85rem', cursor: 'pointer' }}>
                <IcoPlus /> Schedule Meeting
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 16 }}>
            {shown.map(m => <MeetingCard key={m.id} meeting={m} onJoin={m => setActiveCall({ id: '', status: 'active', daily_room_url: m.daily_room_url, caller_id: '', created_at: '' })} />)}
          </div>
        )}
      </div>
    </>
  );
}
