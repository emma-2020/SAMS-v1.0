// src/pages/parent/index.jsx — Parent Dashboard Home
import { useNavigate } from 'react-router-dom';
import { useApi }       from '../../hooks/useApi';
import { scheduleApi }  from '../../services/schedule.api';
import { healthApi }    from '../../services/health.api';
import { coachApi }     from '../../services/coach.api';
import useAuthStore     from '../../store/authStore';
import { SectionCard, EmptyState } from '../../components/shared/ui';

const NAVY = '#0D1B3E';
const NAVY_MID = '#172B5E';

const AVATAR_PALETTE = ['#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#06B6D4'];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function getGreeting(firstName) {
  const hour = new Date().getHours();
  if (hour < 12) return { text: `Good morning, ${firstName}!`,   emoji: '☀️' };
  if (hour < 17) return { text: `Good afternoon, ${firstName}!`, emoji: '⛅' };
  return              { text: `Good evening, ${firstName}!`,     emoji: '🌙' };
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const IcoCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

export default function ParentDashboard() {
  const user     = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const today    = new Date();
  const in30     = new Date(today); in30.setDate(today.getDate() + 30);

  const { data: events  = [] } = useApi(
    () => scheduleApi.getEvents({ start: today.toISOString(), end: in30.toISOString() }),
    [], { fallback: [] }
  );
  const { data: alerts  = [] } = useApi(
    () => healthApi.getAlerts().catch(() => []),
    [], { fallback: [] }
  );
  const { data: players = [], loading: playersLoading } = useApi(
    () => coachApi.getPlayers().catch(() => []),
    [], { fallback: [] }
  );

  const upcoming  = events.slice(0, 5);
  const firstName = user?.first_name ?? 'there';
  const { text: greetText, emoji: greetEmoji } = getGreeting(firstName);
  const userInitials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`;

  const kpis = [
    { label: 'Upcoming Sessions', value: events.length, icon: '📅', bg: '#EFF6FF', accent: '#2563EB' },
    { label: 'Wellness Alerts',   value: alerts.length, icon: '❤️', bg: '#FEF2F2', accent: '#EF4444' },
    { label: 'Coach Messages',    value: '—',           icon: '💬', bg: '#F5F3FF', accent: '#7C3AED' },
  ];

  const quickLinks = [
    { label: 'Health Alerts',  path: '/dashboard/parent/health',   color: '#EF4444', desc: 'View wellness flags'        },
    { label: 'Full Schedule',  path: '/dashboard/parent/schedule', color: '#2563EB', desc: 'All upcoming sessions'       },
    { label: 'Message Coach',  path: '/dashboard/parent/chat',     color: '#7C3AED', desc: 'Direct coach communication' },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* ── NAVY HERO BANNER ── */}
      <div style={{
        borderRadius: 20, overflow: 'hidden', marginBottom: 24,
        background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_MID} 55%, #1E3A7F 100%)`,
        padding: '32px 36px', position: 'relative',
      }}>
        {/* decorative circles */}
        <div style={{
          position: 'absolute', right: -48, top: -48,
          width: 220, height: 220, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', right: 80, bottom: -60,
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
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', margin: '8px 0 0' }}>
              Parent Portal · Track your child's academy journey
            </p>
          </div>

          {/* Avatar / initials circle */}
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

      {/* ── KPI ROW ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 12, marginBottom: 20,
      }}>
        {kpis.map(kpi => (
          <div key={kpi.label} style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: 20,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: kpi.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem', marginBottom: 12,
            }}>
              {kpi.icon}
            </div>
            <div style={{
              fontSize: '1.75rem', fontWeight: 900,
              color: 'var(--text-primary)', letterSpacing: -0.5, marginBottom: 4,
            }}>
              {kpi.value}
            </div>
            <div style={{
              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.09em', color: 'var(--text-muted)',
            }}>
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── LINKED PLAYERS ROSTER ── */}
      <div style={{ marginBottom: 20 }}>
        <SectionCard title="Linked Players" subtitle="Your registered athlete profiles" noPad>
          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2.2fr 1.4fr 1fr 1fr',
            padding: '8px 20px',
            background: 'var(--bg-subtle)',
            borderBottom: '1px solid var(--border-default)',
          }}>
            {['PLAYER', 'TEAM', 'STATUS', 'ACTIONS'].map(col => (
              <span key={col} style={{
                fontSize: '0.63rem', fontWeight: 800,
                letterSpacing: '0.11em', color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}>{col}</span>
            ))}
          </div>

          {playersLoading ? (
            <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</div>
          ) : players.length === 0 ? (
            <EmptyState
              icon={<span style={{ fontSize: '2rem' }}>👤</span>}
              title="No linked players"
              subtitle="Contact your academy admin to link your child's profile."
            />
          ) : (
            players.map(p => {
              const fullName = `${p.first_name} ${p.last_name}`;
              const initials = `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`;
              const color    = avatarColor(fullName);
              const score    = p.latest_health?.overall_score;
              const statusColor = score == null ? '#6B7280' : score >= 70 ? '#059669' : score >= 40 ? '#D97706' : '#EF4444';
              const statusLabel = score == null ? 'Active'  : score >= 70 ? 'Active'  : score >= 40 ? 'Watch'   : 'Alert';
              const statusBg    = score == null ? '#F3F4F6' : score >= 70 ? '#ECFDF5' : score >= 40 ? '#FFFBEB' : '#FEF2F2';
              return (
                <div key={p.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '2.2fr 1.4fr 1fr 1fr',
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border-default)',
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
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {fullName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                        {p.email}
                      </div>
                    </div>
                  </div>

                  {/* TEAM */}
                  <div>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px',
                      borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
                      background: '#EFF6FF', color: '#2563EB',
                    }}>Academy</span>
                  </div>

                  {/* STATUS */}
                  <div>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px',
                      borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
                      background: statusBg, color: statusColor,
                    }}>{statusLabel}</span>
                  </div>

                  {/* ACTIONS */}
                  <button
                    onClick={() => navigate('/dashboard/parent/health')}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '0.8rem', fontWeight: 700,
                      color: NAVY, padding: 0, textAlign: 'left',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.6'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                  >
                    Manage →
                  </button>
                </div>
              );
            })
          )}
        </SectionCard>
      </div>

      {/* ── SCHEDULE + QUICK ACTIONS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, marginBottom: 20 }}>

        {/* Child's schedule */}
        <SectionCard
          title="Child's Schedule"
          subtitle="Upcoming sessions & matches"
          noPad
          action={
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard/parent/schedule')}>
              Full schedule →
            </button>
          }
        >
          {!upcoming.length ? (
            <EmptyState
              icon={<IcoCalendar />}
              title="No upcoming sessions"
              subtitle="Your child's sessions will appear here once scheduled."
            />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Session</th><th>Date</th><th>Time</th><th>Location</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map(ev => (
                  <tr key={ev.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        {ev.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ev.teams?.name}</div>
                    </td>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {fmtDate(ev.start_time)}
                    </td>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {fmtTime(ev.start_time)}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ev.location || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        {/* Quick Actions */}
        <SectionCard title="Quick Actions">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quickLinks.map(({ label, path, color, desc }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                  width: '100%', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = `${color}10`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>{desc}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ── HEALTH ALERTS (conditional) ── */}
      {alerts.length > 0 && (
        <SectionCard title="Recent Health Alerts" subtitle="Your athlete's recent wellness check-ins" noPad>
          {alerts.map(a => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center',
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-default)',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Wellness Score: {a.overall_score}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {new Date(a.submitted_at).toLocaleDateString()} at{' '}
                  {new Date(a.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                {a.notes && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                    "{a.notes}"
                  </div>
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
        </SectionCard>
      )}
    </div>
  );
}
