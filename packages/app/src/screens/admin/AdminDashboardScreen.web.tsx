'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import { ACCENT, ROLE_COLOR } from '@sams/ui';

interface DashboardStats {
  total_members: number;
  total_coaches: number;
  total_players: number;
  total_parents: number;
  pending_invitations: number;
  active_teams: number;
}

export function AdminDashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats]     = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getDashboardStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const kpis = [
    { label: 'Total Members',   value: stats?.total_members ?? '—',       icon: '👥', sub: stats ? `${stats.total_players} players` : '' },
    { label: 'Active Teams',    value: stats?.active_teams ?? '—',         icon: '🏅', sub: '' },
    { label: 'Coaches',         value: stats?.total_coaches ?? '—',        icon: '🎯', sub: '' },
    { label: 'Pending Invites', value: stats?.pending_invitations ?? '—',  icon: '✉️', sub: '' },
  ];

  const roleRows = [
    { role: 'Admin',  count: 1,                         color: ROLE_COLOR.Admin  },
    { role: 'Coach',  count: stats?.total_coaches ?? 0, color: ROLE_COLOR.Coach  },
    { role: 'Player', count: stats?.total_players ?? 0, color: ROLE_COLOR.Player },
    { role: 'Parent', count: stats?.total_parents ?? 0, color: ROLE_COLOR.Parent },
  ];

  const total = stats?.total_members || 1;

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto pb-10">

      {/* ── Hero banner ── */}
      <div className="mx-0 mb-6 md:mx-6 md:mt-6 md:rounded-3xl overflow-hidden"
        style={{ minHeight: 140, background: 'linear-gradient(135deg,#4338CA 0%,#7C3AED 50%,#EC4899 100%)' }}>
        <div className="p-6 md:p-8 flex items-center justify-between">
          <div>
            <p className="text-indigo-200 text-sm font-semibold mb-1">{greeting},</p>
            <p className="text-white text-2xl font-black" style={{ letterSpacing: -0.5 }}>
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-indigo-200 text-sm mt-1">{user?.role} · Sports Academy Management</p>
          </div>
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <span className="text-3xl">🏆</span>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 flex flex-col gap-4">

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((kpi) => (
            <div key={kpi.label}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${ACCENT}10` }}>
                  <span className="text-xl">{kpi.icon}</span>
                </div>
                {kpi.sub ? <span className="text-xs font-semibold text-slate-400">{kpi.sub}</span> : null}
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white" style={{ letterSpacing: -0.5 }}>
                {loading ? '…' : kpi.value}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* ── Analytics + Quick Actions ── */}
        <div className="flex flex-col md:flex-row gap-4">

          {/* Member distribution */}
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div className="px-5 pt-5 pb-3 border-b border-slate-50 dark:border-slate-700">
              <p className="font-bold text-slate-900 dark:text-white text-sm">Member Distribution</p>
              <p className="text-xs text-slate-400 mt-0.5">by role</p>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              {roleRows.map((r) => {
                const pct = Math.round((r.count / total) * 100);
                return (
                  <div key={r.role}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color: r.color }}>{r.role}</span>
                      <span className="text-xs text-slate-400">{r.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, backgroundColor: r.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div className="md:w-72 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div className="px-5 pt-5 pb-3 border-b border-slate-50 dark:border-slate-700">
              <p className="font-bold text-slate-900 dark:text-white text-sm">Quick Actions</p>
            </div>
            <div className="px-5 py-2 flex flex-col">
              {[
                { label: 'Send Invitation',  icon: '✉️', path: '/dashboard/admin/invite'   },
                { label: 'Create Team',      icon: '🏅', path: '/dashboard/admin/teams'    },
                { label: 'View Roster',      icon: '👥', path: '/dashboard/admin/roster'   },
                { label: 'Schedule Session', icon: '📅', path: '/dashboard/admin/schedule' },
              ].map((a) => (
                <a key={a.label} href={a.path}
                  className="flex items-center gap-3 py-3 border-b border-slate-50 dark:border-slate-700 last:border-0 no-underline hover:opacity-70 transition-opacity">
                  <span className="text-lg">{a.icon}</span>
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex-1">{a.label}</span>
                  <span className="text-slate-400 text-sm">›</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── Recent invitations ── */}
        <InvitationsPreview />
      </div>
    </div>
  );
}

function InvitationsPreview() {
  const [invitations, setInvitations] = useState<Awaited<ReturnType<typeof adminApi.getInvitations>>>([]);

  useEffect(() => {
    adminApi.getInvitations().then(setInvitations).catch(() => {});
  }, []);

  if (invitations.length === 0) return null;

  const statusColor: Record<string, string> = {
    pending:  '#FBBF24',
    accepted: '#10B981',
    expired:  '#94A3B8',
    revoked:  '#EF4444',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div className="px-5 pt-5 pb-3 border-b border-slate-50 dark:border-slate-700">
        <p className="font-bold text-slate-900 dark:text-white text-sm">Recent Invitations</p>
        <p className="text-xs text-slate-400 mt-0.5">pending member onboarding</p>
      </div>
      {invitations.slice(0, 5).map((inv) => (
        <div key={inv.id} className="flex items-center px-5 py-3 border-b border-slate-50 dark:border-slate-700 last:border-0">
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{inv.email}</p>
            <p className="text-xs text-slate-400 mt-0.5">{inv.role}</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: `${statusColor[inv.status] ?? '#94A3B8'}18`, color: statusColor[inv.status] ?? '#94A3B8' }}>
            {inv.status}
          </span>
        </div>
      ))}
    </div>
  );
}
