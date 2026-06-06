// src/pages/admin/index.jsx — Admin Dashboard Home
import { useNavigate } from 'react-router-dom';
import {
  Users, Mail, CalendarDays, Shield, ArrowRight,
  CheckCircle2, Clock, UserPlus, TrendingUp,
} from 'lucide-react';
import { useApi }    from '../../hooks/useApi';
import { adminApi }  from '../../services/admin.api';
import { teamsApi }  from '../../services/teams.api';
import { scheduleApi } from '../../services/schedule.api';
import useAuthStore  from '../../store/authStore';
import {
  EmptyState, ErrorBanner,
  RoleBadge, Avatar,
  RegistrationDonut, OceanBarChart, MiniCalendar,
} from '../../components/shared/ui';

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function invStatus(inv) {
  if (inv.accepted_at) return 'accepted';
  if (new Date(inv.expires_at) < new Date()) return 'expired';
  return 'pending';
}

const STATUS_STYLE = {
  accepted: { color: '#047857', bg: '#ECFDF5', border: '#A7F3D0' },
  expired:  { color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
  pending:  { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
};

// ── Premium KPI card ─────────────────────────────────────────
function KpiCard({ label, value, icon, color, gradient, subtitle, trend, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: '#FFFFFF',
        border: '1px solid #F1F5F9',
        borderRadius: 20,
        padding: '22px 22px 18px',
        boxShadow: '0 4px 24px rgba(15,23,42,0.06), 0 1px 4px rgba(15,23,42,0.03)',
        textAlign: 'left', cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.18s ease', display: 'flex', flexDirection: 'column', gap: 0,
      }}
      onMouseEnter={e => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 12px 36px rgba(15,23,42,0.10), 0 4px 8px ${color}18`;
          e.currentTarget.style.borderColor = `${color}40`;
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 4px 24px rgba(15,23,42,0.06), 0 1px 4px rgba(15,23,42,0.03)';
        e.currentTarget.style.borderColor = '#F1F5F9';
      }}
    >
      {/* Icon + label row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>
          {label}
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: gradient || `${color}14`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: gradient ? '#fff' : color,
          boxShadow: gradient ? `0 4px 12px ${color}30` : 'none',
        }}>
          {icon}
        </div>
      </div>

      {/* Value + trend */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.04em' }}>
          {value}
        </span>
        {trend != null && trend !== undefined && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 3, paddingBottom: 5,
            fontSize: '0.8rem', fontWeight: 700,
            color: trend > 0 ? '#10B981' : trend < 0 ? '#EF4444' : '#94A3B8',
          }}>
            <TrendingUp size={13} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>

      {subtitle && (
        <div style={{ fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.4 }}>{subtitle}</div>
      )}
    </button>
  );
}

export default function AdminDashboard() {
  const user     = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const today    = new Date();
  const hr       = today.getHours();
  const greeting = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';

  const { data: invitations, loading: invLoading, error: invError } = useApi(() => adminApi.listInvitations(), [], { fallback: [] });
  const { data: roster,      loading: rosterLoading } = useApi(() => adminApi.getRoster(), [], { fallback: [] });
  const { data: teams }       = useApi(() => teamsApi.listTeams(), [], { fallback: [] });

  const in30 = new Date(); in30.setDate(today.getDate() + 30);
  const { data: events } = useApi(() => scheduleApi.getEvents({ start: today.toISOString(), end: in30.toISOString() }), [], { fallback: [] });

  const total       = (invitations || []).length;
  const accepted    = (invitations || []).filter(i => i.accepted_at).length;
  const pending     = (invitations || []).filter(i => !i.accepted_at && new Date(i.expires_at) > new Date()).length;
  const expired     = total - accepted - pending;
  const recent      = (invitations || []).slice(0, 6);

  const memberCount = (roster || []).length;
  const coachCount  = (roster || []).filter(m => m.role === 'Coach').length;
  const playerCount = (roster || []).filter(m => m.role === 'Player').length;
  const parentCount = (roster || []).filter(m => m.role === 'Parent').length;
  const teamCount   = (teams || []).length;
  const eventCount  = (events || []).length;

  const rosterBreakdown = [
    { label: 'Coaches',  v: coachCount  },
    { label: 'Players',  v: playerCount },
    { label: 'Parents',  v: parentCount },
  ].filter(r => r.v > 0);

  const quickActions = [
    { label: 'Invite Member',   path: '/dashboard/admin/invite',   icon: UserPlus,    color: '#EC4899', gradient: 'linear-gradient(135deg,#EC4899,#8B5CF6)', desc: 'Add coach, player or parent' },
    { label: 'View Roster',     path: '/dashboard/admin/roster',   icon: Users,       color: '#2563EB', desc: 'Browse all academy members'  },
    { label: 'Manage Teams',    path: '/dashboard/admin/teams',    icon: Shield,      color: '#7C3AED', desc: 'Team assignments & rosters'  },
    { label: 'Academy Schedule',path: '/dashboard/admin/schedule', icon: CalendarDays,color: '#059669', desc: 'Calendar & event planner'  },
    { label: 'Academy Chat',    path: '/dashboard/admin/chat',     icon: Mail,        color: '#D97706', desc: 'Team communications'        },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* ── Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 45%, #EC4899 100%)',
        borderRadius: 22, padding: '28px 32px 26px',
        marginBottom: 28, position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', right: -40, top: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'absolute', left: '35%', bottom: -80, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', right: 120, top: 10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>
              {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <h1 style={{ fontWeight: 900, fontSize: '1.65rem', color: '#fff', margin: '0 0 8px', letterSpacing: '-0.025em' }}>
              {greeting}, {user?.first_name}!
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              {[
                { label: `${rosterLoading ? '—' : memberCount} members`, icon: '👥' },
                { label: `${teamCount} team${teamCount !== 1 ? 's' : ''}`, icon: '🏆' },
                { label: `${eventCount} upcoming`, icon: '📅' },
              ].map(({ label, icon }) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.83rem', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                  <span style={{ fontSize: '0.9rem' }}>{icon}</span> {label}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin/invite')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
              padding: '12px 22px', borderRadius: 12,
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)',
              color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
              backdropFilter: 'blur(10px)', transition: 'all 0.15s',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.26)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.transform = 'none'; }}
          >
            <UserPlus size={16} /> Invite Member
          </button>
        </div>
      </div>

      {/* ── KPI Row — premium rounded-2xl white cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }} className="stagger">
        <KpiCard
          label="Total Members"
          value={rosterLoading ? '—' : memberCount}
          icon={<Users size={18} />}
          color="#6366F1"
          gradient="linear-gradient(135deg,#6366F1,#818CF8)"
          subtitle={`${coachCount} coaches · ${playerCount} players · ${parentCount} parents`}
          onClick={() => navigate('/dashboard/admin/roster')}
        />
        <KpiCard
          label="Active Teams"
          value={teamCount}
          icon={<Shield size={18} />}
          color="#7C3AED"
          gradient="linear-gradient(135deg,#7C3AED,#A78BFA)"
          subtitle="Registered team groups"
          onClick={() => navigate('/dashboard/admin/teams')}
        />
        <KpiCard
          label="Invites Accepted"
          value={invLoading ? '—' : accepted}
          icon={<CheckCircle2 size={18} />}
          color="#10B981"
          gradient="linear-gradient(135deg,#059669,#34D399)"
          trend={total > 0 ? Math.round((accepted / total) * 100) : null}
          subtitle="Registration rate"
        />
        <KpiCard
          label="Pending Invites"
          value={invLoading ? '—' : pending}
          icon={<Clock size={18} />}
          color="#F59E0B"
          gradient="linear-gradient(135deg,#D97706,#FBBF24)"
          subtitle="Awaiting registration"
          onClick={() => navigate('/dashboard/admin/invite')}
        />
      </div>

      {/* ── Analytics + Calendar row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18, marginBottom: 20 }}>

        {/* Analytics card: donut + ocean bar */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: 20,
          boxShadow: '0 4px 24px rgba(15,23,42,0.06), 0 1px 4px rgba(15,23,42,0.03)',
          padding: '22px 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', letterSpacing: '-0.01em' }}>Registration Analytics</div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: 2 }}>Invitation acceptance & member breakdown</div>
            </div>
            <button
              onClick={() => navigate('/dashboard/admin/invite')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#7C3AED', padding: '4px 8px', borderRadius: 7, transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              Manage <ArrowRight size={13} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'center' }}>
            {/* Donut gauge */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#CBD5E1', marginBottom: 8 }}>Acceptance Rate</div>
              <RegistrationDonut
                accepted={accepted}
                pending={pending}
                expired={expired}
                size={130}
              />
            </div>

            {/* Ocean bar chart — member role distribution */}
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#CBD5E1', marginBottom: 10 }}>Member Distribution</div>
              {rosterBreakdown.length > 0 ? (
                <OceanBarChart data={rosterBreakdown} height={130} />
              ) : (
                <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', fontSize: '0.8rem' }}>
                  No roster data yet
                </div>
              )}
              {/* Quick count chips */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {[
                  { label: 'Coaches', v: coachCount, color: '#0EA5E9' },
                  { label: 'Players', v: playerCount, color: '#06B6D4' },
                  { label: 'Parents', v: parentCount, color: '#3B82F6' },
                ].map(({ label, v, color }) => (
                  <span
                    key={label}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: `${color}0F`, border: `1px solid ${color}22`, cursor: 'pointer' }}
                    onClick={() => navigate('/dashboard/admin/roster')}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>{label}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color }}>{v}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Calendar card */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: 20,
          boxShadow: '0 4px 24px rgba(15,23,42,0.06), 0 1px 4px rgba(15,23,42,0.03)',
          padding: '22px 20px',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', letterSpacing: '-0.01em' }}>Academy Calendar</div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 2 }}>Upcoming sessions & events</div>
          </div>
          <MiniCalendar events={events || []} />
          {eventCount > 0 && (
            <button
              onClick={() => navigate('/dashboard/admin/schedule')}
              style={{
                marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                width: '100%', padding: '9px', borderRadius: 10,
                background: 'linear-gradient(135deg,#EC4899,#8B5CF6)',
                border: 'none', cursor: 'pointer', color: '#fff',
                fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.01em',
                boxShadow: '0 4px 12px rgba(168,85,247,0.25)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(168,85,247,0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(168,85,247,0.25)'; }}
            >
              <CalendarDays size={14} /> View Full Schedule
            </button>
          )}
        </div>
      </div>

      {/* ── Main grid: invitations + quick actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18 }}>

        {/* Recent invitations */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: 20,
          boxShadow: '0 4px 24px rgba(15,23,42,0.06), 0 1px 4px rgba(15,23,42,0.03)',
          overflow: 'hidden',
        }}>
          {/* Gradient accent bar */}
          <div style={{ height: 3, background: 'linear-gradient(90deg,#6366F1,#EC4899,#8B5CF6)', width: '100%' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 14px' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>Recent Invitations</div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 2 }}>Latest member invitations across all roles</div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/dashboard/admin/invite')}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              View all <ArrowRight size={13} />
            </button>
          </div>

          {invError ? (
            <div style={{ padding: '0 22px 20px' }}>
              <ErrorBanner message={invError} />
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={<Mail size={22} />}
              title="No invitations yet"
              subtitle="Send your first invitation to get started."
              action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard/admin/invite')}>Send Invitation</button>}
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
                  const st  = invStatus(inv);
                  const sty = STATUS_STYLE[st];
                  return (
                    <tr key={inv.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={`${inv.first_name} ${inv.last_name}`} role={inv.role} size={30} />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{inv.first_name} {inv.last_name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{inv.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><RoleBadge role={inv.role} /></td>
                      <td>
                        <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, background: sty.bg, color: sty.color, border: `1px solid ${sty.border}`, textTransform: 'capitalize' }}>
                          {st}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                        {fmtDate(inv.created_at || inv.expires_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick actions */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: 20,
          boxShadow: '0 4px 24px rgba(15,23,42,0.06), 0 1px 4px rgba(15,23,42,0.03)',
          padding: '22px 18px',
        }}>
          <div style={{ height: 3, background: 'linear-gradient(90deg,#7C3AED,#A78BFA)', borderRadius: '3px 3px 0 0', margin: '-22px -18px 18px', position: 'relative', top: 0 }} />
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', marginBottom: 4 }}>Quick Actions</div>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: 16 }}>Common admin tasks</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {quickActions.map(({ label, path, icon: Icon, color, gradient, desc }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px',
                  background: '#FAFAFA', border: '1px solid #F1F5F9',
                  borderRadius: 12, cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `${color}35`;
                  e.currentTarget.style.background = `${color}06`;
                  e.currentTarget.style.transform = 'translateX(2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#F1F5F9';
                  e.currentTarget.style.background = '#FAFAFA';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: gradient || `${color}14`,
                  border: gradient ? 'none' : `1px solid ${color}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: gradient ? '#fff' : color,
                  boxShadow: gradient ? `0 3px 8px ${color}30` : 'none',
                }}>
                  <Icon size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.855rem', color: '#0F172A' }}>{label}</div>
                  <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 1 }}>{desc}</div>
                </div>
                <ArrowRight size={13} style={{ color: '#CBD5E1', flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
