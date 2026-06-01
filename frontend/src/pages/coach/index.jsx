// src/pages/coach/index.jsx — Coach Dashboard Home
import { useNavigate } from 'react-router-dom';
import { useApi }      from '../../hooks/useApi';
import { scheduleApi } from '../../services/schedule.api';
import useAuthStore    from '../../store/authStore';
import { PageHeader, StatCard, SectionCard, EmptyState } from '../../components/shared/ui';

const IcoCalendar  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoUsers     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IcoHeart     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const IcoClipboard = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>;
const IcoArrow     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function CoachDashboard() {
  const user     = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const today    = new Date();
  const in14     = new Date(today); in14.setDate(today.getDate() + 14);

  const { data: events } = useApi(
    () => scheduleApi.getEvents({ start: today.toISOString(), end: in14.toISOString() }),
    [], { fallback: [] }
  );

  const upcoming = (events || []).slice(0, 5);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <PageHeader
        title={`Welcome, Coach ${user?.last_name ?? user?.first_name}!`}
        subtitle={today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      />

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard label="Upcoming Sessions"  value={events?.length ?? '—'} icon={<IcoCalendar />} color="#6366F1" onViewReport={() => navigate('/dashboard/coach/schedule')} />
        <StatCard label="Roster Players"     value="—"                     icon={<IcoUsers />}    color="#2563EB" onViewReport={() => navigate('/dashboard/coach/roster')} />
        <StatCard label="Health Flags"       value="—"                     icon={<IcoHeart />}    color="#EF4444" onViewReport={() => navigate('/dashboard/coach/health')} />
        <StatCard label="Attendance Pending" value="—"                     icon={<IcoClipboard />} color="#D97706" onViewReport={() => navigate('/dashboard/coach/attendance')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>

        {/* Upcoming sessions */}
        <SectionCard title="Upcoming Sessions" subtitle="Next 14 days" noPad
          action={<button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard/coach/schedule')}>View schedule →</button>}
        >
          {!upcoming.length ? (
            <EmptyState icon={<IcoCalendar />} title="No upcoming sessions" subtitle="You'll see sessions for your teams here once they're scheduled by the admin." />
          ) : (
            <table className="table">
              <thead><tr><th>Session</th><th>Date</th><th>Time</th><th>Location</th></tr></thead>
              <tbody>
                {upcoming.map(ev => (
                  <tr key={ev.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{ev.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ev.teams?.name}</div>
                    </td>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{fmtDate(ev.start_time)}</td>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{fmtTime(ev.start_time)}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ev.location || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        {/* Quick links */}
        <SectionCard title="Quick Actions">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Mark Attendance', path: '/dashboard/coach/attendance', color: '#D97706', desc: 'Log present/absent/injured' },
              { label: 'View Roster',     path: '/dashboard/coach/roster',     color: '#2563EB', desc: 'Browse player profiles'    },
              { label: 'Health Monitor',  path: '/dashboard/coach/health',     color: '#EF4444', desc: 'Player wellness overview'  },
              { label: 'Team Chat',       path: '/dashboard/coach/chat',       color: '#6366F1', desc: 'Message your team'         },
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
