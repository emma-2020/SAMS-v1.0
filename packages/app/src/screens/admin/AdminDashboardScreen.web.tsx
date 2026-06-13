'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import { ROLE_COLOR } from '@sams/ui';

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
  const [stats, setStats] = useState<DashboardStats | null>(null);
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

  const val = (v: number | undefined) => (loading ? '…' : (v ?? '—'));

  const kpis = [
    { label: 'Total Members',   value: val(stats?.total_members),        icon: '👥', delta: stats ? `${stats.total_players} players` : '' },
    { label: 'Active Teams',    value: val(stats?.active_teams),          icon: '🏅', delta: '' },
    { label: 'Coaches',         value: val(stats?.total_coaches),         icon: '🎯', delta: '' },
    { label: 'Pending Invites', value: val(stats?.pending_invitations),   icon: '✉️', delta: '' },
  ];

  const totalMembers = stats?.total_members || 1;
  const roles = [
    { role: 'Admin',  count: 1,                         color: ROLE_COLOR.Admin  },
    { role: 'Coach',  count: stats?.total_coaches ?? 0, color: ROLE_COLOR.Coach  },
    { role: 'Player', count: stats?.total_players ?? 0, color: ROLE_COLOR.Player },
    { role: 'Parent', count: stats?.total_parents ?? 0, color: ROLE_COLOR.Parent },
  ];

  const quickActions = [
    { label: 'Send Invitation',  icon: '✉️', path: '/dashboard/admin/invite'   },
    { label: 'Create Team',      icon: '🏅', path: '/dashboard/admin/teams'    },
    { label: 'View Roster',      icon: '👥', path: '/dashboard/admin/roster'   },
    { label: 'Schedule Session', icon: '📅', path: '/dashboard/admin/schedule' },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50 dark:bg-slate-950 pb-10">

      {/* ── Hero banner ── */}
      <div
        className="mx-0 mb-6 md:mx-6 md:mt-6 md:rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #4338CA 0%, #7C3AED 50%, #EC4899 100%)', minHeight: 140 }}
      >
        <div className="p-6 md:p-8 flex items-center justify-between">
          <div>
            <p className="text-indigo-200 text-sm font-semibold mb-1">{greeting},</p>
            <h1 className="text-white text-2xl font-black" style={{ letterSpacing: '-0.5px' }}>
              {user?.first_name} {user?.last_name}
            </h1>
            <p className="text-indigo-200 text-sm mt-1">
              {user?.role} · Sports Academy Management
            </p>
          </div>
          <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <span style={{ fontSize: 28 }}>🏆</span>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 space-y-4">

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(99,102,241,0.08)' }}
                >
                  <span style={{ fontSize: 20 }}>{kpi.icon}</span>
                </div>
                {kpi.delta ? (
                  <span className="text-xs font-semibold text-slate-400">{kpi.delta}</span>
                ) : null}
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white" style={{ letterSpacing: '-0.5px' }}>
                {kpi.value}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-1">
                {kpi.label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Analytics row ── */}
        <div className="flex flex-col md:flex-row gap-4">

          {/* Member Distribution */}
          <div
            className="flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <div className="px-5 pt-5 pb-3">
              <p className="text-base font-bold text-slate-900 dark:text-white">Member Distribution</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">by role</p>
            </div>
            <div className="px-5 pb-5 space-y-3">
              {roles.map((r) => {
                const pct = Math.round((r.count / totalMembers) * 100);
                return (
                  <div key={r.role}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color: r.color }}>{r.role}</span>
                      <span className="text-xs text-slate-400">{r.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: r.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div
            className="w-full md:w-72 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <div className="px-5 pt-5 pb-3">
              <p className="text-base font-bold text-slate-900 dark:text-white">Quick Actions</p>
            </div>
            <div className="px-5 pb-5 space-y-1">
              {quickActions.map((a) => (
                <Link
                  key={a.label}
                  href={a.path}
                  className="flex items-center gap-3 py-2.5 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 -mx-1 px-1 rounded-lg transition-colors group last:border-0"
                >
                  <span style={{ fontSize: 18 }}>{a.icon}</span>
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex-1 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    {a.label}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600 text-sm">›</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Invitations ── */}
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

  const statusStyle: Record<string, { bg: string; text: string; border: string }> = {
    pending:  { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
    accepted: { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
    expired:  { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' },
    revoked:  { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
  };

  if (invitations.length === 0) return null;

  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
    >
      <div className="px-5 pt-5 pb-3">
        <p className="text-base font-bold text-slate-900 dark:text-white">Recent Invitations</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">pending member onboarding</p>
      </div>
      {invitations.slice(0, 5).map((inv) => {
        const s = statusStyle[inv.status] ?? statusStyle.expired;
        return (
          <div key={inv.id} className="flex items-center px-5 py-3 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{inv.email}</p>
              <p className="text-xs text-slate-400 mt-0.5">{inv.role}</p>
            </div>
            <span
              className="text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full flex-shrink-0"
              style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}`, letterSpacing: '0.05em' }}
            >
              {inv.status}
            </span>
          </div>
        );
      })}
    </div>
  );
}
