// src/pages/parent/index.jsx — Parent Dashboard Home
import { useNavigate } from 'react-router-dom';
import { useApi }      from '../../hooks/useApi';
import { scheduleApi } from '../../services/schedule.api';
import useAuthStore    from '../../store/authStore';
import { PageHeader, StatCard, SectionCard, EmptyState, ScoreChip } from '../../components/shared/ui';

const IcoCalendar = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoHeart    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const IcoMessage  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IcoArrow    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function ParentDashboard() {
  const user     = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const today    = new Date();
  const in30     = new Date(today); in30.setDate(today.getDate() + 30);

  const { data: events } = useApi(
    () => scheduleApi.getEvents({ start: today.toISOString(), end: in30.toISOString() }),
    [], { fallback: [] }
  );

  const upcoming = (events || []).slice(0, 5);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <PageHeader
        title={`Welcome, ${user?.first_name}!`}
        subtitle="Track your child's academy schedule and wellness"
      />

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard label="Upcoming Sessions" value={events?.length ?? '—'} icon={<IcoCalendar />} color="#D97706" onViewReport={() => navigate('/dashboard/parent/schedule')} />
        <StatCard label="Wellness Status"   value="—"                     icon={<IcoHeart />}   color="#EF4444" onViewReport={() => navigate('/dashboard/parent/health')} />
        <StatCard label="Coach Messages"    value="—"                     icon={<IcoMessage />} color="#6366F1" onViewReport={() => navigate('/dashboard/parent/chat')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>

        {/* Child's schedule */}
        <SectionCard title="Child's Schedule" subtitle="Upcoming sessions & matches" noPad
          action={<button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard/parent/schedule')}>Full schedule →</button>}>
          {!upcoming.length ? (
            <EmptyState icon={<IcoCalendar />} title="No upcoming sessions" subtitle="Your child's sessions will appear here once scheduled." />
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
              { label: 'Health Alerts',    path: '/dashboard/parent/health',   color: '#EF4444', desc: 'View wellness flags'          },
              { label: 'Full Schedule',    path: '/dashboard/parent/schedule', color: '#D97706', desc: 'All upcoming sessions'         },
              { label: 'Message Coach',    path: '/dashboard/parent/chat',     color: '#6366F1', desc: 'Direct coach communication'   },
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
