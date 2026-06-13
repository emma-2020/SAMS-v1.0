'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'solito/navigation';
import { coachApi, healthApi, scheduleApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import { ROLE_COLOR } from '@sams/ui';
import type { Player, HealthEntry, ScheduleEvent } from '@sams/api';

export function CoachDashboardScreen() {
  const user   = useAuthStore(s => s.user);
  const router = useRouter();
  const [players,  setPlayers]  = useState<Player[]>([]);
  const [alerts,   setAlerts]   = useState<HealthEntry[]>([]);
  const [events,   setEvents]   = useState<ScheduleEvent[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([coachApi.getPlayers(), healthApi.getHealthAlerts(), scheduleApi.getEvents()])
      .then(([p, a, e]) => { setPlayers(p); setAlerts(a); setEvents(e.slice(0, 5)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const avgHealth = players.length
    ? Math.round(players.reduce((s, p) => s + (p.latest_health?.overall_score ?? 0), 0) / players.length)
    : 0;

  const kpis = [
    { label: 'My Players',     value: loading ? '…' : players.length,    icon: '👥', color: ROLE_COLOR.Coach },
    { label: 'Avg Wellness',   value: loading ? '…' : `${avgHealth}%`,   icon: '💚', color: '#10B981'        },
    { label: 'Health Alerts',  value: loading ? '…' : alerts.length,     icon: '🚨', color: '#EF4444'        },
    { label: 'Upcoming (14d)', value: loading ? '…' : events.length,     icon: '📅', color: '#6366F1'        },
  ];

  const quickActions = [
    { label: 'Player Management', icon: '👥', path: '/dashboard/coach/players',    desc: 'View profiles & stats'      },
    { label: 'Training Plans',    icon: '🏋️', path: '/dashboard/coach/workouts',   desc: 'Create & assign workouts'   },
    { label: 'Mark Attendance',   icon: '✅', path: '/dashboard/coach/attendance', desc: 'Log present/absent/injured' },
    { label: 'Health Monitor',    icon: '❤️', path: '/dashboard/coach/health',     desc: 'Player wellness overview'   },
    { label: 'Team Chat',         icon: '💬', path: '/dashboard/coach/chat',       desc: 'Message your team'          },
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 40 }}>

      {/* Hero banner */}
      <div style={{
        marginBottom: 24, borderRadius: 24, overflow: 'hidden', minHeight: 140,
        background: 'linear-gradient(135deg,#1D4ED8 0%,#2563EB 55%,#60A5FA 100%)',
      }}>
        <div style={{ padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: '#BFDBFE', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Welcome back,</p>
            <p style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900, letterSpacing: -0.5, margin: 0 }}>
              {user?.first_name} {user?.last_name}
            </p>
            <p style={{ color: '#BFDBFE', fontSize: '0.85rem', marginTop: 4 }}>
              Coach · {players.length} player{players.length !== 1 ? 's' : ''} across your teams
            </p>
          </div>
          <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem' }}>
            🏆
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
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

        {/* Sessions + Quick Actions */}
        <div style={{ display: 'flex', gap: 16 }}>

          {/* Upcoming sessions */}
          <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', margin: 0 }}>Upcoming Sessions</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Next 14 days</p>
              </div>
              <button
                onClick={() => router.push('/dashboard/coach/schedule')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#2563EB' }}
              >
                View all →
              </button>
            </div>
            <div style={{ padding: '0 20px' }}>
              {events.length === 0
                ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '16px 0' }}>No sessions scheduled yet.</p>
                : events.map(e => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ width: 4, height: 40, borderRadius: 2, background: '#2563EB', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{e.title}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{new Date(e.start_time).toLocaleDateString()}</p>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#2563EB15', color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {e.type}
                    </span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card" style={{ width: 288, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', margin: 0 }}>Quick Actions</p>
            </div>
            <div style={{ padding: '8px 16px' }}>
              {quickActions.map(a => (
                <button
                  key={a.path}
                  onClick={() => router.push(a.path)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '1px solid var(--border-subtle)', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'opacity 0.15s' }}
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

        {/* Health Alerts */}
        {alerts.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', margin: 0 }}>Health Alerts</p>
                <p style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: 2 }}>
                  {alerts.length} player{alerts.length !== 1 ? 's' : ''} needing attention
                </p>
              </div>
              <button
                onClick={() => router.push('/dashboard/coach/health')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#EF4444' }}
              >
                View all →
              </button>
            </div>
            {alerts.slice(0, 5).map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', marginRight: 12, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Player #{a.player_id.slice(0, 8)}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Score: {a.overall_score} · {new Date(a.submitted_at).toLocaleDateString()}
                  </p>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#EF444418', color: '#EF4444' }}>
                  Alert
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
