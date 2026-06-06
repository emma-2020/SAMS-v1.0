import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@sams/ui';
import { SectionCard, StatCard, ScoreChip } from '@sams/ui';
import { coachApi, healthApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import type { Player, HealthEntry } from '@sams/api';
import { ROLE_COLOR } from '@sams/ui';
import { AthleteGrid } from '@sams/ui';

export function CoachDashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const [players, setPlayers] = useState<Player[]>([]);
  const [alerts, setAlerts] = useState<HealthEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([coachApi.getPlayers(), healthApi.getHealthAlerts()])
      .then(([p, a]) => { setPlayers(p); setAlerts(a); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const avgHealth = players.length
    ? Math.round(players.reduce((s, p) => s + (p.latest_health?.overall_score ?? 0), 0) / players.length)
    : 0;

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-950" contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Banner */}
      <View style={{ backgroundColor: ROLE_COLOR.Coach + '18', padding: 24, marginBottom: 16 }}>
        <Text className="text-slate-900 dark:text-white text-xl font-black mb-1">
          Coach Dashboard
        </Text>
        <Text className="text-slate-500 text-sm">{user?.first_name} · {players.length} players across your teams</Text>
      </View>

      <View className="px-4 md:px-6 gap-4">

        {/* Stats row */}
        <View className="flex-row gap-3">
          <StatCard className="flex-1" title="My Players" value={loading ? '…' : players.length} accentColor={ROLE_COLOR.Coach} />
          <StatCard className="flex-1" title="Avg Health" value={loading ? '…' : `${avgHealth}%`} accentColor="#10B981" />
          <StatCard className="flex-1" title="Alerts" value={loading ? '…' : alerts.length} accentColor="#EF4444" />
        </View>

        {/* Health alerts */}
        {alerts.length > 0 && (
          <SectionCard title="Health Alerts" subtitle="players needing attention" accentColor="#EF4444">
            {alerts.slice(0, 5).map((a) => (
              <View key={a.id} className="flex-row items-center px-5 py-3 border-b border-slate-50">
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginRight: 12 }} />
                <View className="flex-1">
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>Player #{a.player_id.slice(0, 8)}</Text>
                  <Text style={{ fontSize: 11, color: '#94A3B8' }}>{new Date(a.submitted_at).toLocaleDateString()}</Text>
                </View>
                <ScoreChip score={Math.round(a.overall_score / 20)} />
              </View>
            ))}
          </SectionCard>
        )}

        {/* Player grid */}
        {players.length > 0 && (
          <SectionCard title="My Players">
            <View className="p-5">
              <AthleteGrid
                players={players.map((p) => ({
                  ...p,
                  health_score: p.latest_health?.overall_score,
                }))}
                columns={3}
              />
            </View>
          </SectionCard>
        )}
      </View>
    </ScrollView>
  );
}
