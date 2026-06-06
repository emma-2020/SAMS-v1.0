/**
 * Split-pane attendance tracker — cross-platform.
 * Left: session selector list. Right: roster with tap-toggle status.
 */
import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from '../primitives';
import type { AttendanceSession, AttendanceRecord } from '@sams/api';

type Status = 'present' | 'absent' | 'late';

const STATUS_COLOR: Record<Status, string> = {
  present: '#10B981',
  absent: '#EF4444',
  late: '#F59E0B',
};

const STATUS_LABELS: Status[] = ['present', 'late', 'absent'];

interface SplitPaneAttendanceProps {
  sessions: AttendanceSession[];
  getAttendance: (sessionId: string) => Promise<AttendanceRecord[]>;
  onMark: (sessionId: string, playerId: string, status: Status) => Promise<void>;
  isLoading?: boolean;
}

export function SplitPaneAttendance({ sessions, getAttendance, onMark, isLoading }: SplitPaneAttendanceProps) {
  const [selectedId, setSelectedId] = useState<string | null>(sessions[0]?.id ?? null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loadingSession, setLoadingSession] = useState(false);

  async function selectSession(id: string) {
    setSelectedId(id);
    setLoadingSession(true);
    try {
      const data = await getAttendance(id);
      setRecords(data);
    } finally {
      setLoadingSession(false);
    }
  }

  async function cycleStatus(record: AttendanceRecord) {
    if (!selectedId) return;
    const idx = STATUS_LABELS.indexOf(record.status as Status);
    const next = STATUS_LABELS[(idx + 1) % STATUS_LABELS.length];
    setRecords((prev) =>
      prev.map((r) => (r.player_id === record.player_id ? { ...r, status: next } : r))
    );
    await onMark(selectedId, record.player_id, next);
  }

  return (
    <View className="flex-row flex-1 gap-4">

      {/* Session list */}
      <View className="w-56 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          Sessions
        </Text>
        <ScrollView>
          {sessions.map((s) => {
            const active = s.id === selectedId;
            return (
              <Pressable
                key={s.id}
                onPress={() => selectSession(s.id)}
                style={{ paddingVertical: 12, paddingHorizontal: 16, backgroundColor: active ? '#6366F110' : 'transparent', borderLeftWidth: active ? 3 : 0, borderLeftColor: '#6366F1' }}
              >
                <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? '#6366F1' : '#475569' }}>
                  {s.title}
                </Text>
                <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                  {new Date(s.date).toLocaleDateString()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Roster */}
      <View className="flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <View className="flex-row items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">Roster</Text>
          <View className="flex-row gap-3">
            {STATUS_LABELS.map((s) => (
              <View key={s} className="flex-row items-center gap-1">
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: STATUS_COLOR[s] }} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: STATUS_COLOR[s], textTransform: 'capitalize' }}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        <ScrollView>
          {loadingSession ? (
            <View className="items-center justify-center p-8">
              <Text className="text-sm text-slate-400">Loading roster…</Text>
            </View>
          ) : records.length === 0 ? (
            <View className="items-center justify-center p-8">
              <Text className="text-sm text-slate-400">Select a session to mark attendance</Text>
            </View>
          ) : (
            records.map((r) => {
              const color = STATUS_COLOR[r.status as Status] ?? '#94A3B8';
              return (
                <Pressable
                  key={r.player_id}
                  onPress={() => cycleStatus(r)}
                  style={({ pressed }: { pressed: boolean }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F8FAFC',
                    opacity: pressed ? 0.7 : 1,
                    backgroundColor: pressed ? '#F8FAFC' : 'transparent',
                  })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>
                      {r.player.first_name} {r.player.last_name}
                    </Text>
                  </View>
                  <View style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 99, backgroundColor: `${color}15`, borderWidth: 1, borderColor: `${color}30` }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color, textTransform: 'capitalize' }}>
                      {r.status}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}
