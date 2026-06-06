import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@sams/ui';
import { SectionCard } from '@sams/ui';
import { healthApi, scheduleApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import type { HealthEntry, ScheduleEvent } from '@sams/api';
import { ROLE_COLOR } from '@sams/ui';
import { HealthMeter } from '@sams/ui';

export function ParentDashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const [alerts, setAlerts] = useState<HealthEntry[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);

  useEffect(() => {
    Promise.all([healthApi.getHealthAlerts(), scheduleApi.getEvents()])
      .then(([a, e]) => { setAlerts(a); setEvents(e.slice(0, 5)); })
      .catch(() => {});
  }, []);

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-950" contentContainerStyle={{ paddingBottom: 40 }}>

      <View style={{ backgroundColor: ROLE_COLOR.Parent + '18', padding: 24, marginBottom: 16 }}>
        <Text className="text-slate-900 dark:text-white text-xl font-black mb-1">Parent Portal</Text>
        <Text className="text-slate-500 text-sm">{user?.first_name} {user?.last_name}</Text>
      </View>

      <View className="px-4 md:px-6 gap-4">

        {alerts.length > 0 && (
          <SectionCard title="Health Alerts" subtitle="your athlete's recent check-ins" accentColor="#EF4444">
            {alerts.map((a) => (
              <View key={a.id} className="flex-row items-center px-5 py-4 border-b border-slate-50 gap-4">
                <HealthMeter score={a.overall_score} size={56} />
                <View className="flex-1">
                  <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                    {new Date(a.submitted_at).toLocaleDateString()} · {new Date(a.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {a.notes && <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{a.notes}</Text>}
                </View>
              </View>
            ))}
          </SectionCard>
        )}

        <SectionCard title="Upcoming Schedule">
          {events.length === 0 ? (
            <View className="px-5 pb-5"><Text className="text-sm text-slate-400">No upcoming events</Text></View>
          ) : (
            events.map((e) => (
              <View key={e.id} className="flex-row items-center px-5 py-3 border-b border-slate-50">
                <View style={{ width: 4, height: 40, borderRadius: 2, backgroundColor: ROLE_COLOR.Parent, marginRight: 12 }} />
                <View className="flex-1">
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>{e.title}</Text>
                  <Text style={{ fontSize: 11, color: '#94A3B8' }}>{new Date(e.start_time).toLocaleDateString()}</Text>
                </View>
              </View>
            ))
          )}
        </SectionCard>
      </View>
    </ScrollView>
  );
}
