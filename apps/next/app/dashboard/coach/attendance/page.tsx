'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { scheduleApi, apiClient, OfflineQueuedError, subscribeOfflineQueue } from '@sams/api';
import type { ScheduleEvent, QueueEvent } from '@sams/api';

// ─── Types ──────────────────────────────────────────────────────────
interface RosterPlayer {
  player_id: string; first_name: string; last_name: string; email: string;
  status?: string | null; notes?: string | null;
}
interface RosterData { event: ScheduleEvent; roster: RosterPlayer[] }

// ─── Icons ──────────────────────────────────────────────────────────
const IcoClipboard = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/>
    <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
);

// ─── Mobile CSS ─────────────────────────────────────────────────────
const MOBILE_CSS = `
  @media(max-width:640px){
    .att-row-inner { flex-wrap: wrap; }
    .att-save-bar  { flex-wrap: wrap; gap: 10px; }
  }
`;

// ─── Config ─────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { color: string; bg: string; border: string; label: string; icon: string }> = {
  Present: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'Present', icon: '✓' },
  Absent:  { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Absent',  icon: '✕' },
  Injured: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Injured', icon: '!' },
};
const TYPE_CFG: Record<string, string> = {
  Training: '#7C3AED', Match: '#DC2626', Friendly: '#059669',
  Recovery: '#D97706', Meeting: '#7C3AED', training: '#7C3AED',
  match: '#DC2626', meeting: '#7C3AED', other: '#6366F1',
};

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}
function fmtTime(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function initials(fn?: string, ln?: string) { return `${fn?.[0] ?? ''}${ln?.[0] ?? ''}`.toUpperCase(); }

// ─── Session Card (sidebar) ──────────────────────────────────────────
function SessionCard({ event, active, onSelect }: { event: ScheduleEvent; active: boolean; onSelect: (id: string) => void }) {
  const isPast = new Date(event.start_time) < new Date();
  const typeKey = Object.keys(TYPE_CFG).find(k => k.toLowerCase() === (event.type ?? '').toLowerCase()) ?? 'other';
  const typeColor = TYPE_CFG[typeKey] ?? '#6366F1';
  const displayType = typeKey.charAt(0).toUpperCase() + typeKey.slice(1).toLowerCase();

  return (
    <button onClick={() => onSelect(event.id)}
      style={{ display: 'flex', gap: 12, padding: '13px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left', width: '100%', border: active ? `1.5px solid ${typeColor}` : '1.5px solid #E2E8F0', background: active ? `${typeColor}08` : '#fff', transition: 'all 0.16s', boxShadow: active ? `0 4px 16px ${typeColor}18` : '0 1px 4px rgba(15,23,42,0.04)', borderLeft: active ? `4px solid ${typeColor}` : `4px solid ${typeColor}40` }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = `${typeColor}60`; e.currentTarget.style.background = `${typeColor}05`; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#fff'; } }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: active ? `${typeColor}15` : '#F8FAFC', border: `1px solid ${active ? `${typeColor}30` : '#E2E8F0'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'all 0.16s' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 900, color: active ? typeColor : '#334155', lineHeight: 1 }}>
          {new Date(event.start_time).getDate()}
        </span>
        <span style={{ fontSize: '0.52rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: active ? `${typeColor}99` : '#94A3B8' }}>
          {new Date(event.start_time).toLocaleDateString('en-GB', { month: 'short' })}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: active ? typeColor : '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>
          {event.title}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 3 }}>🕐 {fmtTime(event.start_time)}{event.location && ` · 📍 ${event.location}`}</div>
        {(event as any).teams?.name && <div style={{ fontSize: '0.67rem', color: typeColor, marginTop: 3, fontWeight: 700 }}>{(event as any).teams.name}</div>}
      </div>
      <div style={{ flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>
        <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: isPast ? '#F8FAFC' : '#ECFDF5', color: isPast ? '#94A3B8' : '#059669', border: `1px solid ${isPast ? '#E2E8F0' : '#A7F3D0'}`, letterSpacing: '0.04em' }}>
          {isPast ? 'PAST' : 'UPCOMING'}
        </span>
      </div>
    </button>
  );
}

// ─── Stat Box ────────────────────────────────────────────────────────
function StatBox({ label, count, color, bg, border }: { label: string; count: number; color: string; bg: string; border: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '14px 10px', borderRadius: 14, background: bg, border: `1px solid ${border}`, boxShadow: count > 0 ? `0 2px 8px ${color}15` : 'none' }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 900, color, lineHeight: 1, letterSpacing: '-0.03em' }}>{count}</div>
      <div style={{ fontSize: '0.67rem', fontWeight: 700, color, marginTop: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

// ─── Player Row ──────────────────────────────────────────────────────
function PlayerRow({ player, status, note, onSet, onNoteChange }: {
  player: RosterPlayer; status: string | null; note: string;
  onSet: (id: string, s: string | null) => void;
  onNoteChange: (id: string, note: string) => void;
}) {
  const [showNote, setShowNote] = useState(false);
  const current = status ? STATUS_CFG[status] : null;
  return (
    <div style={{ borderRadius: 14, background: current ? current.bg : '#F8FAFC', border: `1.5px solid ${current ? current.border : '#E2E8F0'}`, transition: 'all 0.14s', borderLeft: `4px solid ${current ? current.color : '#CBD5E1'}`, overflow: 'hidden' }}>
      <div className="att-row-inner" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: '#F5F3FF', border: '1.5px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', color: '#7C3AED' }}>
          {initials(player.first_name, player.last_name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {player.first_name} {player.last_name}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 1 }}>{player.email}</div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0, background: '#F1F5F9', borderRadius: 10, padding: 4 }}>
          {Object.entries(STATUS_CFG).map(([key, cfg]) => {
            const active = status === key;
            return (
              <button key={key} onClick={() => onSet(player.player_id, active ? null : key)} title={cfg.label}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 8, cursor: 'pointer', border: active ? `1.5px solid ${cfg.color}` : '1.5px solid transparent', background: active ? cfg.bg : 'transparent', color: active ? cfg.color : '#94A3B8', fontSize: '0.72rem', fontWeight: active ? 800 : 500, transition: 'all 0.12s' }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = cfg.bg; e.currentTarget.style.color = cfg.color; e.currentTarget.style.border = `1.5px solid ${cfg.border}`; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.border = '1.5px solid transparent'; } }}>
                <span>{cfg.icon}</span> {cfg.label}
              </button>
            );
          })}
        </div>
        <button onClick={() => setShowNote(v => !v)} title={showNote ? 'Hide note' : 'Add note'}
          style={{ flexShrink: 0, padding: '5px 9px', borderRadius: 8, border: `1.5px solid ${note ? '#DDD6FE' : '#E2E8F0'}`, background: note ? '#F5F3FF' : '#F8FAFC', color: note ? '#7C3AED' : '#94A3B8', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}>
          📝{note ? ' ✓' : ''}
        </button>
      </div>
      {showNote && (
        <div style={{ padding: '0 16px 12px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <textarea value={note} onChange={e => onNoteChange(player.player_id, e.target.value)}
            placeholder="Session note (e.g. arrived late, showed great effort)…"
            rows={2}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: '0.78rem', color: '#334155', fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
            onFocus={e => e.target.style.borderColor = '#7C3AED'}
            onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
        </div>
      )}
    </div>
  );
}

// ─── Select Placeholder ──────────────────────────────────────────────
function SelectPlaceholder() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 480, background: 'linear-gradient(135deg, #F8FAFC 0%, #F5F3FF 100%)', borderRadius: 20, border: '1.5px dashed #CBD5E1', padding: '48px 32px', textAlign: 'center' }}>
      <div style={{ width: 96, height: 96, borderRadius: 28, background: 'linear-gradient(135deg, #EDE9FE, #EDE9FE)', border: '1.5px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(99,102,241,0.12)', color: '#6366F1', marginBottom: 28 }}>
        <IcoClipboard />
      </div>
      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A', letterSpacing: '-0.015em', marginBottom: 8 }}>Select a Session</div>
      <p style={{ color: '#64748B', fontSize: '0.875rem', maxWidth: 260, margin: '0 0 28px', lineHeight: 1.6 }}>Choose a session from the sidebar to start marking player attendance.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280 }}>
        {[{ n: '1', text: 'Pick a session on the left' }, { n: '2', text: 'Mark each player Present, Absent, or Injured' }, { n: '3', text: 'Save attendance to record it' }].map(s => (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
            <div style={{ width: 24, height: 24, borderRadius: 99, background: '#EEF2FF', border: '1px solid #C7D2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, color: '#6366F1', flexShrink: 0 }}>{s.n}</div>
            <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>{s.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Mobile breakpoint hook ──────────────────────────────────────────
function useIsMobile(bp = 768) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(`(max-width: ${bp}px)`);
    setMobile(mq.matches);
    const h = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [bp]);
  return mobile;
}

// ─── Attendance Inner (uses useSearchParams) ─────────────────────────
function AttendanceInner() {
  const mobile       = useIsMobile();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(searchParams.get('event'));
  const [statuses,     setStatuses]    = useState<Record<string, string>>({});
  const [notes,        setNotes]       = useState<Record<string, string>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const [exporting,    setExporting]   = useState(false);
  const [events,       setEvents]      = useState<ScheduleEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [rosterData,   setRosterData]  = useState<RosterData | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError,  setRosterError] = useState('');
  const [saving,       setSaving]      = useState(false);
  const [saveError,    setSaveError]   = useState('');

  useEffect(() => {
    scheduleApi.getEvents()
      .then(evts => setEvents([...evts].sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())))
      .catch(() => {})
      .finally(() => setEventsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    setRosterLoading(true); setRosterError(''); setRosterData(null); setStatuses({}); setNotes({});
    (apiClient as any).get(`/attendance?event_id=${selectedEventId}`)
      .then((res: any) => {
        const data = res.data ?? res;
        setRosterData(data);
        if (data?.roster) {
          const initStatus: Record<string, string> = {};
          const initNotes:  Record<string, string> = {};
          for (const p of data.roster) {
            if (p.status) initStatus[p.player_id] = p.status;
            if (p.notes)  initNotes[p.player_id]  = p.notes;
          }
          setStatuses(initStatus);
          setNotes(initNotes);
        }
        setSavedSuccess(false);
      })
      .catch((e: unknown) => setRosterError(e instanceof Error ? e.message : 'Failed to load roster'))
      .finally(() => setRosterLoading(false));
  }, [selectedEventId]);

  function handleSelectEvent(id: string) {
    setSelectedEventId(id);
    router.replace(`/dashboard/coach/attendance?event=${id}`, { scroll: false });
    setStatuses({}); setNotes({}); setSavedSuccess(false); setSavedOffline(false);
  }

  function handleSetStatus(playerId: string, status: string | null) {
    setStatuses(prev => {
      if (status === null) { const n = { ...prev }; delete n[playerId]; return n; }
      return { ...prev, [playerId]: status };
    });
    setSavedSuccess(false); setSavedOffline(false);
  }

  function handleNoteChange(playerId: string, note: string) {
    setNotes(prev => ({ ...prev, [playerId]: note }));
    setSavedSuccess(false); setSavedOffline(false);
  }

  // If this event's attendance was queued offline, flip to "saved" once the
  // queue actually sends it (reconnect, or the periodic flaky-network retry).
  useEffect(() => {
    return subscribeOfflineQueue((event: QueueEvent) => {
      if (event.type === 'enqueued') return;
      if (event.item.url !== '/attendance' || event.item.data?.event_id !== selectedEventId) return;
      if (event.type === 'sent') {
        setSavedOffline(false);
        setSavedSuccess(true);
      }
      if (event.type === 'flush-failed' && event.permanent) {
        setSavedOffline(false);
        setSaveError('This offline save could not be delivered. Please try saving again.');
      }
    });
  }, [selectedEventId]);

  async function handleExportCsv() {
    if (!selectedEventId) return;
    setExporting(true);
    try {
      const token = (await import('@sams/store')).useAuthStore.getState().session?.access_token;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'}/attendance/export?event_id=${selectedEventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `attendance-${selectedEvent?.title?.replace(/\s+/g, '-') ?? selectedEventId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
    finally { setExporting(false); }
  }

  async function handleSave() {
    if (!rosterData?.roster || !selectedEventId) return;
    const records = rosterData.roster.map(p => ({
      player_id: p.player_id,
      status: statuses[p.player_id] || 'Present',
      notes: notes[p.player_id] || undefined,
    }));
    setSaving(true); setSaveError(''); setSavedOffline(false); setSavedSuccess(false);
    try {
      await (apiClient as any).post('/attendance', { event_id: selectedEventId, records });
      setSavedSuccess(true);
    } catch (e: unknown) {
      if (e instanceof OfflineQueuedError) {
        // logAttendance() upserts on (event_id, player_id), so replaying the
        // exact same records later is always safe to resend unchanged.
        setSavedOffline(true);
      } else {
        setSaveError(e instanceof Error ? e.message : 'Failed to save');
      }
    }
    setSaving(false);
  }

  const roster       = rosterData?.roster ?? [];
  const presentCount = Object.values(statuses).filter(s => s === 'Present').length;
  const absentCount  = Object.values(statuses).filter(s => s === 'Absent').length;
  const injuredCount = Object.values(statuses).filter(s => s === 'Injured').length;
  const pendingCount = roster.length - Object.keys(statuses).length;
  const selectedEvent = rosterData?.event ?? events.find(e => e.id === selectedEventId);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <style dangerouslySetInnerHTML={{ __html: MOBILE_CSS }}/>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', lineHeight: 1.2, margin: 0 }}>Attendance Tracker</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 6 }}>Select a session to mark player attendance</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '360px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Sidebar */}
        <div style={{ background: '#F8FAFC', borderRadius: 20, border: '1px solid #E2E8F0', padding: '16px 14px', boxShadow: '0 2px 10px rgba(15,23,42,0.04)' }}>
          <div style={{ fontSize: '0.67rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 12, paddingLeft: 4 }}>Sessions</div>
          {eventsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 14 }} />)}
            </div>
          ) : !events.length ? (
            <div style={{ borderRadius: 14, padding: '24px 16px', textAlign: 'center', background: '#fff', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>📅</div>
              <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 500 }}>No sessions found.</div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 4 }}>Create one from the Schedule page.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {events.map(ev => <SessionCard key={ev.id} event={ev} active={ev.id === selectedEventId} onSelect={handleSelectEvent} />)}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div>
          {!selectedEventId ? <SelectPlaceholder /> :
          rosterLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 14 }} />)}
            </div>
          ) : rosterError ? (
            <div style={{ padding: '12px 16px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.875rem' }}>{rosterError}</div>
          ) : (
            <>
              {/* Event header card */}
              {selectedEvent && (() => {
                const typeKey = Object.keys(TYPE_CFG).find(k => k.toLowerCase() === (selectedEvent.type ?? '').toLowerCase()) ?? 'other';
                const tc = TYPE_CFG[typeKey] ?? '#6366F1';
                const displayType = typeKey.charAt(0).toUpperCase() + typeKey.slice(1).toLowerCase();
                return (
                  <div style={{ background: `linear-gradient(135deg, ${tc}10, #fff)`, borderRadius: 18, padding: '16px 20px', marginBottom: 16, border: `1.5px solid ${tc}25`, boxShadow: `0 4px 16px ${tc}12`, borderLeft: `5px solid ${tc}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0F172A', letterSpacing: '-0.015em' }}>{selectedEvent.title}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                          <span>📅 {fmtDate(selectedEvent.start_time)}</span>
                          <span style={{ opacity: 0.4 }}>·</span>
                          <span>{fmtTime(selectedEvent.start_time)}</span>
                          {selectedEvent.location && <><span style={{ opacity: 0.4 }}>·</span><span>📍 {selectedEvent.location}</span></>}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '4px 12px', borderRadius: 99, background: `${tc}15`, color: tc, border: `1px solid ${tc}30`, flexShrink: 0 }}>{displayType}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Stats */}
              {roster.length > 0 && (
                <div className="kpi-grid-4" style={{ marginBottom: 16 }}>
                  <StatBox label="Present" count={presentCount} color="#059669" bg="#ECFDF5" border="#A7F3D0" />
                  <StatBox label="Absent"  count={absentCount}  color="#DC2626" bg="#FEF2F2" border="#FECACA" />
                  <StatBox label="Injured" count={injuredCount} color="#D97706" bg="#FFFBEB" border="#FDE68A" />
                  <StatBox label="Pending" count={pendingCount} color="#94A3B8" bg="#F8FAFC" border="#E2E8F0" />
                </div>
              )}

              {/* Quick mark-all */}
              {roster.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '10px 14px', borderRadius: 12, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginRight: 2 }}>Mark all:</span>
                  {(['Present', 'Absent', 'Injured'] as const).map(s => {
                    const cfg = STATUS_CFG[s];
                    return (
                      <button key={s}
                        onClick={() => { const next: Record<string, string> = {}; roster.forEach(p => { next[p.player_id] = s; }); setStatuses(next); setSavedSuccess(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', border: `1.5px solid ${cfg.border}`, background: cfg.bg, color: cfg.color, fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.12s' }}>
                        <span>{cfg.icon}</span> {s}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Player list */}
              {!roster.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center', background: '#F8FAFC', borderRadius: 20, border: '1.5px dashed #CBD5E1' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 12 }}>👥</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No players on this roster</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 6 }}>No roster entries found for this session.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {roster.map(p => <PlayerRow key={p.player_id} player={p} status={statuses[p.player_id] ?? null} note={notes[p.player_id] ?? ''} onSet={handleSetStatus} onNoteChange={handleNoteChange} />)}
                </div>
              )}

              {/* Save bar */}
              {roster.length > 0 && (
                <div className="att-save-bar" style={{ marginTop: 16, padding: '14px 18px', background: savedSuccess ? '#ECFDF5' : savedOffline ? '#FFFBEB' : '#fff', border: `1.5px solid ${savedSuccess ? '#A7F3D0' : savedOffline ? '#FDE68A' : '#E2E8F0'}`, borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}>
                  {savedSuccess ? (
                    <span style={{ fontSize: '0.875rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 22, height: 22, borderRadius: 99, background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>✓</span>
                      Attendance saved successfully!
                    </span>
                  ) : savedOffline ? (
                    <span style={{ fontSize: '0.875rem', color: '#92400E', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 22, height: 22, borderRadius: 99, background: '#D97706', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>⏳</span>
                      Saved offline — will sync automatically when you're back online.
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{Object.keys(statuses).length}</span> of {roster.length} players marked
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {saveError && <span style={{ fontSize: '0.75rem', color: '#DC2626' }}>{saveError}</span>}
                    <button onClick={handleExportCsv} disabled={exporting || !savedSuccess}
                      title={savedSuccess ? 'Download CSV' : 'Save attendance first to export'}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 10, cursor: (exporting || !savedSuccess) ? 'not-allowed' : 'pointer', background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: savedSuccess ? '#059669' : '#94A3B8', fontSize: '0.8rem', fontWeight: 700 }}>
                      ⬇ {exporting ? 'Exporting…' : 'CSV'}
                    </button>
                    <button onClick={handleSave} disabled={saving || !roster.length}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer', background: saving ? '#94A3B8' : 'linear-gradient(135deg, #059669, #10B981)', border: 'none', color: '#fff', fontSize: '0.875rem', fontWeight: 700, boxShadow: saving ? 'none' : '0 4px 12px rgba(16,185,129,0.35)' }}>
                      ✓ {saving ? 'Saving…' : 'Save Attendance'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main export (wraps in Suspense for useSearchParams) ─────────────
export default function AttendancePage() {
  return (
    <Suspense fallback={<div style={{ color: 'var(--text-muted)', padding: 32 }}>Loading…</div>}>
      <AttendanceInner />
    </Suspense>
  );
}
