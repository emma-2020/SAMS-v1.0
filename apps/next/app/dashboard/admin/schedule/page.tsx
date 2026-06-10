'use client';

import { useState, useEffect } from 'react';
import { scheduleApi } from '@sams/api';
import type { ScheduleEvent } from '@sams/api';

const VENUES = ['Pitch A', 'Pitch B', 'Indoor Gym', 'Weights Room', 'Court 1'];
const HOURS  = Array.from({ length: 14 }, (_, i) => i + 7);

const BLOCK_COLORS = [
  { bg: '#EEF2FF', color: '#6366F1', border: '#C7D2FE' },
  { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
  { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
];

const IcoPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IcoX = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

type ColorEntry = typeof BLOCK_COLORS[0];

interface LocalBlock {
  id: string; venue: string; label: string; date: string;
  startH: number; startM: number; endH: number; endM: number;
  color: ColorEntry; source: 'local';
}
interface EventBlock {
  id: string; venue: string; label: string; date: string;
  startH: number; startM: number; endH: number; endM: number;
  color: ColorEntry; source: 'event';
}
type Block = LocalBlock | EventBlock;

export default function AdminSchedulePage() {
  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const [showForm, setShowForm]     = useState(false);
  const [localBlocks, setLocalBlocks] = useState<LocalBlock[]>([]);
  const [newBlock, setNewBlock] = useState({ venue: '', label: '', date: '', start: '09:00', end: '11:00' });
  const [events, setEvents]   = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + weekOffset * 7 - today.getDay() + 1);

  const DAYS = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  useEffect(() => {
    setLoading(true);
    setError('');
    scheduleApi.getEvents()
      .then(setEvents)
      .catch((e: Error) => setError(e.message || 'Failed to load events'))
      .finally(() => setLoading(false));
  }, [weekOffset]);

  const weekDates = new Set(DAYS.map(d => d.toDateString()));

  const allBlocks: Block[] = [
    ...(events || [])
      .filter(ev => weekDates.has(new Date(ev.start_time).toDateString()))
      .map((ev, i): EventBlock => ({
        id: ev.id, venue: ev.location || 'Unassigned', label: ev.title,
        date: new Date(ev.start_time).toDateString(),
        startH: new Date(ev.start_time).getHours(),
        startM: new Date(ev.start_time).getMinutes(),
        endH:   new Date(ev.end_time).getHours(),
        endM:   new Date(ev.end_time).getMinutes(),
        color:  BLOCK_COLORS[i % BLOCK_COLORS.length],
        source: 'event',
      })),
    ...localBlocks,
  ];

  function addBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!newBlock.venue || !newBlock.label || !newBlock.date) return;
    const [sh, sm] = newBlock.start.split(':').map(Number);
    const [eh, em] = newBlock.end.split(':').map(Number);
    setLocalBlocks(p => [...p, {
      id: `local-${Date.now()}`, venue: newBlock.venue, label: newBlock.label,
      date: new Date(newBlock.date).toDateString(),
      startH: sh, startM: sm, endH: eh, endM: em,
      color: BLOCK_COLORS[p.length % BLOCK_COLORS.length], source: 'local',
    }]);
    setNewBlock({ venue: '', label: '', date: '', start: '09:00', end: '11:00' });
    setShowForm(false);
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', lineHeight: 1.2, margin: 0 }}>
            Resource Schedule
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 6 }}>
            Manage training grounds and venue bookings
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
            borderRadius: 10, padding: '6px 12px',
            fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)',
            boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
          }}>
            <button onClick={() => setWeekOffset(w => w - 1)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem', padding: '0 4px' }}>
              ‹
            </button>
            <span>
              {DAYS[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} –{' '}
              {DAYS[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <button onClick={() => setWeekOffset(w => w + 1)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem', padding: '0 4px' }}>
              ›
            </button>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowForm(s => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <IcoPlus /> Block Venue
          </button>
        </div>
      </div>

      {/* Add block form */}
      {showForm && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
          padding: '22px 24px', marginBottom: 20,
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 16 }}>
            Reserve Venue Time
          </div>
          <form onSubmit={addBlock} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="field">
                <label className="field-label">Venue</label>
                <select className="field-input" style={{ height: 42, cursor: 'pointer' }}
                  value={newBlock.venue} onChange={e => setNewBlock(p => ({ ...p, venue: e.target.value }))}>
                  <option value="">Select venue...</option>
                  {VENUES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Date</label>
                <input type="date" className="field-input" style={{ paddingLeft: 14, height: 42 }}
                  value={newBlock.date} onChange={e => setNewBlock(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="field">
                <label className="field-label">Label / Team</label>
                <input className="field-input" style={{ paddingLeft: 14, height: 42 }} placeholder="e.g. U16 Training"
                  value={newBlock.label} onChange={e => setNewBlock(p => ({ ...p, label: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-label">Start Time</label>
                <input type="time" className="field-input" style={{ paddingLeft: 14, height: 42 }}
                  value={newBlock.start} onChange={e => setNewBlock(p => ({ ...p, start: e.target.value }))} />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-label">End Time</label>
                <input type="time" className="field-input" style={{ paddingLeft: 14, height: 42 }}
                  value={newBlock.end} onChange={e => setNewBlock(p => ({ ...p, end: e.target.value }))} />
              </div>
              <button type="submit" className="btn btn-primary">Add Block</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          <span>{error}</span>
          <button onClick={() => { setError(''); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      {/* Calendar grid */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 720 }}>
            {/* Day headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: '64px repeat(7, 1fr)',
              borderBottom: '1px solid var(--border-default)',
              background: 'var(--bg-elevated)',
            }}>
              <div />
              {DAYS.map(d => {
                const isToday = d.toDateString() === today.toDateString();
                return (
                  <div key={d.toISOString()} style={{ textAlign: 'center', padding: '12px 4px', borderLeft: '1px solid var(--border-subtle)' }}>
                    <div style={{
                      fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: isToday ? 'var(--accent)' : 'var(--text-muted)',
                    }}>
                      {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isToday ? 'var(--accent)' : 'var(--text-primary)', marginTop: 2 }}>
                      {d.getDate()}
                    </div>
                    {isToday && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', margin: '4px auto 0' }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hour rows — always shown; event blocks appear once loaded */}
            {HOURS.map(h => (
              <div key={h} style={{
                display: 'grid', gridTemplateColumns: '64px repeat(7, 1fr)',
                minHeight: 44, borderBottom: '1px solid var(--border-subtle)',
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)',
                  padding: '4px 10px 0 0', textAlign: 'right', flexShrink: 0,
                }}>
                  {String(h).padStart(2, '0')}:00
                </div>
                {DAYS.map(day => {
                  const dayStr = day.toDateString();
                  const blocks = allBlocks.filter(b => b.date === dayStr && b.startH === h);
                  const isToday = day.toDateString() === today.toDateString();
                  return (
                    <div key={day.toISOString()} style={{
                      position: 'relative', minHeight: 44,
                      borderLeft: '1px solid var(--border-subtle)',
                      background: isToday ? 'rgba(99,102,241,0.02)' : 'transparent',
                    }}>
                      {loading && h === 9 && isToday && (
                        <div style={{
                          position: 'absolute', top: 3, left: 3, right: 3, height: 20,
                          borderRadius: 6, background: 'var(--bg-elevated)',
                          animation: 'pulse 1.5s ease-in-out infinite',
                        }} />
                      )}
                      {!loading && blocks.map(b => {
                        const duration = (b.endH - b.startH) + (b.endM - b.startM) / 60;
                        return (
                          <div key={b.id} style={{
                            position: 'absolute', top: 3, left: 3, right: 3,
                            minHeight: Math.max(duration * 44 - 6, 20),
                            borderRadius: 6, padding: '3px 7px',
                            background: b.color.bg, border: `1px solid ${b.color.border}`,
                            fontSize: '0.72rem', fontWeight: 600, color: b.color.color,
                            overflow: 'hidden', display: 'flex', alignItems: 'flex-start',
                            justifyContent: 'space-between', gap: 4, zIndex: 2,
                          }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {b.label}
                            </span>
                            {b.source === 'local' && (
                              <button
                                onClick={() => setLocalBlocks(p => p.filter(x => x.id !== b.id))}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, flexShrink: 0 }}
                              >
                                <IcoX />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Venue legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
        {VENUES.map((v, i) => (
          <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: BLOCK_COLORS[i % BLOCK_COLORS.length].color }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
