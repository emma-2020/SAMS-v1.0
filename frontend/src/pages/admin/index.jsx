// src/pages/admin/index.jsx — Admin Dashboard Home
import { useNavigate }  from 'react-router-dom';
import { useApi }       from '../../hooks/useApi';
import { adminApi }     from '../../services/admin.api';
import useAuthStore     from '../../store/authStore';
import { PageHeader, StatCard, SectionCard, EmptyState, ErrorBanner, RoleBadge } from '../../components/shared/ui';

// ─── Icons ───────────────────────────────────────────────────────
const IcoUsers    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IcoMail     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>;
const IcoCalendar = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoShield   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcoArrow    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function inviteStatus(inv) {
  if (inv.accepted_at) return 'accepted';
  if (new Date(inv.expires_at) < new Date()) return 'expired';
  return 'pending';
}

export default function AdminDashboard() {
  const user     = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const today    = new Date();

  const { data: invitations, loading: invLoading } = useApi(
    () => adminApi.listInvitations(),
    [], { fallback: [] }
  );

  const total    = invitations?.length ?? 0;
  const accepted = (invitations || []).filter(i => i.accepted_at).length;
  const pending  = (invitations || []).filter(i => !i.accepted_at && new Date(i.expires_at) > new Date()).length;
  const recent   = (invitations || []).slice(0, 5);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <PageHeader
        title={`Good ${today.getHours() < 12 ? 'morning' : today.getHours() < 18 ? 'afternoon' : 'evening'}, ${user?.first_name}!`}
        subtitle={`${today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
        action={
          <button className="btn btn-primary" onClick={() => navigate('/dashboard/admin/invite')}>
            + Invite Member
          </button>
        }
      />

      {/* KPI Cards — GymFlow style */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16, marginBottom: 28,
      }}>
        <StatCard
          label="Total Members Invited"
          value={invLoading ? '—' : total}
          icon={<IcoUsers />}
          color="#6366F1"
          subtitle="All-time invitations sent"
          onViewReport={() => navigate('/dashboard/admin/invite')}
        />
        <StatCard
          label="Accepted"
          value={invLoading ? '—' : accepted}
          icon={<IcoMail />}
          color="#059669"
          subtitle="Registrations complete"
          trend={total > 0 ? Math.round((accepted / total) * 100) : null}
        />
        <StatCard
          label="Pending"
          value={invLoading ? '—' : pending}
          icon={<IcoCalendar />}
          color="#D97706"
          subtitle="Awaiting registration"
        />
        <StatCard
          label="Academy Status"
          value="Active"
          icon={<IcoShield />}
          color="#2563EB"
          subtitle="All systems operational"
        />
      </div>

      {/* Grid: Recent Invitations + Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

        {/* Recent invitations */}
        <SectionCard
          title="Recent Invitations"
          subtitle="Latest member invitations across all roles"
          noPad
          action={
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard/admin/invite')}>
              View all →
            </button>
          }
        >
          {recent.length === 0 ? (
            <EmptyState
              icon={<IcoMail />}
              title="No invitations yet"
              subtitle="Send your first invitation to get started."
              action={
                <button className="btn btn-primary btn-sm"
                  onClick={() => navigate('/dashboard/admin/invite')}>
                  Send Invitation
                </button>
              }
            />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(inv => {
                  const st = inviteStatus(inv);
                  const stColor = st === 'accepted' ? '#059669' : st === 'expired' ? '#94A3B8' : '#D97706';
                  const stBg = st === 'accepted' ? '#ECFDF5' : st === 'expired' ? '#F8FAFC' : '#FFFBEB';
                  return (
                    <tr key={inv.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                          {inv.first_name} {inv.last_name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {inv.email}
                        </div>
                      </td>
                      <td><RoleBadge role={inv.role} /></td>
                      <td>
                        <span style={{
                          padding: '3px 10px', borderRadius: 99, fontSize: '0.75rem',
                          fontWeight: 600, background: stBg, color: stColor,
                          border: `1px solid ${stColor}30`,
                          textTransform: 'capitalize',
                        }}>
                          {st}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                        {fmtDate(inv.created_at || inv.expires_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </SectionCard>

        {/* Quick actions */}
        <SectionCard title="Quick Actions" subtitle="Common administrative tasks">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Invite New Member',    path: '/dashboard/admin/invite',   color: '#6366F1', desc: 'Add coach, player or parent' },
              { label: 'View Roster',          path: '/dashboard/admin/roster',   color: '#2563EB', desc: 'Browse all academy members'  },
              { label: 'Manage Schedule',      path: '/dashboard/admin/schedule', color: '#059669', desc: 'Calendar & resource booking'  },
              { label: 'Academy Chat',         path: '/dashboard/admin/chat',     color: '#D97706', desc: 'Team communications'          },
            ].map(({ label, path, color, desc }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = color;
                  e.currentTarget.style.background = `${color}08`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                  e.currentTarget.style.background = 'var(--bg-elevated)';
                }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: color, flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
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
