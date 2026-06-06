// src/pages/coach/index.jsx — Coach Dashboard Premium v2
import { useNavigate } from 'react-router-dom';
import { Users, CalendarDays, Activity, ClipboardList, Dumbbell, MessageSquare, ArrowRight, AlertTriangle } from 'lucide-react';
import { useApi }      from '../../hooks/useApi';
import { scheduleApi } from '../../services/schedule.api';
import { coachApi }    from '../../services/coach.api';
import { healthApi }   from '../../services/health.api';
import useAuthStore    from '../../store/authStore';
import { PageHeader, StatCard, EmptyState, Avatar } from '../../components/shared/ui';

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const TYPE_COLOR = {
  Training: '#2563EB', Match: '#DC2626', Friendly: '#059669',
  Recovery: '#D97706', Meeting: '#7C3AED',
};

// ─── Gradient Progress Ring ───────────────────────────────────────
function GradientHealthRing({ value, max = 100, size = 120 }) {
  const pct  = Math.min(100, Math.max(0, (value / max) * 100));
  const r    = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ - (pct / 100) * circ;

  const color = pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444';
  const gradId = `hring-${size}`;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={color} stopOpacity={1} />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}18`} strokeWidth={10} />
        {/* Progress arc */}
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={`url(#${gradId})`} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={dash}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      {/* Centre label */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '1.65rem', fontWeight: 900, color, lineHeight: 1, letterSpacing: '-0.04em' }}>
          {value}%
        </span>
        <span style={{ fontSize: '0.67rem', fontWeight: 700, color: `${color}99`, letterSpacing: '0.04em', marginTop: 2 }}>
          healthy
        </span>
      </div>
    </div>
  );
}

export default function CoachDashboard() {
  const user     = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const today    = new Date();
  const in14     = new Date(); in14.setDate(today.getDate() + 14);

  const { data: events }      = useApi(() => scheduleApi.getEvents({ start: today.toISOString(), end: in14.toISOString() }), [], { fallback: [] });
  const { data: playersData } = useApi(() => coachApi.getPlayers(), [], { fallback: { players: [] } });
  const { data: alerts }      = useApi(() => healthApi.getAlerts(), [], { fallback: [] });

  const players       = playersData?.players ?? [];
  const flaggedCount  = (alerts || []).length;
  const upcomingCount = (events || []).length;

  const typeBreakdown = (events || []).reduce((acc, ev) => {
    const type = ev.type || 'Other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  const typeChartData = Object.entries(typeBreakdown).map(([label, v]) => ({ label, v }));

  const healthGood  = players.filter(p => p.latest_health && !p.latest_health.is_flagged).length;
  const healthTotal = players.length;
  const healthPct   = healthTotal > 0 ? Math.round((healthGood / healthTotal) * 100) : 0;
  const noDataCount = players.filter(p => !p.latest_health).length;

  const actions = [
    { label: 'Player Management', path: '/dashboard/coach/players',    icon: Users,         color: '#2563EB', desc: 'View profiles & stats'      },
    { label: 'Training Plans',    path: '/dashboard/coach/workouts',   icon: Dumbbell,      color: '#7C3AED', desc: 'Create & assign workouts'   },
    { label: 'Mark Attendance',   path: '/dashboard/coach/attendance', icon: ClipboardList, color: '#D97706', desc: 'Log present/absent/injured' },
    { label: 'Health Monitor',    path: '/dashboard/coach/health',     icon: Activity,      color: '#EF4444', desc: 'Player wellness overview'   },
    { label: 'Team Chat',         path: '/dashboard/coach/chat',       icon: MessageSquare, color: '#6366F1', desc: 'Message your team'          },
  ];

  const upcoming5 = (events || []).slice(0, 5);
  const flagged5  = (alerts || []).slice(0, 4);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <PageHeader
        title={`Welcome back, ${user?.first_name ?? 'Coach'}!`}
        subtitle={today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      />

      {/* KPI row */}
      <div className="data-grid data-grid-4 stagger" style={{ marginBottom: 24 }}>
        <StatCard
          label="Upcoming Sessions"
          value={upcomingCount || '0'}
          icon={<CalendarDays size={18} />}
          color="#6366F1"
          accentClass="accent-indigo"
          onViewReport={() => navigate('/dashboard/coach/schedule')}
          sparkData={typeChartData.map(d => ({ v: d.v }))}
        />
        <StatCard
          label="Roster Players"
          value={players.length || '0'}
          icon={<Users size={18} />}
          color="#2563EB"
          accentClass="accent-blue"
          onViewReport={() => navigate('/dashboard/coach/players')}
        />
        <StatCard
          label="Health Flags"
          value={flaggedCount || '0'}
          icon={<AlertTriangle size={18} />}
          color={flaggedCount > 0 ? '#EF4444' : '#10B981'}
          accentClass={flaggedCount > 0 ? 'accent-red' : 'accent-green'}
          onViewReport={() => navigate('/dashboard/coach/health')}
        />
        <StatCard
          label="Wellness Score"
          value={`${healthPct}%`}
          icon={<Activity size={18} />}
          color="#10B981"
          accentClass="accent-green"
          subtitle={`${healthGood} of ${healthTotal} players checked in`}
          onViewReport={() => navigate('/dashboard/coach/health')}
        />
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Upcoming sessions */}
          <div style={{
            background: 'var(--bg-surface)',
            borderRadius: 20,
            border: '1px solid var(--border-default)',
            boxShadow: '0 2px 12px rgba(15,23,42,0.05)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 20px',
              background: 'linear-gradient(90deg, rgba(99,102,241,0.06), transparent)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Upcoming Sessions</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Next 14 days · {upcomingCount} session{upcomingCount !== 1 ? 's' : ''}
                </div>
              </div>
              <button
                onClick={() => navigate('/dashboard/coach/schedule')}
                className="btn btn-ghost btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                View all <ArrowRight size={13} />
              </button>
            </div>
            {!upcoming5.length ? (
              <EmptyState icon={<CalendarDays size={22} />} title="No sessions scheduled" subtitle="Create a session from the Schedule page to see it here." />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Session</th><th>Date</th><th>Time</th><th>Type</th><th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming5.map(ev => {
                    const tc = TYPE_COLOR[ev.type] ?? '#6366F1';
                    return (
                      <tr key={ev.id} onClick={() => navigate('/dashboard/coach/attendance?event=' + ev.id)} style={{ cursor: 'pointer' }}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{ev.title}</div>
                          {ev.teams?.name && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{ev.teams.name}</div>}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{fmtDate(ev.start_time)}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{fmtTime(ev.start_time)}</td>
                        <td>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${tc}14`, color: tc, border: `1px solid ${tc}28` }}>
                            {ev.type}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ev.location || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Health alerts */}
          {flagged5.length > 0 && (
            <div style={{
              background: 'var(--bg-surface)',
              borderRadius: 20,
              border: '1px solid var(--border-default)',
              boxShadow: '0 2px 12px rgba(15,23,42,0.05)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '16px 20px',
                background: 'linear-gradient(90deg, rgba(239,68,68,0.06), transparent)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Health Alerts</div>
                  <div style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: 2 }}>
                    {flaggedCount} player{flaggedCount !== 1 ? 's' : ''} flagged for attention
                  </div>
                </div>
                <button
                  onClick={() => navigate('/dashboard/coach/health')}
                  className="btn btn-ghost btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#EF4444' }}
                >
                  View all <ArrowRight size={13} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {flagged5.map((log, i) => (
                  <div key={log.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 20px',
                    borderBottom: i < flagged5.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    background: 'linear-gradient(90deg, rgba(239,68,68,0.04) 0%, transparent 60%)',
                    borderLeft: '3px solid #EF4444',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(90deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.02) 60%)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(90deg, rgba(239,68,68,0.04) 0%, transparent 60%)'; }}
                  >
                    <Avatar name={`${log.users?.first_name} ${log.users?.last_name}`} role="Player" size={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        {log.users?.first_name} {log.users?.last_name}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        <MetricBadge label="Fatigue"  value={log.fatigue}  danger={log.fatigue >= 4} />
                        <MetricBadge label="Soreness" value={log.soreness} danger={log.soreness >= 4} />
                        {log.sleep_quality != null && (
                          <MetricBadge label="Sleep" value={log.sleep_quality} danger={log.sleep_quality <= 2} good />
                        )}
                      </div>
                    </div>
                    <div style={{
                      width: 28, height: 28, borderRadius: 99,
                      background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <AlertTriangle size={13} style={{ color: '#EF4444' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Team health ring */}
          <div style={{
            background: 'var(--bg-surface)',
            borderRadius: 20,
            border: '1px solid var(--border-default)',
            boxShadow: '0 2px 12px rgba(15,23,42,0.05)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 20px',
              background: 'linear-gradient(90deg, rgba(16,185,129,0.06), transparent)',
              borderBottom: '1px solid var(--border-subtle)',
              fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)',
            }}>
              Team Health
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
              <GradientHealthRing value={healthPct} max={100} size={130} />

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Checked in healthy',  count: healthGood,                color: '#10B981', fill: '#ECFDF5' },
                  { label: 'Flagged / needs rest', count: flaggedCount,              color: '#EF4444', fill: '#FEF2F2' },
                  { label: 'No data yet',          count: noDataCount,               color: '#94A3B8', fill: '#F8FAFC' },
                ].map(r => (
                  <div key={r.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', borderRadius: 10,
                    background: r.count > 0 ? r.fill : 'transparent',
                    border: r.count > 0 ? `1px solid ${r.color}20` : '1px solid transparent',
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 9, height: 9, borderRadius: '50%', background: r.color, flexShrink: 0, boxShadow: `0 0 0 2px ${r.color}25` }} />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{r.label}</span>
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: r.count > 0 ? r.color : 'var(--text-muted)' }}>{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{
            background: 'var(--bg-surface)',
            borderRadius: 20,
            border: '1px solid var(--border-default)',
            boxShadow: '0 2px 12px rgba(15,23,42,0.05)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)',
            }}>
              Quick Actions
            </div>
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {actions.map(({ label, path, icon: Icon, color, desc }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                    borderRadius: 12, cursor: 'pointer', textAlign: 'left', width: '100%',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = color;
                    e.currentTarget.style.background = `${color}07`;
                    e.currentTarget.style.transform = 'translateX(3px)';
                    e.currentTarget.style.boxShadow = `0 2px 12px ${color}18`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                    e.currentTarget.style.background = 'var(--bg-elevated)';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `${color}12`, border: `1px solid ${color}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color,
                  }}>
                    <Icon size={17} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{desc}</div>
                  </div>
                  <ArrowRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Metric Badge ─────────────────────────────────────────────────
function MetricBadge({ label, value, danger, good }) {
  const color  = danger ? '#EF4444' : good && !danger ? '#10B981' : '#6366F1';
  const bg     = danger ? '#FEF2F2' : good && !danger ? '#ECFDF5' : '#EEF2FF';
  const border = danger ? '#FECACA' : good && !danger ? '#A7F3D0' : '#C7D2FE';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99,
      background: bg, color, border: `1px solid ${border}`,
    }}>
      {label} <span style={{ fontFamily: 'var(--font-mono)' }}>{value}/5</span>
    </span>
  );
}
