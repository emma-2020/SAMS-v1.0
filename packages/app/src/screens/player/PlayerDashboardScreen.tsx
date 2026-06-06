'use client';

import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@sams/ui';
import { SectionCard, StatCard } from '@sams/ui';
import { HealthMeter, WellnessSlider } from '@sams/ui';
import { healthApi, scheduleApi, workoutApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import type { HealthEntry, ScheduleEvent, WorkoutPlan } from '@sams/api';
import { ROLE_COLOR } from '@sams/ui';

export function PlayerDashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const [latestHealth, setLatestHealth] = useState<HealthEntry | null>(null);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([healthApi.getMyHealth(), scheduleApi.getEvents(), workoutApi.getWorkouts()])
      .then(([h, e, w]) => {
        setLatestHealth(h[0] ?? null);
        setEvents(e.slice(0, 3));
        setWorkouts(w.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const healthScore = latestHealth?.overall_score ?? 0;

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-950" contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Banner */}
      <View style={{ backgroundColor: ROLE_COLOR.Player + '18', padding: 24, marginBottom: 16 }}>
        <Text className="text-slate-900 dark:text-white text-xl font-black mb-1">
          Player Hub
        </Text>
        <Text className="text-slate-500 text-sm">{user?.first_name} {user?.last_name}</Text>
      </View>

      <View className="px-4 md:px-6 gap-4">

        {/* Health snapshot */}
        <View className="flex-col md:flex-row gap-4">
          <SectionCard title="Today's Wellness" subtitle="latest check-in" className="flex-1">
            <View className="px-5 pb-5 flex-row items-center gap-6">
              <HealthMeter score={healthScore} size={96} />
              <View className="flex-1 gap-1">
                <WellnessSlider label="Energy"  value={latestHealth?.energy ?? 0} color={ROLE_COLOR.Player} />
                <WellnessSlider label="Sleep"   value={latestHealth?.sleep ?? 0}  color="#6366F1" />
                <WellnessSlider label="Soreness" value={latestHealth?.muscle_soreness ?? 0} color="#F97316" />
                <WellnessSlider label="Stress"  value={latestHealth?.stress ?? 0} color="#EF4444" />
              </View>
            </View>
          </SectionCard>

          <SectionCard title="Upcoming Sessions" className="flex-1">
            {events.length === 0 ? (
              <View className="px-5 pb-5">
                <Text className="text-sm text-slate-400">No upcoming sessions</Text>
              </View>
            ) : (
              events.map((e) => (
                <View key={e.id} className="flex-row items-center px-5 py-3 border-b border-slate-50">
                  <View style={{ width: 4, height: 40, borderRadius: 2, backgroundColor: ROLE_COLOR.Player, marginRight: 12 }} />
                  <View className="flex-1">
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>{e.title}</Text>
                    <Text style={{ fontSize: 11, color: '#94A3B8' }}>{new Date(e.start_time).toLocaleDateString()}</Text>
                  </View>
                </View>
              ))
            )}
          </SectionCard>
        </View>

        {/* Active workouts */}
        {workouts.length > 0 && (
          <SectionCard title="Active Training Plans">
            {workouts.map((w) => (
              <View key={w.id} className="flex-row items-center px-5 py-4 border-b border-slate-50">
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${ROLE_COLOR.Player}15`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Text style={{ fontSize: 18 }}>🏋️</Text>
                </View>
                <View className="flex-1">
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>{w.title}</Text>
                  <Text style={{ fontSize: 11, color: '#94A3B8' }}>{w.duration_minutes} min · {w.difficulty}</Text>
                </View>
                <Text style={{ fontSize: 11, color: ROLE_COLOR.Player, fontWeight: '700' }}>{w.exercises.length} exercises</Text>
              </View>
            ))}
          </SectionCard>
        )}
      </View>
    </ScrollView>
  );
}
