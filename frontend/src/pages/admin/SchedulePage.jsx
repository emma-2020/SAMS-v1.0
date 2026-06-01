// src/pages/admin/SchedulePage.jsx
import { useState } from 'react';
import { useApi }   from '../../hooks/useApi';
import { adminApi } from '../../services/admin.api';
import { PageHeader, SectionCard, EmptyState, ErrorBanner } from '../../components/shared/ui';

const VENUES = ['Pitch A', 'Pitch B', 'Indoor Gym', 'Weights Room', 'Court 1'];
const HOURS  = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00–20:00

const BLOCK_COLORS = [
  { bg:'#EEF2FF', color:'#6366F1', border:'#C7D2FE' },
  { bg:'#ECFDF5', color:'#059669', border:'#A7F3D0' },
  { bg:'#FFFBEB', color:'#D97706', border:'#FDE68A' },
  { bg:'#FEF2F2', color:'#DC2626', border:'#FECACA' },
  { bg:'#EFF6FF', color:'#2563EB', border:'#BFDBFE' },
];

const IcoCalendar = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoPlus     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoX        = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

export default function AdminSchedulePage() {
  const today = new Date();
  const [weekOffset, setWeekOffset]   = useState(0);
  const [showForm, setShowForm]       = useState(false);
  const [localBlocks, setLocalBlocks] = useState([]);
  const [newBlock, setNewBlock]       = useState({ venue: '', label: '', date: '', start: '09:00', end: '11:00' });

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + weekOffset * 7 - today.getDay() + 1);

  const DAYS = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const { data: events, loading, error, refetch } = useApi(
    () => adminApi.getAllEvents({
      start: DAYS[0].toISOString(),
      end: DAYS[6].toISOString(),
    }),
    [weekOffset], { fallback: [] }
  );

  const allBlocks = [
    ...(events || []).map((ev, i) => ({
      id: ev.id, venue: ev.location || 'Unassigned',
      label: ev.title, date: new Date(ev.start_time).toDateString(),
      startH: new Date(ev.start_time).getHours(),
      startM: new Date(ev.start_time).getMinutes(),
      endH: new Date(ev.end_time).getHours(),
      endM: new Date(ev.end_time).getMinutes(),
      color: BLOCK_COLORS[i % BLOCK_COLORS.length], source: 'event',
    })),
    ...localBlocks,
  ];

  function addBlock(e) {
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
      <PageHeader
        title="Resource Schedule"
        subtitle="Manage training grounds and venue bookings"
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)', padding: '6px 12px',
              fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)',
              boxShadow: 'var(--shadow-sm)',
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
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(s => !s)}>
              <IcoPlus /> Block Venue
            </button>
          </div>
        }
      />

      {/* Add block form */}
      {showForm && (
        <SectionCard title="Reserve Venue Time" style={{ marginBottom: 20 }}>
          <form onSubmit={addBlock} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="field">
                <label className="field-label">Venue</label>
                <select className="field-select" value={newBlock.venue}
                  onChange={e => setNewBlock(p => ({ ...p, venue: e.target.value }))}>
                  <option value="">Select venue...</option>
                  {VENUES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Date</label>
                <input type="date" className="field-input" value={newBlock.date}
                  onChange={e => setNewBlock(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="field">
                <label className="field-label">Label / Team</label>
                <input className="field-input" placeholder="e.g. U16 Training"
                  value={newBlock.label}
                  onChange={e => setNewBlock(p => ({ ...p, label: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-label">Start Time</label>
                <input type="time" className="field-input" value={newBlock.start}
                  onChange={e => setNewBlock(p => ({ ...p, start: e.target.value }))} />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-label">End Time</label>
                <input type="time" className="field-input" value={newBlock.end}
                  onChange={e => setNewBlock(p => ({ ...p, end: e.target.value }))} />
              </div>
              <button type="submit" className="btn btn-primary">Add Block</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </SectionCard>
      )}

      {error && <ErrorBanner message={error} onRetry={refetch} style={{ marginBottom: 16 }} />}

      {/* Calendar grid */}
      <SectionCard noPad>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 720 }}>

            {/* Day headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '64px repeat(7, 1fr)',
              borderBottom: '1px solid var(--border-default)',
              background: 'var(--bg-elevated)',
            }}>
              <div />
              {DAYS.map(d => {
                const isToday = d.toDateString() === today.toDateString();
                return (
                  <div key={d.toISOString()} style={{
                    textAlign: 'center', padding: '12px 4px',
                    borderLeft: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{
                      fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: isToday ? 'var(--accent)' : 'var(--text-muted)',
                    }}>
                      {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </div>
                    <div style={{
                      fontSize: '1.1rem', fontWeight: 800,
                      color: isToday ? 'var(--accent)' : 'var(--text-primary)',
                      marginTop: 2,
                    }}>
                      {d.getDate()}
                    </div>
                    {isToday && (
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: 'var(--accent)', margin: '4px auto 0',
                      }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hour rows */}
            {loading ? (
              <div className="skeleton" style={{ height: 400, margin: 16, borderRadius: 8 }} />
            ) : (
              HOURS.map(h => (
                <div key={h} style={{
                  display: 'grid',
                  gridTemplateColumns: '64px repeat(7, 1fr)',
                  minHeight: 44,
                  borderBottom: '1px solid var(--border-subtle)',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
                    color: 'var(--text-muted)', padding: '4px 10px 0 0',
                    textAlign: 'right', flexShrink: 0,
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
                        {blocks.map(b => {
                          const duration = (b.endH - b.startH) + (b.endM - b.startM) / 60;
                          return (
                            <div key={b.id} style={{
                              position: 'absolute', top: 3, left: 3, right: 3,
                              minHeight: Math.max(duration * 44 - 6, 20),
                              borderRadius: 6, padding: '3px 7px',
                              background: b.color.bg, border: `1px solid ${b.color.border}`,
                              fontSize: '0.72rem', fontWeight: 600,
                              color: b.color.color, overflow: 'hidden',
                              display: 'flex', alignItems: 'flex-start',
                              justifyContent: 'space-between', gap: 4,
                              zIndex: 2,
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
              ))
            )}
          </div>
        </div>
      </SectionCard>

      {/* Venue legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
        {VENUES.map((v, i) => (
          <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 10, height: 10, borderRadius: 2,
              background: BLOCK_COLORS[i % BLOCK_COLORS.length].color,
            }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
