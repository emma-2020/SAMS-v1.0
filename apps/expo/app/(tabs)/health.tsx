import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@sams/ui';
import { HealthMeter, WellnessSlider } from '@sams/ui';
import { healthApi } from '@sams/api';
import type { HealthEntry } from '@sams/api';
import { ROLE_COLOR } from '@sams/ui';
import { useAuthStore } from '@sams/store';

export default function HealthTab() {
  const role = useAuthStore((s) => s.user?.role) ?? 'Player';
  const color = ROLE_COLOR[role as keyof typeof ROLE_COLOR] ?? '#059669';
  const [history, setHistory] = useState<HealthEntry[]>([]);
  const latest = history[0];

  useEffect(() => { healthApi.getMyHealth().then(setHistory).catch(() => {}); }, []);

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-950" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text className="text-xl font-black text-slate-900 dark:text-white mb-5">Wellness</Text>

      {/* Health ring */}
      <View className="bg-white dark:bg-slate-800 rounded-2xl p-6 mb-4 border border-slate-100 dark:border-slate-700 items-center">
        <HealthMeter score={latest?.overall_score ?? 0} size={120} />
        <Text className="text-sm font-semibold text-slate-500 mt-4">Overall Wellness Score</Text>
      </View>

      {/* Sliders */}
      {latest && (
        <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
          <Text className="text-sm font-bold text-slate-900 dark:text-white mb-4">Last Check-in</Text>
          <WellnessSlider label="Energy"    value={latest.energy}          max={5} color={color} />
          <WellnessSlider label="Sleep"     value={latest.sleep}           max={5} color="#6366F1" />
          <WellnessSlider label="Soreness"  value={latest.muscle_soreness} max={5} color="#F97316" />
          <WellnessSlider label="Stress"    value={latest.stress}          max={5} color="#EF4444" />
          <Text className="text-xs text-slate-400 mt-3">
            {new Date(latest.submitted_at).toLocaleString()}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
