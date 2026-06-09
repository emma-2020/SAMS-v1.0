'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { healthApi, scheduleApi, workoutApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import type { HealthEntry, ScheduleEvent, WorkoutPlan } from '@sams/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysUntil(iso: string) {
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (d < 0)   return { text: 'Past',     color: '#94A3B8' };
  if (d === 0) return { text: 'Today',    color: '#10B981' };
  if (d === 1) return { text: 'Tomorrow', color: '#6366F1' };
  return { text: `In ${d}d`, color: '#F59E0B' };
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PlayerDashboardPage() {
  const user   = useAuthStore(s => s.user);
  const router = useRouter();
  const today  = new Date();

  const [events,     setEvents]     = useState<ScheduleEvent[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthEntry[]>([]);
  const [workouts,   setWorkouts]   = useState<WorkoutPlan[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    Promise.all([
      scheduleApi.getEvents(),
      healthApi.getMyHealth(),
      workoutApi.getWorkouts(),
    ])
      .then(([evts, hl, wk]) => {
        setEvents(evts ?? []);
        setHealthLogs(hl ?? []);
        setWorkouts(wk ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const upcoming     = events.slice(0, 4);
  const todayEvents  = events.filter(ev => new Date(ev.start_time).toDateString() === today.toDateString());
  const latestLog    = healthLogs[0] ?? null;
  const todayLogged  = latestLog
    ? new Date(latestLog.submitted_at).toDateString() === today.toDateString()
    : false;

  const allExercises   = workouts.flatMap(w => w.exercises ?? []);
  const totalExercises = allExercises.length;

  const fitnessScore = latestLog ? latestLog.overall_score : null;
  const fitnessLabel = fitnessScore === null ? 'Log Today'
    : fitnessScore >= 70 ? 'Fully Fit'
    : fitnessScore >= 45 ? 'Moderate'
    : 'Needs Rest';
  const fitnessColor = fitnessScore === null ? '#6366F1'
    : fitnessScore >= 70 ? '#10B981'
    : fitnessScore >= 45 ? '#F59E0B'
    : '#EF4444';

  const greetingHour  = today.getHours();
  const greetingWord  = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';
  const greetingEmoji = greetingHour < 12 ? '🌅' : greetingHour < 17 ? '☀️' : '🌙';

  const statsRow = [
    {
      label: 'Sessions This Month',
      value: loading ? '…' : (events.length || '—'),
      color: '#6366F1', icon: '📅',
      action: () => router.push('/dashboard/player/schedule'),
    },
    {
      label: "Today's Sessions",
      value: loading ? '…' : todayEvents.length,
      color: '#3B82F6', icon: '⚽',
      sub: todayEvents[0]?.title || 'None today',
    },
    {
      label: 'Workouts Progress',
      value: loading ? '…' : (totalExercises ? `0/${totalExercises}` : '—'),
      color: '#D97706', icon: '🏋️',
      action: () => router.push('/dashboard/player/workouts'),
    },
    {
      label: 'Wellness Status',
      value: loading ? '…' : fitnessLabel,
      color: fitnessColor, icon: '💚',
      action: () => router.push('/dashboard/player/health'),
    },
  ] as const;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* ── Hero banner ─────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0D1B3E 0%, #1a2d5a 50%, #0f2244 100%)',
        borderRadius: 18, padding: '28px 32px 24px',
        marginBottom: 24, position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative orbs */}
        <div style={{ position: 'absolute', right: -50, top: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(99,102,241,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -80, width: 180, height: 180, borderRadius: '50%', background: 'rgba(16,185,129,0.04)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
              {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <h1 style={{ fontWeight: 900, fontSize: '1.6rem', color: 'white', margin: '0 0 4px' }}>
              {greetingWord}, {user?.first_name}! {greetingEmoji}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', margin: '0 0 18px', fontSize: '0.875rem' }}>
              {todayEvents.length > 0
                ? `You have ${todayEvents.length} session${todayEvents.length > 1 ? 's' : ''} today.`
                : upcoming.length > 0
                  ? `Next session: ${upcoming[0]?.title} on ${fmtShort(upcoming[0]?.start_time)}`
                  : 'No sessions scheduled. Stay active!'}
            </p>
            {!todayLogged && (
              <button
                onClick={() => router.push('/dashboard/player/health')}
                style={{
                  padding: '10px 20px', borderRadius: 10,
                  background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)',
                  color: '#A5B4FC', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <span>💊</span> Log today&apos;s wellness check-in
              </button>
            )}
          </div>

          {/* Circular fitness ring */}
          <div style={{
            flexShrink: 0, textAlign: 'center',
            padding: 16, borderRadius: 14,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <svg viewBox="0 0 80 80" width="80" height="80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
              {fitnessScore !== null && (
                <circle
                  cx="40" cy="40" r="32" fill="none"
                  stroke={fitnessColor} strokeWidth="7"
                  strokeDasharray={`${(fitnessScore / 100) * 201} 201`}
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
                />
              )}
              <text x="40" y="36" textAnchor="middle" fontSize="13" fontWeight="900" fill="white">
                {fitnessScore !== null ? fitnessScore : '—'}
              </text>
              {fitnessScore !== null && (
                <text x="40" y="49" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.4)">%</text>
              )}
            </svg>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: fitnessColor, marginTop: 4, letterSpacing: '0.04em' }}>
              {fitnessLabel}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        {statsRow.map(({ label, value, color, icon, ...rest }) => {
          const sub    = 'sub' in rest ? rest.sub : undefined;
          const action = 'action' in rest ? rest.action : undefined;
          return (
            <div
              key={label}
              onClick={action}
              style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                borderRadius: 14, padding: '18px 20px',
                boxShadow: 'var(--shadow-sm)', cursor: action ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                if (action) {
                  (e.currentTarget as HTMLDivElement).style.borderColor = color;
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={e => {
                if (action) {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-subtle)';
                  (e.currentTarget as HTMLDivElement).style.transform = 'none';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${color}15`, border: `1px solid ${color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                }}>
                  {icon}
                </div>
                {action && <span style={{ fontSize: '0.7rem', color, fontWeight: 700 }}>View →</span>}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{sub ?? label}</div>
            </div>
          );
        })}
      </div>

      {/* ── Main 2-column grid ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>

        {/* Upcoming sessions */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
          borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)',
            background: 'linear-gradient(180deg, var(--bg-elevated), var(--bg-surface))',
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Upcoming Sessions</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>Your next training &amp; matches</div>
            </div>
            <button
              onClick={() => router.push('/dashboard/player/schedule')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#6366F1' }}
            >
              Full schedule →
            </button>
          </div>

          {upcoming.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 10, opacity: 0.7 }}>📅</div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>No upcoming sessions</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '6px 0 0' }}>
                Your coach will schedule sessions for your team.
              </p>
            </div>
          ) : (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcoming.map(ev => {
                const lbl    = daysUntil(ev.start_time);
                const isGame = ev.type === 'match';
                const color  = isGame ? '#EF4444' : '#6366F1';
                return (
                  <div key={ev.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    borderRadius: 12, borderLeft: `3px solid ${color}`,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 9, flexShrink: 0,
                      background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                    }}>
                      {isGame ? '⚽' : '🏃'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ev.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                        {fmtShort(ev.start_time)} · {fmtTime(ev.start_time)}
                        {ev.location ? ` · ${ev.location}` : ''}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700,
                        background: `${lbl.color}15`, color: lbl.color,
                      }}>
                        {lbl.text}
                      </span>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                        background: `${color}12`, color, textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        {ev.type}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Quick Actions */}
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
            borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)',
              background: 'linear-gradient(180deg, var(--bg-elevated), var(--bg-surface))',
              fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)',
            }}>
              Quick Actions
            </div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([
                { label: 'Health Dashboard', path: '/dashboard/player/health',   color: '#10B981', icon: '💊', desc: 'View & log wellness'      },
                { label: 'My Workouts',      path: '/dashboard/player/workouts', color: '#D97706', icon: '🏋️', desc: 'Training assignments'      },
                { label: 'Full Schedule',    path: '/dashboard/player/schedule', color: '#6366F1', icon: '📅', desc: 'All sessions & matches'     },
                { label: 'Team Chat',        path: '/dashboard/player/chat',     color: '#2563EB', icon: '💬', desc: 'Message teammates & coach'  },
              ] as const).map(({ label, path, color, icon, desc }) => (
                <button
                  key={path}
                  onClick={() => router.push(path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', width: '100%', textAlign: 'left',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = color;
                    (e.currentTarget as HTMLButtonElement).style.background = `${color}06`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)';
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem',
                  }}>
                    {icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{label}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>{desc}</div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Last Wellness Log */}
          {latestLog ? (
            <div style={{
              background: `linear-gradient(135deg, ${fitnessColor}10, var(--bg-surface))`,
              border: `1px solid ${fitnessColor}25`,
              borderRadius: 14, padding: '16px 18px',
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 10 }}>
                Last Wellness Log
              </div>
              {([
                { label: 'Fatigue',  value: latestLog.stress,          max: 5, color: '#EF4444' },
                { label: 'Soreness', value: latestLog.muscle_soreness, max: 5, color: '#F59E0B' },
                { label: 'Sleep',    value: latestLog.sleep,           max: 5, color: '#6366F1' },
              ] as const).map(({ label, value, max, color }) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color }}>{value}/{max}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 99, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, width: `${(value / max) * 100}%`, background: color }} />
                  </div>
                </div>
              ))}
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {new Date(latestLog.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' '}·{' '}
                <button
                  onClick={() => router.push('/dashboard/player/health')}
                  style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit', fontWeight: 700, padding: 0 }}
                >
                  View health →
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
              borderRadius: 14, padding: '16px 18px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>💚</div>
              <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>No wellness log yet</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: '4px 0 10px' }}>
                Log your daily check-in to track fitness.
              </p>
              <button
                onClick={() => router.push('/dashboard/player/health')}
                style={{
                  padding: '7px 14px', borderRadius: 8,
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                  color: '#6366F1', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                }}
              >
                Log check-in →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
