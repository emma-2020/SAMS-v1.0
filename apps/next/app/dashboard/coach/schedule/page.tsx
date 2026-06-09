'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { scheduleApi, teamsApi } from '@sams/api';
import type { ScheduleEvent, Team } from '@sams/api';

// ─── Icons ─────────────────────────────────────────────────────────
const IcoPlus    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoCal     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoClock   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IcoClose   = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoArrow   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const IcoChevron = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>;
const IcoMap     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcoNote    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
const IcoTag     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
const IcoUsers   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;

// ─── Constants ─────────────────────────────────────────────────────
const EVENT_TYPES = ['Training', 'Match', 'Friendly', 'Recovery', 'Meeting'];

const TYPE_CFG: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  Training: { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', dot: '#2563EB' },
  Match:    { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', dot: '#DC2626' },
  Friendly: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', dot: '#059669' },
  Recovery: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', dot: '#D97706' },
  Meeting:  { color: '#7C3AED', bg: '#F3EFFF', border: '#DDD6FE', dot: '#7C3AED' },
  All:      { color: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE', dot: '#6366F1' },
};

function normalizeType(t: string): string {
  if (!t) return 'Other';
  const lower = t.toLowerCase();
  const found = EVENT_TYPES.find(k => k.toLowerCase() === lower);
  return found ?? (t.charAt(0).toUpperCase() + t.slice(1));
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function groupByDate(events: ScheduleEvent[]): [string, ScheduleEvent[]][] {
  const g: Record<string, ScheduleEvent[]> = {};
  for (const ev of events) {
    const k = new Date(ev.start_time).toDateString();
    if (!g[k]) g[k] = [];
    g[k].push(ev);
  }
  return Object.entries(g);
}

// ─── Field sub-components ───────────────────────────────────────────
function PremiumSelect({ label, icon: Icon, value, onChange, options }: {
  label: string; icon?: () => JSX.Element; value: string;
  onChange: (v: string) => void; options: Array<string | { value: string; label: string }>;
}) {
  const tc = TYPE_CFG[value] ?? {};
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.01em', display: 'flex', alignItems: 'center', gap: 5 }}>
        {Icon && <span style={{ color: 'var(--text-muted)', display: 'flex' }}><Icon /></span>}
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {value && (tc as any).dot && (
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 8, height: 8, borderRadius: '50%', background: (tc as any).dot, zIndex: 1, pointerEvents: 'none' }} />
        )}
        <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: value && (tc as any).dot ? '10px 36px 10px 28px' : '10px 36px 10px 12px', borderRadius: 10, border: `1.5px solid ${(tc as any).border || '#E2E8F0'}`, background: (tc as any).bg || '#fff', color: (tc as any).color || 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600, appearance: 'none', cursor: 'pointer', outline: 'none' }}
          onFocus={e => { e.currentTarget.style.boxShadow = `0 0 0 3px ${(tc as any).dot || '#6366F1'}22`; }}
          onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}>
          {(options as any[]).map(o => typeof o === 'string'
            ? <option key={o} value={o}>{o}</option>
            : <option key={o.value} value={o.value}>{o.label}</option>
          )}
        </select>
        <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: (tc as any).color || 'var(--text-muted)' }}>
          <IcoChevron />
        </div>
      </div>
    </div>
  );
}

function PremiumInput({ label, icon: Icon, type = 'text', placeholder, value, onChange, required }: {
  label: string; icon?: () => JSX.Element; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.01em', display: 'flex', alignItems: 'center', gap: 5 }}>
        {Icon && <span style={{ color: 'var(--text-muted)', display: 'flex' }}><Icon /></span>}
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {Icon && type === 'text' && (
          <div style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', display: 'flex' }}><Icon /></div>
        )}
        <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} required={required}
          style={{ width: '100%', padding: Icon && type === 'text' ? '10px 12px 10px 34px' : '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#fff', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
          onFocus={e => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }} />
      </div>
    </div>
  );
}

// ─── Create Session Modal ───────────────────────────────────────────
function CreateSessionModal({ teams, onClose, onCreated }: {
  teams: Team[]; onClose: () => void; onCreated: (ev: ScheduleEvent) => void;
}) {
  const [form, setForm] = useState({ title: '', type: 'Training', team_id: teams[0]?.id || '', date: '', start_time: '', end_time: '', location: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.team_id || !form.date || !form.start_time || !form.end_time) return;
    setLoading(true); setError('');
    try {
      const ev = await scheduleApi.createEvent({
        title:       form.title.trim(),
        type:        form.type.toLowerCase() as ScheduleEvent['type'],
        location:    form.location.trim() || undefined,
        description: form.description.trim() || undefined,
        start_time:  new Date(`${form.date}T${form.start_time}`).toISOString(),
        end_time:    new Date(`${form.date}T${form.end_time}`).toISOString(),
        ...(form.team_id ? { team_id: form.team_id } : {}),
      } as any);
      onCreated(ev); onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    }
    setLoading(false);
  }

  const tc = TYPE_CFG[form.type] ?? TYPE_CFG.All;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 301, width: 540, maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', background: '#fff', borderRadius: 24, border: '1px solid rgba(226,232,240,0.8)', boxShadow: '0 32px 80px rgba(15,23,42,0.22)', animation: 'fadeIn 0.18s ease' }}>
        {/* Header */}
        <div style={{ padding: '22px 26px 18px', background: `linear-gradient(135deg, ${tc.bg} 0%, #fff 60%)`, borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: tc.bg, border: `1.5px solid ${tc.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tc.color }}>
              <IcoCal />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0F172A', letterSpacing: '-0.015em' }}>Create Session</div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2 }}>Schedule a new training, match, or event</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 7, cursor: 'pointer', color: '#64748B', display: 'flex' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }} onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; }}>
            <IcoClose />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.82rem' }}>{error}</div>}

          <PremiumInput label="Session Title *" placeholder="e.g. Morning Training Session" value={form.title} onChange={v => set('title', v)} required />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <PremiumSelect label="Session Type *" icon={IcoTag} value={form.type} onChange={v => set('type', v)} options={EVENT_TYPES} />
            <PremiumSelect label="Team *" icon={IcoUsers} value={form.team_id} onChange={v => set('team_id', v)}
              options={teams.map(t => ({ value: t.id, label: t.name }))} />
          </div>

          <PremiumInput label="Date *" type="date" value={form.date} onChange={v => set('date', v)} required />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <PremiumInput label="Start Time *" icon={IcoClock} type="time" value={form.start_time} onChange={v => set('start_time', v)} required />
            <PremiumInput label="End Time *"   icon={IcoClock} type="time" value={form.end_time}   onChange={v => set('end_time', v)}   required />
          </div>

          <PremiumInput label="Location" icon={IcoMap} placeholder="e.g. Main Field, Gym B" value={form.location} onChange={v => set('location', v)} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex' }}><IcoNote /></span>
              Notes (optional)
            </label>
            <textarea rows={3} placeholder="Any additional details for players…" value={form.description} onChange={e => set('description', e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#fff', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', resize: 'vertical', minHeight: 72, fontFamily: 'inherit' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }} />
          </div>

          <div style={{ height: 1, background: '#F1F5F9' }} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, cursor: 'pointer', background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: '#475569', fontSize: '0.875rem', fontWeight: 600 }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ padding: '10px 24px', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', background: loading ? '#94A3B8' : 'linear-gradient(135deg, #4F46E5, #6366F1)', border: 'none', color: '#fff', fontSize: '0.875rem', fontWeight: 700, boxShadow: loading ? 'none' : '0 4px 14px rgba(99,102,241,0.35)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {loading ? 'Creating…' : <><IcoPlus /> Create Session</>}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Event Card ─────────────────────────────────────────────────────
function EventCard({ event, onAttendance }: { event: ScheduleEvent; onAttendance: (id: string) => void }) {
  const tc = TYPE_CFG[normalizeType(event.type)] ?? TYPE_CFG.All;
  const ev = event as any;
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, borderLeft: `4px solid ${tc.color}`, transition: 'box-shadow 0.18s, transform 0.18s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(15,23,42,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}>
      {/* Time block */}
      <div style={{ flexShrink: 0, textAlign: 'center', padding: '8px 12px', borderRadius: 10, background: tc.bg, border: `1px solid ${tc.border}`, minWidth: 64 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 800, color: tc.color, lineHeight: 1 }}>{fmtTime(event.start_time)}</div>
        <div style={{ fontSize: '0.65rem', color: `${tc.color}99`, fontWeight: 600, marginTop: 3 }}>→ {fmtTime(event.end_time)}</div>
      </div>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.925rem', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>{event.title}</div>
        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
          {ev.teams?.name && <span>{ev.teams.name}</span>}
          {ev.teams?.name && event.location && <span style={{ opacity: 0.4 }}>·</span>}
          {event.location && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><IcoMap /> {event.location}</span>}
        </div>
      </div>
      {/* Type badge */}
      <span style={{ fontSize: '0.67rem', fontWeight: 800, padding: '4px 10px', borderRadius: 99, background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 }}>
        {normalizeType(event.type)}
      </span>
      {/* Attendance button */}
      <button onClick={() => onAttendance(event.id)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 9, padding: '7px 12px', cursor: 'pointer', flexShrink: 0, fontSize: '0.75rem', fontWeight: 700, color: '#475569', transition: 'all 0.14s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.background = '#EFF6FF'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = '#F8FAFC'; }}>
        Attendance <IcoArrow />
      </button>
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────
function ScheduleEmpty({ filter, onClear }: { filter: string; onClear: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '72px 32px', textAlign: 'center', background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%)', borderRadius: 20, border: '1px solid #E2E8F0' }}>
      <div style={{ width: 88, height: 88, borderRadius: 24, background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)', border: '1.5px solid #C7D2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(99,102,241,0.12)', marginBottom: 24 }}>
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      </div>
      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A', marginBottom: 8, letterSpacing: '-0.015em' }}>
        {filter === 'All' ? 'No sessions scheduled' : `No ${filter} sessions`}
      </div>
      <p style={{ color: '#64748B', fontSize: '0.875rem', maxWidth: 300, margin: '0 0 20px', lineHeight: 1.6 }}>
        {filter === 'All' ? 'Create your first session using the button above.' : `No ${filter.toLowerCase()} sessions found.`}
      </p>
      {filter !== 'All' && (
        <button onClick={onClear} style={{ padding: '8px 18px', borderRadius: 99, cursor: 'pointer', background: '#EEF2FF', border: '1px solid #C7D2FE', color: '#6366F1', fontSize: '0.82rem', fontWeight: 700 }}>Clear filter</button>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function CoachSchedulePage() {
  const router = useRouter();
  const [filter, setFilter]       = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [events, setEvents]       = useState<ScheduleEvent[]>([]);
  const [teams, setTeams]         = useState<Team[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  async function loadData() {
    setLoading(true); setError('');
    try {
      const [evts, tms] = await Promise.all([scheduleApi.getEvents(), teamsApi.getTeams()]);
      setEvents([...evts].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
      setTeams(tms);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const today    = new Date();
  const filtered = events.filter(ev => filter === 'All' || normalizeType(ev.type) === filter);
  const groups   = groupByDate(filtered);
  const upcoming = events.filter(ev => new Date(ev.start_time) >= today).length;
  const past     = events.filter(ev => new Date(ev.start_time) < today).length;

  function handleCreated(newEvent: ScheduleEvent) {
    setEvents(prev => [...prev, newEvent].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', lineHeight: 1.2, margin: 0 }}>Schedule</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 6 }}>{upcoming} upcoming · {past} past sessions</p>
        </div>
        {teams.length > 0 && (
          <button onClick={() => setShowModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12, cursor: 'pointer', background: 'linear-gradient(135deg, #4F46E5, #6366F1)', border: 'none', color: '#fff', fontSize: '0.875rem', fontWeight: 700, boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.35)'; }}>
            <IcoPlus /> Create Session
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {['All', ...EVENT_TYPES].map(f => {
          const tc = TYPE_CFG[f] ?? TYPE_CFG.All;
          const active = filter === f;
          return (
            <button key={f} onClick={() => setFilter(f)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 99, cursor: 'pointer', border: active ? `1.5px solid ${tc.color}` : '1.5px solid #E2E8F0', background: active ? tc.bg : '#fff', color: active ? tc.color : '#475569', fontSize: '0.8rem', fontWeight: active ? 800 : 500, transition: 'all 0.14s', boxShadow: active ? `0 2px 10px ${tc.color}22` : '0 1px 3px rgba(15,23,42,0.04)' }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = tc.color; e.currentTarget.style.color = tc.color; e.currentTarget.style.background = tc.bg; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = '#fff'; } }}>
              {f !== 'All' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: active ? tc.color : '#CBD5E1', flexShrink: 0 }} />}
              {f}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 74, borderRadius: 16 }} />)}
        </div>
      ) : error ? (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between' }}>
          {error}
          <button onClick={loadData} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontWeight: 600, fontSize: '0.82rem' }}>Retry</button>
        </div>
      ) : !groups.length ? (
        <ScheduleEmpty filter={filter} onClear={() => setFilter('All')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {groups.map(([dateKey, dayEvents]) => {
            const date    = new Date(dateKey);
            const isToday = date.toDateString() === today.toDateString();
            const isPast  = date < today && !isToday;
            return (
              <div key={dateKey}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: isToday ? '#2563EB' : isPast ? '#94A3B8' : '#475569' }}>
                    {fmtDate(dayEvents[0].start_time)}
                  </div>
                  {isToday && <span style={{ padding: '2px 9px', borderRadius: 99, background: '#2563EB', color: '#fff', fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.06em' }}>TODAY</span>}
                  <div style={{ flex: 1, height: 1, background: isToday ? '#BFDBFE' : '#F1F5F9' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dayEvents.map(ev => (
                    <EventCard key={ev.id} event={ev} onAttendance={id => router.push(`/dashboard/coach/attendance?event=${id}`)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && <CreateSessionModal teams={teams} onClose={() => setShowModal(false)} onCreated={handleCreated} />}
    </div>
  );
}
