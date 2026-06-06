'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { healthApi, scheduleApi, workoutApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import { ROLE_COLOR } from '@sams/ui';
import type { HealthEntry, ScheduleEvent, WorkoutPlan } from '@sams/api';

export function PlayerDashboardScreen() {
  const user   = useAuthStore(s => s.user);
  const router = useRouter();
  const [latestHealth, setLatestHealth] = useState<HealthEntry | null>(null);
  const [events,       setEvents]       = useState<ScheduleEvent[]>([]);
  const [workouts,     setWorkouts]     = useState<WorkoutPlan[]>([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    Promise.all([healthApi.getMyHealth(), scheduleApi.getEvents(), workoutApi.getWorkouts()])
      .then(([h, e, w]) => {
        setLatestHealth(h[0] ?? null);
        setEvents(e.slice(0, 4));
        setWorkouts(w.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const healthScore = latestHealth?.overall_score ?? 0;
  const healthColor = healthScore >= 70 ? '#10B981' : healthScore >= 40 ? '#F59E0B' : '#EF4444';

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const kpis = [
    { label: 'Upcoming Sessions', value: loading ? '…' : events.length,   icon: '📅', color: ROLE_COLOR.Player },
    { label: 'Wellness Score',    value: loading ? '…' : healthScore,      icon: '💚', color: healthColor       },
    { label: 'Active Workouts',   value: loading ? '…' : workouts.length,  icon: '🏋️', color: '#D97706'         },
  ];

  const quickActions = [
    { label: 'Health Dashboard', icon: '💊', path: '/dashboard/player/health',   desc: 'View & log wellness'        },
    { label: 'My Workouts',      icon: '🏋️', path: '/dashboard/player/workouts', desc: 'Training assignments'        },
    { label: 'Full Schedule',    icon: '📅', path: '/dashboard/player/schedule', desc: 'All sessions & matches'      },
    { label: 'Team Chat',        icon: '💬', path: '/dashboard/player/chat',     desc: 'Message teammates & coach'   },
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 40 }}>

      {/* Hero banner */}
      <div style={{
        marginBottom: 24, borderRadius: 24, overflow: 'hidden', minHeight: 140,
        background: 'linear-gradient(135deg,#047857 0%,#059669 55%,#34D399 100%)',
      }}>
        <div style={{ padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: '#A7F3D0', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>{greeting},</p>
            <p style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900, letterSpacing: -0.5, margin: 0 }}>
              {user?.first_name} {user?.last_name}
            </p>
            <p style={{ color: '#A7F3D0', fontSize: '0.85rem', marginTop: 4 }}>Player Hub · Sports Academy</p>
          </div>
          <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem' }}>
            ⚽
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {kpis.map(kpi => (
            <div key={kpi.label} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${kpi.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                  {kpi.icon}
                </div>
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -0.5, margin: 0 }}>
                {kpi.value}
              </p>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginTop: 4 }}>
                {kpi.label}
              </p>
            </div>
          ))}
        </div>

        {/* Upcoming sessions + Quick actions */}
        <div style={{ display: 'flex', gap: 16 }}>

          {/* Upcoming sessions */}
          <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', margin: 0 }}>Upcoming Sessions</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Your next training & matches</p>
              </div>
              <button
                onClick={() => router.push('/dashboard/player/schedule')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: ROLE_COLOR.Player }}
              >
                Full schedule →
              </button>
            </div>
            <div style={{ padding: '0 20px' }}>
              {events.length === 0
                ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '16px 0' }}>No upcoming sessions.</p>
                : events.map(e => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ width: 4, height: 40, borderRadius: 2, background: ROLE_COLOR.Player, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{e.title}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(e.start_time).toLocaleDateString()} · {e.type}
                      </p>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Quick actions */}
          <div className="card" style={{ width: 288, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', margin: 0 }}>Quick Actions</p>
            </div>
            <div style={{ padding: '8px 16px' }}>
              {quickActions.map(a => (
                <button
                  key={a.path}
                  onClick={() => router.push(a.path)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', background: 'none', border: 'none', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'opacity 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  <span style={{ fontSize: '1.1rem' }}>{a.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>{a.label}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{a.desc}</p>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>›</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Wellness snapshot + Active workouts */}
        {(latestHealth || workouts.length > 0) && (
          <div style={{ display: 'flex', gap: 16 }}>

            {/* Wellness snapshot */}
            {latestHealth && (
              <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', margin: 0 }}>Today's Wellness</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>latest check-in</p>
                </div>
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Energy',   value: latestHealth.energy,         color: ROLE_COLOR.Player, max: 5 },
                    { label: 'Sleep',    value: latestHealth.sleep,           color: '#6366F1',         max: 5 },
                    { label: 'Soreness', value: latestHealth.muscle_soreness, color: '#F97316',         max: 5 },
                    { label: 'Stress',   value: latestHealth.stress,          color: '#EF4444',         max: 5 },
                  ].map(m => (
                    <div key={m.label}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{m.label}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.value}/{m.max}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 99, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                        <div style={{ width: `${(m.value / m.max) * 100}%`, height: '100%', borderRadius: 99, backgroundColor: m.color, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active workouts */}
            {workouts.length > 0 && (
              <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', margin: 0 }}>Active Training Plans</p>
                </div>
                {workouts.map(w => (
                  <div key={w.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${ROLE_COLOR.Player}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12, fontSize: '1.25rem' }}>
                      🏋️
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{w.title}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {w.duration_minutes} min · {w.difficulty}
                      </p>
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: ROLE_COLOR.Player }}>
                      {w.exercises.length} exercises
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
