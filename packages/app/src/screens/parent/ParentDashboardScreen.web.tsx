'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { healthApi, scheduleApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import { ROLE_COLOR } from '@sams/ui';
import type { HealthEntry, ScheduleEvent } from '@sams/api';

export function ParentDashboardScreen() {
  const user   = useAuthStore(s => s.user);
  const router = useRouter();
  const [alerts,  setAlerts]  = useState<HealthEntry[]>([]);
  const [events,  setEvents]  = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([healthApi.getHealthAlerts(), scheduleApi.getEvents()])
      .then(([a, e]) => { setAlerts(a); setEvents(e.slice(0, 5)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const kpis = [
    { label: 'Upcoming Sessions', value: loading ? '…' : events.length, icon: '📅', color: ROLE_COLOR.Parent },
    { label: 'Wellness Alerts',   value: loading ? '…' : alerts.length,  icon: '❤️', color: '#EF4444'        },
    { label: 'Coach Messages',    value: '—',                              icon: '💬', color: '#6366F1'        },
  ];

  const quickActions = [
    { label: 'Health Alerts',  icon: '❤️', path: '/dashboard/parent/health',   desc: 'View wellness flags'         },
    { label: 'Full Schedule',  icon: '📅', path: '/dashboard/parent/schedule', desc: 'All upcoming sessions'        },
    { label: 'Message Coach',  icon: '💬', path: '/dashboard/parent/chat',     desc: 'Direct coach communication'  },
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 40 }}>

      {/* Hero banner */}
      <div style={{
        marginBottom: 24, borderRadius: 24, overflow: 'hidden', minHeight: 140,
        background: 'linear-gradient(135deg,#B45309 0%,#D97706 55%,#FBBF24 100%)',
      }}>
        <div style={{ padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: '#FDE68A', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Welcome,</p>
            <p style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900, letterSpacing: -0.5, margin: 0 }}>
              {user?.first_name} {user?.last_name}
            </p>
            <p style={{ color: '#FDE68A', fontSize: '0.85rem', marginTop: 4 }}>
              Parent Portal · Track your child's academy journey
            </p>
          </div>
          <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem' }}>
            👨‍👧
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

        {/* Schedule + Quick Actions */}
        <div style={{ display: 'flex', gap: 16 }}>

          {/* Child's schedule */}
          <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', margin: 0 }}>Child's Schedule</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Upcoming sessions & matches</p>
              </div>
              <button
                onClick={() => router.push('/dashboard/parent/schedule')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: ROLE_COLOR.Parent }}
              >
                Full schedule →
              </button>
            </div>
            <div style={{ padding: '0 20px' }}>
              {events.length === 0
                ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '16px 0' }}>No upcoming sessions scheduled.</p>
                : events.map(e => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ width: 4, height: 40, borderRadius: 2, background: ROLE_COLOR.Parent, flexShrink: 0 }} />
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
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-subtle)', background: 'none', border: 'none', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'opacity 0.15s' }}
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
            <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', margin: 0 }}>Health Alerts</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Your athlete's recent wellness check-ins
              </p>
            </div>
            {alerts.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Wellness Score: {a.overall_score}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {new Date(a.submitted_at).toLocaleDateString()} at{' '}
                    {new Date(a.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {a.notes && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                      "{a.notes}"
                    </p>
                  )}
                </div>
                <div style={{
                  padding: '4px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
                  background: a.overall_score >= 70 ? '#ECFDF5' : a.overall_score >= 40 ? '#FFFBEB' : '#FEF2F2',
                  color:      a.overall_score >= 70 ? '#10B981' : a.overall_score >= 40 ? '#F59E0B' : '#EF4444',
                }}>
                  {a.overall_score >= 70 ? 'Good' : a.overall_score >= 40 ? 'Moderate' : 'Low'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
