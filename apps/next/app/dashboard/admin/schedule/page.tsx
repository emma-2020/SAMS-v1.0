'use client';

import { useState, useEffect } from 'react';
import { scheduleApi, teamsApi } from '@sams/api';
import type { ScheduleEvent, Team } from '@sams/api';

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

interface EventBlock {
  id: string; venue: string; label: string; date: string;
  startH: number; startM: number; endH: number; endM: number;
  color: ColorEntry; eventType: string;
}

const BLANK_FORM = { teamId: '', venue: '', label: '', date: '', start: '09:00', end: '11:00', type: 'Practice' as 'Practice' | 'Game' };

export default function AdminSchedulePage() {
  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const [showForm, setShowForm]     = useState(false);
  const [newBlock, setNewBlock]     = useState(BLANK_FORM);
  const [saving, setSaving]         = useState(false);
  const [events, setEvents]         = useState<ScheduleEvent[]>([]);
  const [teams, setTeams]           = useState<Team[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + weekOffset * 7 - today.getDay() + 1);

  const DAYS = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  // Fetch teams once for the form selector
  useEffect(() => {
    teamsApi.getTeams().then(setTeams).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    scheduleApi.getEvents()
      .then(setEvents)
      .catch((e: Error) => setError(e.message || 'Failed to load events'))
      .finally(() => setLoading(false));
  }, [weekOffset]);

  const weekDates = new Set(DAYS.map(d => d.toDateString()));

  const allBlocks: EventBlock[] = (events || [])
    .filter(ev => weekDates.has(new Date(ev.start_time).toDateString()))
    .map((ev, i): EventBlock => ({
      id: ev.id, venue: ev.location || 'Unassigned', label: ev.title,
      date: new Date(ev.start_time).toDateString(),
      startH: new Date(ev.start_time).getHours(),
      startM: new Date(ev.start_time).getMinutes(),
      endH:   new Date(ev.end_time).getHours(),
      endM:   new Date(ev.end_time).getMinutes(),
      color:  BLOCK_COLORS[i % BLOCK_COLORS.length],
      eventType: ev.type,
    }));

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!newBlock.teamId || !newBlock.venue || !newBlock.label || !newBlock.date) return;

    const [sh, sm] = newBlock.start.split(':').map(Number);
    const [eh, em] = newBlock.end.split(':').map(Number);

    const startDt = new Date(newBlock.date);
    startDt.setHours(sh, sm, 0, 0);
    const endDt = new Date(newBlock.date);
    endDt.setHours(eh, em, 0, 0);

    setSaving(true);
    try {
      const created = await scheduleApi.createEvent({
        team_id:    newBlock.teamId,
        title:      newBlock.label,
        type:       newBlock.type,
        location:   newBlock.venue,
        start_time: startDt.toISOString(),
        end_time:   endDt.toISOString(),
      });
      setEvents(prev => [...prev, created]);
      setNewBlock(BLANK_FORM);
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setSaving(false);
    }
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

      {/* Add event form */}
      {showForm && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
          padding: '22px 24px', marginBottom: 20,
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 16 }}>
            Schedule Session
          </div>
          <form onSubmit={addBlock} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              <div className="field">
                <label className="field-label">Team</label>
                <select className="field-input" style={{ height: 42, cursor: 'pointer' }}
                  value={newBlock.teamId} onChange={e => setNewBlock(p => ({ ...p, teamId: e.target.value }))} required>
                  <option value="">Select team...</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Type</label>
                <select className="field-input" style={{ height: 42, cursor: 'pointer' }}
                  value={newBlock.type} onChange={e => setNewBlock(p => ({ ...p, type: e.target.value as 'Practice' | 'Game' }))}>
                  <option value="Practice">Practice</option>
                  <option value="Game">Game</option>
                </select>
              </div>
              <div className="field">
                <label className="field-label">Venue</label>
                <select className="field-input" style={{ height: 42, cursor: 'pointer' }}
                  value={newBlock.venue} onChange={e => setNewBlock(p => ({ ...p, venue: e.target.value }))} required>
                  <option value="">Select venue...</option>
                  {VENUES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Title</label>
                <input className="field-input" style={{ paddingLeft: 14, height: 42 }} placeholder="e.g. U16 Training"
                  value={newBlock.label} onChange={e => setNewBlock(p => ({ ...p, label: e.target.value }))} required />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-label">Date</label>
                <input type="date" className="field-input" style={{ paddingLeft: 14, height: 42 }}
                  value={newBlock.date} onChange={e => setNewBlock(p => ({ ...p, date: e.target.value }))} required />
              </div>
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
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ whiteSpace: 'nowrap' }}>
                {saving ? 'Saving…' : 'Save Session'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setNewBlock(BLANK_FORM); }}>
                Cancel
              </button>
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

            {/* Empty state — no events this week and not loading */}
            {!loading && allBlocks.length === 0 && (
              <div style={{
                gridColumn: '1 / -1', padding: '48px 24px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>No sessions this week</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Click &ldquo;Block Venue&rdquo; to schedule a Practice or Game</div>
              </div>
            )}

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
                      {loading && (h === 9 || h === 14) && (
                        <div className="skeleton" style={{ position: 'absolute', top: 3, left: 3, right: 3, height: h === 9 ? 40 : 20, borderRadius: 6 }} />
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
                            overflow: 'hidden', display: 'flex', flexDirection: 'column',
                            gap: 2, zIndex: 2,
                          }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {b.label}
                            </span>
                            <span style={{ fontSize: '0.64rem', opacity: 0.75, fontWeight: 500 }}>
                              {b.eventType} · {b.venue}
                            </span>
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
