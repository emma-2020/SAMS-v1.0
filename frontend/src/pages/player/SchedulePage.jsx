// src/pages/player/SchedulePage.jsx
import { useState } from 'react';
import { useApi }      from '../../hooks/useApi';
import { scheduleApi } from '../../services/schedule.api';

const TYPE_META = {
  Game:     { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: '⚽', label: 'Match' },
  Practice: { color: '#6366F1', bg: 'rgba(99,102,241,0.12)', icon: '🏃', label: 'Training' },
};

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtFull(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function daysLabel(iso) {
  const d = Math.ceil((new Date(iso) - new Date()) / 86400000);
  if (d < 0)  return { text: 'Past',     color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' };
  if (d === 0) return { text: 'Today',   color: '#10B981', bg: 'rgba(16,185,129,0.12)'  };
  if (d === 1) return { text: 'Tomorrow',color: '#6366F1', bg: 'rgba(99,102,241,0.12)'  };
  return { text: `In ${d}d`, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' };
}

// Build a month calendar from events
function buildMonthCal(year, month, events) {
  const firstDay  = new Date(year, month, 1).getDay();
  const daysCount = new Date(year, month + 1, 0).getDate();
  const today     = new Date().getDate();
  const nowMonth  = new Date().getMonth();
  const nowYear   = new Date().getFullYear();

  const evMap = {};
  (events || []).forEach(ev => {
    const d = new Date(ev.start_time);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const key = d.getDate();
      if (!evMap[key]) evMap[key] = [];
      evMap[key].push(ev);
    }
  });

  const cells = Array.from({ length: firstDay }, () => null)
    .concat(Array.from({ length: daysCount }, (_, i) => i + 1));

  return { cells, evMap, today: year === nowYear && month === nowMonth ? today : -1 };
}

export default function PlayerSchedulePage() {
  const now = new Date();
  const [calYear,  setCalYear]  = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [view,     setView]     = useState('list'); // 'list' | 'calendar'

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  // Fetch 90 days of events
  const start90 = new Date(); start90.setDate(start90.getDate() - 7);
  const end90   = new Date(); end90.setDate(end90.getDate() + 90);

  const { data: events, loading } = useApi(
    () => scheduleApi.getEvents({ start: start90.toISOString(), end: end90.toISOString() }),
    [], { fallback: [] }
  );

  const sorted     = [...(events || [])].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  const upcoming   = sorted.filter(e => new Date(e.start_time) >= new Date());
  const past       = sorted.filter(e => new Date(e.start_time) < new Date());

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  }

  const { cells, evMap, today } = buildMonthCal(calYear, calMonth, events || []);
  const gameCount     = (events || []).filter(e => e.type === 'Game').length;
  const practiceCount = (events || []).filter(e => e.type === 'Practice').length;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* Header banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0D1B3E, #1a2d5a)',
        borderRadius: 16, padding: '24px 28px',
        marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', right: -20, top: -20, width: 140, height: 140,
          borderRadius: '50%', background: 'rgba(99,102,241,0.08)',
        }}/>
        <div>
          <div style={{ fontWeight: 900, fontSize: '1.4rem', color: 'white', marginBottom: 4 }}>My Schedule</div>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.82rem' }}>
            {MONTHS[now.getMonth()]} {now.getFullYear()} · {upcoming.length} upcoming sessions
          </p>
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            {[
              { label: 'Matches',   value: gameCount,     color: '#EF4444', icon: '⚽' },
              { label: 'Training',  value: practiceCount, color: '#6366F1', icon: '🏃' },
            ].map(({ label, value, color, icon }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{icon}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color }}>{value}</span>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['list', '☰ List'], ['calendar', '🗓 Calendar']].map(([v, lbl]) => (
            <button
              key={v} onClick={() => setView(v)}
              style={{
                padding: '8px 16px', borderRadius: 9, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                background: view === v ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${view === v ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                color: view === v ? 'white' : 'rgba(255,255,255,0.5)',
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14 }}/>
          ))}
        </div>
      )}

      {!loading && view === 'calendar' && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
          borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
        }}>
          {/* Calendar header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)',
            background: 'linear-gradient(180deg, var(--bg-elevated), var(--bg-surface))',
          }}>
            <button onClick={prevMonth} style={navBtn}>← Prev</button>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
              {MONTHS[calMonth]} {calYear}
            </div>
            <button onClick={nextMonth} style={navBtn}>Next →</button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '10px 16px 4px' }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, padding: '0 16px 16px' }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={`e${idx}`} />;
              const dayEvents = evMap[day] || [];
              const isToday   = day === today;
              return (
                <div
                  key={day}
                  style={{
                    minHeight: 68, borderRadius: 10, padding: '6px 6px',
                    background: isToday ? 'var(--accent-subtle)' : dayEvents.length ? 'var(--bg-elevated)' : 'transparent',
                    border: `1px solid ${isToday ? 'var(--border-accent)' : dayEvents.length ? 'var(--border-subtle)' : 'transparent'}`,
                  }}
                >
                  <div style={{
                    fontSize: '0.78rem', fontWeight: isToday ? 800 : 500,
                    color: isToday ? 'var(--accent)' : 'var(--text-secondary)', marginBottom: 3,
                  }}>
                    {day}
                  </div>
                  {dayEvents.slice(0, 2).map(ev => {
                    const meta = TYPE_META[ev.type] || TYPE_META.Practice;
                    return (
                      <div key={ev.id} style={{
                        fontSize: '0.6rem', fontWeight: 600, padding: '1px 4px', borderRadius: 4,
                        background: meta.bg, color: meta.color, marginBottom: 2,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {meta.icon} {ev.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>+{dayEvents.length - 2} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && view === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Upcoming */}
          <div>
            <div style={{
              fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--text-muted)', marginBottom: 12,
            }}>
              Upcoming Sessions — {upcoming.length}
            </div>
            {upcoming.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '40px 24px',
                background: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📅</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>No upcoming sessions</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '4px 0 0' }}>
                  Your coach will schedule sessions for your team.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcoming.map(ev => {
                  const meta = TYPE_META[ev.type] || TYPE_META.Practice;
                  const lbl  = daysLabel(ev.start_time);
                  return (
                    <div key={ev.id} style={{
                      background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                      borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                    }}>
                      <div style={{ width: 5, flexShrink: 0, background: meta.color }}/>
                      <div style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 18px',
                      }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                          background: meta.bg, border: `1px solid ${meta.color}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.3rem',
                        }}>
                          {meta.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{ev.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {fmtDate(ev.start_time)} · {fmtTime(ev.start_time)}–{fmtTime(ev.end_time)}
                            {ev.location && ` · ${ev.location}`}
                          </div>
                          {ev.teams?.name && (
                            <span style={{
                              display: 'inline-block', marginTop: 4,
                              fontSize: '0.65rem', fontWeight: 700, padding: '1px 7px', borderRadius: 99,
                              background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                              color: 'var(--text-muted)',
                            }}>
                              {ev.teams.name}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
                            background: lbl.bg, color: lbl.color,
                          }}>
                            {lbl.text}
                          </span>
                          <span style={{
                            padding: '2px 8px', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700,
                            background: meta.bg, color: meta.color,
                          }}>
                            {meta.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past sessions */}
          {past.length > 0 && (
            <div>
              <div style={{
                fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'var(--text-muted)', marginBottom: 12,
              }}>
                Past Sessions — {past.length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {past.slice(0, 5).map(ev => {
                  const meta = TYPE_META[ev.type] || TYPE_META.Practice;
                  return (
                    <div key={ev.id} style={{
                      background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                      borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                      opacity: 0.7,
                    }}>
                      <span style={{ fontSize: '1rem' }}>{meta.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{ev.title}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fmtDate(ev.start_time)}</div>
                      </div>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '1px 8px', borderRadius: 99,
                        background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                        color: 'var(--text-muted)',
                      }}>
                        Completed
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const navBtn = {
  padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
  background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
  color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600,
};
