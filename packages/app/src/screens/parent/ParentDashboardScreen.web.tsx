'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { healthApi, scheduleApi, coachApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import { NAVY_DARK } from '@sams/ui';
import type { HealthEntry, ScheduleEvent, Player } from '@sams/api';

const NAVY_MID  = '#172B5E';
const NAVY_LITE = '#1E3A7F';

const AVATAR_PALETTE = ['#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#06B6D4'];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function getGreeting(firstName: string): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: `Good morning, ${firstName}!`,   emoji: '☀️' };
  if (hour < 17) return { text: `Good afternoon, ${firstName}!`, emoji: '⛅' };
  return              { text: `Good evening, ${firstName}!`,     emoji: '🌙' };
}

export function ParentDashboardScreen() {
  const user   = useAuthStore(s => s.user);
  const router = useRouter();

  const [alerts,  setAlerts]  = useState<HealthEntry[]>([]);
  const [events,  setEvents]  = useState<ScheduleEvent[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      healthApi.getHealthAlerts().catch((): HealthEntry[]   => []),
      scheduleApi.getEvents()    .catch((): ScheduleEvent[] => []),
      coachApi.getPlayers()      .catch(() => ({ players: [] as Player[] })),
    ]).then(([a, e, p]) => {
      setAlerts(a);
      setEvents(e.slice(0, 5));
      const playerArr: Player[] = Array.isArray(p) ? p : ((p as any)?.players ?? []);
      setPlayers(playerArr);
    }).finally(() => setLoading(false));
  }, []);

  const firstName = user?.first_name ?? 'there';
  const { text: greetText, emoji: greetEmoji } = getGreeting(firstName);
  const userInitials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`;

  const kpis = [
    { label: 'Upcoming Sessions', value: loading ? '…' : String(events.length), icon: '📅', bg: '#EFF6FF', accent: '#2563EB', path: '/dashboard/parent/schedule' },
    { label: 'Wellness Alerts',   value: loading ? '…' : String(alerts.length), icon: '❤️', bg: '#FEF2F2', accent: '#EF4444', path: '/dashboard/parent/health'   },
    { label: 'Coach Messages',    value: '—',                                    icon: '💬', bg: '#F5F3FF', accent: '#7C3AED', path: '/dashboard/parent/chat'     },
  ];

  const quickActions = [
    { label: 'Health Alerts',  icon: '❤️', path: '/dashboard/parent/health',   desc: 'View wellness flags'        },
    { label: 'Full Schedule',  icon: '📅', path: '/dashboard/parent/schedule', desc: 'All upcoming sessions'       },
    { label: 'Message Coach',  icon: '💬', path: '/dashboard/parent/chat',     desc: 'Direct coach communication' },
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 40 }}>

      {/* ── NAVY HERO BANNER ── */}
      <div style={{
        marginBottom: 24, borderRadius: 20, overflow: 'hidden',
        background: `linear-gradient(135deg, ${NAVY_DARK} 0%, ${NAVY_MID} 55%, ${NAVY_LITE} 100%)`,
        padding: '32px 36px', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', right: -48, top: -48,
          width: 220, height: 220, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', right: 80, bottom: -64,
          width: 160, height: 160, borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)', pointerEvents: 'none',
        }} />

        {/* PARENT capsule tag */}
        <div style={{ marginBottom: 14 }}>
          <span style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 6, padding: '3px 10px',
            color: 'rgba(255,255,255,0.85)',
            fontSize: '0.63rem', fontWeight: 800,
            letterSpacing: '0.16em', textTransform: 'uppercase',
          }}>PARENT</span>
        </div>

        {/* Greeting row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{
              color: '#FFFFFF', fontSize: '1.75rem', fontWeight: 900,
              letterSpacing: '-0.03em', margin: 0, lineHeight: 1.2,
            }}>
              {greetText} {greetEmoji}
            </h1>
            <p style={{
              color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem',
              margin: '8px 0 0',
            }}>
              Parent Portal · Track your child&apos;s academy journey
            </p>
          </div>

          <div style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.15)',
            border: '2px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em',
          }}>
            {userInitials || '👤'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── KPI ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {kpis.map(kpi => (
            <div
              key={kpi.label}
              className="card"
              onClick={() => router.push(kpi.path)}
              style={{ padding: 20, cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px ${kpi.accent}22`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'none';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '';
              }}
            >
              <div style={{ marginBottom: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: kpi.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem',
                }}>
                  {kpi.icon}
                </div>
              </div>
              <p style={{
                fontSize: '1.75rem', fontWeight: 900,
                color: 'var(--text-primary)', letterSpacing: -0.5, margin: 0,
              }}>
                {kpi.value}
              </p>
              <p style={{
                fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.09em', color: 'var(--text-muted)', marginTop: 5,
              }}>
                {kpi.label}
              </p>
            </div>
          ))}
        </div>

        {/* ── LINKED PLAYERS ROSTER ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Card header */}
          <div style={{
            padding: '18px 20px 14px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', margin: 0 }}>
                Linked Players
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Your registered athlete profiles
              </p>
            </div>
          </div>

          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2.2fr 1.4fr 1fr 1fr',
            padding: '8px 20px',
            background: 'var(--bg-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            {['PLAYER', 'TEAM', 'STATUS', 'ACTIONS'].map(col => (
              <span key={col} style={{
                fontSize: '0.63rem', fontWeight: 800,
                letterSpacing: '0.11em', color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}>{col}</span>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding: '24px 20px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Loading…
            </div>
          ) : players.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.25rem', marginBottom: 10 }}>👤</div>
              <p style={{
                fontWeight: 700, color: 'var(--text-secondary)',
                fontSize: '0.9rem', margin: 0,
              }}>
                No linked players
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 5 }}>
                Contact your academy admin to link your child&apos;s profile.
              </p>
            </div>
          ) : (
            players.map(p => {
              const fullName = `${p.first_name} ${p.last_name}`;
              const initials = `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`;
              const color    = avatarColor(fullName);
              const score    = p.latest_health?.overall_score;
              const statusColor = score == null ? '#6B7280'
                : score >= 70 ? '#059669'
                : score >= 40 ? '#D97706'
                : '#EF4444';
              const statusLabel = score == null ? 'Active'
                : score >= 70 ? 'Active'
                : score >= 40 ? 'Watch'
                : 'Alert';
              const statusBg = score == null ? '#F3F4F6'
                : score >= 70 ? '#ECFDF5'
                : score >= 40 ? '#FFFBEB'
                : '#FEF2F2';
              return (
                <div key={p.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '2.2fr 1.4fr 1fr 1fr',
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border-subtle)',
                  alignItems: 'center',
                }}>
                  {/* PLAYER */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: color, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: '0.75rem', fontWeight: 800,
                    }}>{initials}</div>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {fullName}
                      </p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                        {p.email}
                      </p>
                    </div>
                  </div>

                  {/* TEAM */}
                  <div>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px',
                      borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
                      background: '#EFF6FF', color: '#2563EB',
                    }}>
                      Academy
                    </span>
                  </div>

                  {/* STATUS */}
                  <div>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px',
                      borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
                      background: statusBg, color: statusColor,
                    }}>
                      {statusLabel}
                    </span>
                  </div>

                  {/* ACTIONS */}
                  <button
                    onClick={() => router.push('/dashboard/parent/health')}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '0.8rem', fontWeight: 700,
                      color: NAVY_DARK, padding: 0, textAlign: 'left',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.65'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                  >
                    Manage →
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* ── CHILD'S SCHEDULE + QUICK ACTIONS ── */}
        <div style={{ display: 'flex', gap: 16 }}>

          {/* Schedule */}
          <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '18px 20px 12px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', margin: 0 }}>
                  Child&apos;s Schedule
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Upcoming sessions &amp; matches
                </p>
              </div>
              <button
                onClick={() => router.push('/dashboard/parent/schedule')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: NAVY_DARK }}
              >
                Full schedule →
              </button>
            </div>
            <div style={{ padding: '0 20px' }}>
              {events.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '20px 0' }}>
                  No upcoming sessions scheduled.
                </p>
              ) : (
                events.map(e => (
                  <div key={e.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 0', borderBottom: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{
                      width: 4, height: 40, borderRadius: 2,
                      background: NAVY_DARK, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                        {e.title}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(e.start_time).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {' · '}{e.type}
                        {e.location ? ` · ${e.location}` : ''}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card" style={{ width: 288, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', margin: 0 }}>
                Quick Actions
              </p>
            </div>
            <div style={{ padding: '8px 16px' }}>
              {quickActions.map(a => (
                <button
                  key={a.path}
                  onClick={() => router.push(a.path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 0', border: 'none',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'none', cursor: 'pointer',
                    width: '100%', textAlign: 'left', transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  <span style={{ fontSize: '1.1rem' }}>{a.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
                      {a.label}
                    </p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                      {a.desc}
                    </p>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>›</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── HEALTH ALERTS (conditional) ── */}
        {alerts.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', margin: 0 }}>
                Recent Health Alerts
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Your athlete&apos;s recent wellness check-ins
              </p>
            </div>
            {alerts.map(a => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center',
                padding: '14px 20px',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Wellness Score: {a.overall_score}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {new Date(a.submitted_at).toLocaleDateString()}{' at '}
                    {new Date(a.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {a.notes && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                      &ldquo;{a.notes}&rdquo;
                    </p>
                  )}
                </div>
                <span style={{
                  padding: '4px 12px', borderRadius: 99,
                  fontSize: '0.72rem', fontWeight: 700,
                  background: a.overall_score >= 70 ? '#ECFDF5' : a.overall_score >= 40 ? '#FFFBEB' : '#FEF2F2',
                  color:      a.overall_score >= 70 ? '#10B981' : a.overall_score >= 40 ? '#F59E0B' : '#EF4444',
                }}>
                  {a.overall_score >= 70 ? 'Good' : a.overall_score >= 40 ? 'Moderate' : 'Low'}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
