import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from '@sams/ui';
import { AthleteGrid } from '@sams/ui';
import { coachApi } from '@sams/api';
import type { Player } from '@sams/api';

export default function PlayersTab() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    coachApi.getPlayers().then(setPlayers).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-950" contentContainerStyle={{ padding: 20 }}>
      <Text className="text-xl font-black text-slate-900 dark:text-white mb-5">Players</Text>
      {loading ? (
        <Text className="text-slate-400 text-sm">Loading…</Text>
      ) : (
        <AthleteGrid
          players={players.map((p) => ({ ...p, health_score: p.latest_health?.overall_score }))}
          columns={2}
        />
      )}
    </ScrollView>
  );
}
