import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@sams/ui';
import { scheduleApi } from '@sams/api';
import type { ScheduleEvent } from '@sams/api';
import { ROLE_COLOR } from '@sams/ui';
import { useAuthStore } from '@sams/store';

export default function ScheduleTab() {
  const role = useAuthStore((s) => s.user?.role) ?? 'Player';
  const color = ROLE_COLOR[role as keyof typeof ROLE_COLOR] ?? '#6366F1';
  const [events, setEvents] = useState<ScheduleEvent[]>([]);

  useEffect(() => { scheduleApi.getEvents().then(setEvents).catch(() => {}); }, []);

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-950" contentContainerStyle={{ padding: 20 }}>
      <Text className="text-xl font-black text-slate-900 dark:text-white mb-5">Schedule</Text>
      {events.length === 0 ? (
        <View className="items-center justify-center p-12">
          <Text className="text-slate-400 text-sm">No upcoming events</Text>
        </View>
      ) : (
        events.map((e) => (
          <View key={e.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-3 border border-slate-100 dark:border-slate-700 flex-row items-center gap-3">
            <View style={{ width: 4, height: 50, borderRadius: 2, backgroundColor: color }} />
            <View className="flex-1">
              <Text className="text-sm font-bold text-slate-900 dark:text-white">{e.title}</Text>
              <Text className="text-xs text-slate-400 mt-0.5">{new Date(e.start_time).toLocaleString()}</Text>
              {e.location && <Text className="text-xs text-slate-400">📍 {e.location}</Text>}
            </View>
            <View style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 99, backgroundColor: `${color}15` }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color, textTransform: 'capitalize' }}>{e.type}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
