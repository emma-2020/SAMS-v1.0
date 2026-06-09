'use client';

import { useState, useEffect } from 'react';
import { scheduleApi } from '@sams/api';
import type { ScheduleEvent } from '@sams/api';
import { ROLE_COLOR } from '@sams/ui';

// ─── Config ─────────────────────────────────────────────────────────
const EVENT_TYPES = ['Training', 'Match', 'Friendly', 'Recovery', 'Meeting'];

const TYPE_CFG: Record<string, { color: string; bg: string; border: string }> = {
  Training: { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  Match:    { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  Friendly: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  Recovery: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  Meeting:  { color: '#7C3AED', bg: '#F3EFFF', border: '#DDD6FE' },
  Other:    { color: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE' },
};

function normalizeType(t: string): string {
  if (!t) return 'Other';
  const found = EVENT_TYPES.find(k => k.toLowerCase() === t.toLowerCase());
  return found ?? (t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
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

// ─── Event Card ──────────────────────────────────────────────────────
function EventCard({ event }: { event: ScheduleEvent }) {
  const typeKey = normalizeType(event.type);
  const tc      = TYPE_CFG[typeKey] ?? TYPE_CFG.Other;
  const ev      = event as any;
  const isPast  = new Date(event.start_time) < new Date();

  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, borderLeft: `4px solid ${tc.color}`, transition: 'box-shadow 0.18s, transform 0.18s', opacity: isPast ? 0.7 : 1 }}
      onMouseEnter={e => { if (!isPast) { e.currentTarget.style.boxShadow = '0 6px 20px rgba(15,23,42,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
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
          {event.location && <span>📍 {event.location}</span>}
          {event.description && <span style={{ opacity: 0.4 }}>· {event.description.slice(0, 60)}{event.description.length > 60 ? '…' : ''}</span>}
        </div>
      </div>
      {/* Type badge */}
      <span style={{ fontSize: '0.67rem', fontWeight: 800, padding: '4px 10px', borderRadius: 99, background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 }}>
        {typeKey}
      </span>
      {isPast && (
        <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: '#F8FAFC', color: '#94A3B8', border: '1px solid #E2E8F0', flexShrink: 0 }}>PAST</span>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function PlayerSchedulePage() {
  const [filter, setFilter]   = useState('All');
  const [events, setEvents]   = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    scheduleApi.getEvents()
      .then(evts => setEvents([...evts].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const today    = new Date();
  const upcoming = events.filter(ev => new Date(ev.start_time) >= today);
  const past     = events.filter(ev => new Date(ev.start_time) < today);

  const displayEvents = showPast ? events : upcoming;
  const filtered = displayEvents.filter(ev => filter === 'All' || normalizeType(ev.type) === filter);
  const groups   = groupByDate(filtered);

  const nextEvent = upcoming[0];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', lineHeight: 1.2, margin: 0 }}>My Schedule</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 6 }}>
            {upcoming.length} upcoming · {past.length} past sessions
          </p>
        </div>
        {past.length > 0 && (
          <button onClick={() => setShowPast(p => !p)}
            style={{ padding: '7px 14px', borderRadius: 99, border: '1px solid var(--border-default)', background: showPast ? ROLE_COLOR.Player : 'var(--bg-surface)', color: showPast ? '#fff' : 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.14s' }}>
            {showPast ? 'Upcoming only' : 'Show past sessions'}
          </button>
        )}
      </div>

      {/* Next Session banner */}
      {nextEvent && !loading && (
        <div style={{ marginBottom: 24, borderRadius: 18, padding: '16px 20px', background: `linear-gradient(135deg, ${ROLE_COLOR.Player}10, ${ROLE_COLOR.Player}05)`, border: `1.5px solid ${ROLE_COLOR.Player}25`, borderLeft: `5px solid ${ROLE_COLOR.Player}` }}>
          <div style={{ fontSize: '0.67rem', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: ROLE_COLOR.Player, marginBottom: 6 }}>Next Session</div>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>{nextEvent.title}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span>📅 {fmtDate(nextEvent.start_time)}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>🕐 {fmtTime(nextEvent.start_time)}</span>
            {nextEvent.location && <><span style={{ opacity: 0.5 }}>·</span><span>📍 {nextEvent.location}</span></>}
          </div>
        </div>
      )}

      {/* Type filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {['All', ...EVENT_TYPES].map(f => {
          const tc    = TYPE_CFG[f] ?? TYPE_CFG.Other;
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
        <div className="alert alert-error">{error}</div>
      ) : !groups.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 32px', textAlign: 'center', background: 'linear-gradient(135deg, #F8FAFC 0%, #ECFDF5 100%)', borderRadius: 20, border: '1px solid #E2E8F0' }}>
          <div style={{ width: 80, height: 80, borderRadius: 22, background: `linear-gradient(135deg, ${ROLE_COLOR.Player}15, ${ROLE_COLOR.Player}08)`, border: `1.5px solid ${ROLE_COLOR.Player}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, fontSize: '2rem' }}>📅</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A', marginBottom: 8 }}>
            {filter !== 'All' ? `No ${filter} sessions` : showPast ? 'No sessions found' : 'No upcoming sessions'}
          </div>
          <p style={{ color: '#64748B', fontSize: '0.875rem', maxWidth: 280, margin: 0, lineHeight: 1.6 }}>
            {filter !== 'All' ? 'Try changing the type filter.' : 'Your schedule will appear here once sessions are created by your coach or admin.'}
          </p>
          {filter !== 'All' && (
            <button onClick={() => setFilter('All')} style={{ marginTop: 16, padding: '8px 18px', borderRadius: 99, cursor: 'pointer', background: '#ECFDF5', border: `1px solid ${ROLE_COLOR.Player}40`, color: ROLE_COLOR.Player, fontSize: '0.82rem', fontWeight: 700 }}>Show all types</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {groups.map(([dateKey, dayEvents]) => {
            const date    = new Date(dateKey);
            const isToday = date.toDateString() === today.toDateString();
            const isPast  = date < today && !isToday;
            return (
              <div key={dateKey}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: isToday ? ROLE_COLOR.Player : isPast ? '#94A3B8' : '#475569' }}>
                    {fmtDate(dayEvents[0].start_time)}
                  </div>
                  {isToday && <span style={{ padding: '2px 9px', borderRadius: 99, background: ROLE_COLOR.Player, color: '#fff', fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.06em' }}>TODAY</span>}
                  <div style={{ flex: 1, height: 1, background: isToday ? `${ROLE_COLOR.Player}40` : '#F1F5F9' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dayEvents.map(ev => <EventCard key={ev.id} event={ev} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
