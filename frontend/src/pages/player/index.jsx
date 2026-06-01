// src/pages/player/index.jsx — Player Dashboard Home
import { useNavigate } from 'react-router-dom';
import { useApi }      from '../../hooks/useApi';
import { scheduleApi } from '../../services/schedule.api';
import useAuthStore    from '../../store/authStore';
import { PageHeader, StatCard, SectionCard, EmptyState } from '../../components/shared/ui';

const IcoCalendar  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoHeart     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const IcoClipboard = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>;
const IcoArrow     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function daysUntil(iso) {
  const d = Math.ceil((new Date(iso) - new Date()) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d < 0)  return 'Past';
  return `In ${d}d`;
}

export default function PlayerDashboard() {
  const user     = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const today    = new Date();
  const in30     = new Date(today); in30.setDate(today.getDate() + 30);

  const { data: events } = useApi(
    () => scheduleApi.getEvents({ start: today.toISOString(), end: in30.toISOString() }),
    [], { fallback: [] }
  );

  const upcoming = (events || []).slice(0, 5);
  const todayEv  = (events || []).filter(ev => new Date(ev.start_time).toDateString() === today.toDateString());

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <PageHeader
        title={`Hey, ${user?.first_name}! 👋`}
        subtitle={today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        action={
          <button className="btn btn-primary" onClick={() => navigate('/dashboard/player/health')}>
            Log Today's Wellness
          </button>
        }
      />

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard label="Sessions This Month" value={events?.length ?? '—'} icon={<IcoCalendar />} color="#6366F1" onViewReport={() => navigate('/dashboard/player/schedule')} />
        <StatCard label="Today's Sessions"    value={todayEv.length}        icon={<IcoCalendar />} color="#2563EB" subtitle={todayEv[0]?.title || 'No sessions today'} />
        <StatCard label="Workouts Assigned"   value="—"                     icon={<IcoClipboard />} color="#D97706" onViewReport={() => navigate('/dashboard/player/workouts')} />
        <StatCard label="Wellness Log"        value="—"                     icon={<IcoHeart />}    color="#059669" onViewReport={() => navigate('/dashboard/player/health')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>

        {/* Upcoming sessions */}
        <SectionCard title="My Schedule" subtitle="Upcoming training sessions & matches" noPad
          action={<button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard/player/schedule')}>Full schedule →</button>}>
          {!upcoming.length ? (
            <EmptyState icon={<IcoCalendar />} title="No upcoming sessions" subtitle="Your coach will schedule sessions for your team." />
          ) : (
            <table className="table">
              <thead><tr><th>Session</th><th>When</th><th>Time</th><th>Location</th></tr></thead>
              <tbody>
                {upcoming.map(ev => (
                  <tr key={ev.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{ev.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ev.teams?.name}</div>
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: 99, fontSize: '0.72rem',
                        fontWeight: 600, background: 'var(--accent-subtle)', color: 'var(--accent)',
                      }}>
                        {daysUntil(ev.start_time)}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{fmtTime(ev.start_time)}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ev.location || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        {/* Quick links */}
        <SectionCard title="My Actions">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Log Wellness',   path: '/dashboard/player/health',   color: '#059669', desc: 'Daily health check-in'      },
              { label: 'My Workouts',   path: '/dashboard/player/workouts', color: '#D97706', desc: 'View assigned routines'     },
              { label: 'Full Schedule', path: '/dashboard/player/schedule', color: '#6366F1', desc: 'All upcoming sessions'      },
              { label: 'Team Chat',     path: '/dashboard/player/chat',     color: '#2563EB', desc: 'Message teammates & coach'  },
            ].map(({ label, path, color, desc }) => (
              <button key={path} onClick={() => navigate(path)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
                background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                width: '100%', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = `${color}08`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>{desc}</div>
                </div>
                <IcoArrow />
              </button>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
