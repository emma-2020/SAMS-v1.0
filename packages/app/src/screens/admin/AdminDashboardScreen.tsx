'use client';

/**
 * Admin dashboard screen — cross-platform.
 * Spacious layout on md+ (web desktop), stacked layout on mobile.
 */
import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@sams/ui';
import { KpiCard, SectionCard, StatCard, StatusPill } from '@sams/ui';
import { MiniAreaChart } from '@sams/ui';
import { adminApi, notificationsApi } from '@sams/api';
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

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-950" contentContainerStyle={{ paddingBottom: 40 }}>

      {/* ── Hero banner ── */}
      <View
        className="mx-0 mb-6 rounded-none md:rounded-3xl overflow-hidden"
        style={{ minHeight: 140, background: 'linear-gradient(135deg, #4338CA 0%, #7C3AED 50%, #EC4899 100%)' } as object}
      >
        <View className="p-6 md:p-8 flex-row items-center justify-between">
          <View>
            <Text className="text-indigo-200 text-sm font-semibold mb-1">{greeting},</Text>
            <Text className="text-white text-2xl font-black" style={{ letterSpacing: -0.5 }}>
              {user?.first_name} {user?.last_name}
            </Text>
            <Text className="text-indigo-200 text-sm mt-1">
              {user?.role} · Sports Academy Management
            </Text>
          </View>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 28 }}>🏆</Text>
          </View>
        </View>
      </View>

      <View className="px-4 md:px-6 gap-4">

        {/* ── KPI Row ── */}
        <View className="flex-col md:flex-row gap-3">
          {[
            { label: 'Total Members', value: stats?.total_members ?? '—', icon: '👥', delta: stats ? `${stats.total_players} players` : '' },
            { label: 'Active Teams',  value: stats?.active_teams ?? '—',  icon: '🏅', delta: '' },
            { label: 'Coaches',       value: stats?.total_coaches ?? '—', icon: '🎯', delta: '' },
            { label: 'Pending Invites', value: stats?.pending_invitations ?? '—', icon: '✉️', delta: '' },
          ].map((kpi) => (
            <View key={kpi.label} className="flex-1">
              <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700"
                style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
                <View className="flex-row items-center justify-between mb-3">
                  <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: `${ACCENT}10` }}>
                    <Text style={{ fontSize: 20 }}>{kpi.icon}</Text>
                  </View>
                  {kpi.delta ? <Text className="text-xs font-semibold text-slate-400">{kpi.delta}</Text> : null}
                </View>
                <Text className="text-2xl font-black text-slate-900 dark:text-white" style={{ letterSpacing: -0.5 }}>
                  {loading ? '…' : kpi.value}
                </Text>
                <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-1">{kpi.label}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Analytics row ── */}
        <View className="flex-col md:flex-row gap-4">
          <SectionCard className="flex-1" title="Member Distribution" subtitle="by role">
            <View className="px-5 pb-5 gap-3">
              {[
                { role: 'Admin',  count: 1,                          color: ROLE_COLOR.Admin  },
                { role: 'Coach',  count: stats?.total_coaches ?? 0,  color: ROLE_COLOR.Coach  },
                { role: 'Player', count: stats?.total_players ?? 0,  color: ROLE_COLOR.Player },
                { role: 'Parent', count: stats?.total_parents ?? 0,  color: ROLE_COLOR.Parent },
              ].map((r) => {
                const total = stats?.total_members || 1;
                const pct = Math.round((r.count / total) * 100);
                return (
                  <View key={r.role}>
                    <View className="flex-row items-center justify-between mb-1">
                      <Text style={{ fontSize: 12, fontWeight: '600', color: r.color }}>{r.role}</Text>
                      <Text className="text-xs text-slate-400">{r.count} ({pct}%)</Text>
                    </View>
                    <View className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <View style={{ width: `${pct}%`, height: '100%', borderRadius: 99, backgroundColor: r.color }} />
                    </View>
                  </View>
                );
              })}
            </View>
          </SectionCard>

          <SectionCard className="w-full md:w-72" title="Quick Actions">
            <View className="px-5 pb-5 gap-2">
              {[
                { label: 'Send Invitation',   icon: '✉️', path: '/dashboard/admin/invite' },
                { label: 'Create Team',       icon: '🏅', path: '/dashboard/admin/teams'  },
                { label: 'View Roster',       icon: '👥', path: '/dashboard/admin/roster' },
                { label: 'Schedule Session',  icon: '📅', path: '/dashboard/admin/schedule' },
              ].map((a) => (
                <View key={a.label} className="flex-row items-center gap-3 py-2 border-b border-slate-50">
                  <Text style={{ fontSize: 18 }}>{a.icon}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', flex: 1 }}>{a.label}</Text>
                  <Text style={{ fontSize: 12, color: '#94A3B8' }}>›</Text>
                </View>
              ))}
            </View>
          </SectionCard>
        </View>

        {/* ── Invitations ── */}
        <InvitationsPreview />
      </View>
    </ScrollView>
  );
}

function InvitationsPreview() {
  const [invitations, setInvitations] = useState<Awaited<ReturnType<typeof adminApi.getInvitations>>>([]);

  useEffect(() => {
    adminApi.getInvitations().then(setInvitations).catch(() => {});
  }, []);

  const statusColor: Record<string, string> = {
    pending:  '#FBBF24',
    accepted: '#10B981',
    expired:  '#94A3B8',
    revoked:  '#EF4444',
  };

  if (invitations.length === 0) return null;

  return (
    <SectionCard title="Recent Invitations" subtitle="pending member onboarding">
      {invitations.slice(0, 5).map((inv) => (
        <View key={inv.id} className="flex-row items-center px-5 py-3 border-b border-slate-50">
          <View className="flex-1">
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{inv.email}</Text>
            <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{inv.role}</Text>
          </View>
          <StatusPill label={inv.status} color={statusColor[inv.status] ?? '#94A3B8'} size="sm" />
        </View>
      ))}
    </SectionCard>
  );
}
