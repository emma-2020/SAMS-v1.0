'use client';

import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from '@sams/ui';
import { SectionCard } from '@sams/ui';
import { healthApi, scheduleApi, coachApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import { NAVY_DARK, DANGER, SUCCESS } from '@sams/ui';
import { HealthMeter } from '@sams/ui';
import type { HealthEntry, ScheduleEvent, Player } from '@sams/api';

const AVATAR_PALETTE = ['#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#06B6D4'];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function getGreeting(firstName: string): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: `Good morning, ${firstName}!`,   emoji: '☀️' };
  if (hour < 17) return { text: `Good afternoon, ${firstName}!`, emoji: '⛅' };
  return              { text: `Good evening, ${firstName}!`,     emoji: '🌙' };
}

export function ParentDashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const [alerts,  setAlerts]  = useState<HealthEntry[]>([]);
  const [events,  setEvents]  = useState<ScheduleEvent[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      healthApi.getHealthAlerts().catch((): HealthEntry[]   => []),
      scheduleApi.getEvents()    .catch((): ScheduleEvent[] => []),
      coachApi.getPlayers()      .catch((): Player[]        => []),
    ]).then(([a, e, p]) => {
      setAlerts(a);
      setEvents(e.slice(0, 5));
      setPlayers(p);
    }).finally(() => setLoading(false));
  }, []);

  const firstName = user?.first_name ?? 'there';
  const { text: greetText, emoji: greetEmoji } = getGreeting(firstName);
  const userInitials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`;

  return (
    <ScrollView
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* ── NAVY HERO BANNER ── */}
      <View style={{
        backgroundColor: NAVY_DARK,
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 28,
        marginBottom: 0,
      }}>
        {/* PARENT tag */}
        <View style={{
          alignSelf: 'flex-start',
          backgroundColor: 'rgba(255,255,255,0.12)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)',
          borderRadius: 6,
          paddingHorizontal: 10,
          paddingVertical: 3,
          marginBottom: 14,
        }}>
          <Text style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 2,
          }}>PARENT</Text>
        </View>

        {/* Greeting row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{
              color: '#FFFFFF',
              fontSize: 22,
              fontWeight: '900',
              letterSpacing: -0.5,
              lineHeight: 28,
            }}>
              {greetText} {greetEmoji}
            </Text>
            <Text style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 13,
              marginTop: 6,
            }}>
              Parent Portal · Track your child&apos;s academy journey
            </Text>
          </View>

          {/* Avatar */}
          <View style={{
            width: 48, height: 48, borderRadius: 24,
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>
              {userInitials || '👤'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── KPI ROW ── */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }}>
        {[
          { label: 'Sessions',  value: loading ? '…' : String(events.length), bg: '#EFF6FF', color: '#2563EB', icon: '📅' },
          { label: 'Alerts',    value: loading ? '…' : String(alerts.length), bg: '#FEF2F2', color: '#EF4444', icon: '❤️' },
          { label: 'Messages',  value: '—',                                   bg: '#F5F3FF', color: '#7C3AED', icon: '💬' },
        ].map(kpi => (
          <View key={kpi.label} style={{
            flex: 1,
            backgroundColor: '#fff',
            borderRadius: 14,
            padding: 14,
            shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}>
            <View style={{
              width: 34, height: 34, borderRadius: 10,
              backgroundColor: kpi.bg,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 10,
            }}>
              <Text style={{ fontSize: 16 }}>{kpi.icon}</Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 }}>
              {kpi.value}
            </Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', marginTop: 3, letterSpacing: 0.5 }}>
              {kpi.label.toUpperCase()}
            </Text>
          </View>
        ))}
      </View>

      <View className="px-4 gap-4" style={{ paddingTop: 12 }}>

        {/* ── LINKED PLAYERS ── */}
        <SectionCard title="Linked Players" subtitle="Your registered athlete profiles">
          {loading ? (
            <View className="px-5 pb-5">
              <Text className="text-sm text-slate-400">Loading…</Text>
            </View>
          ) : players.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>👤</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569', textAlign: 'center' }}>
                No linked players
              </Text>
              <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 4, textAlign: 'center' }}>
                Contact your academy admin to link your child.
              </Text>
            </View>
          ) : (
            players.map((p) => {
              const fullName = `${p.first_name} ${p.last_name}`;
              const initials = `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`;
              const color    = avatarColor(fullName);
              const score    = p.latest_health?.overall_score;
              const statusColor = score == null ? '#6B7280' : score >= 70 ? '#059669' : score >= 40 ? '#D97706' : '#EF4444';
              const statusLabel = score == null ? 'Active'  : score >= 70 ? 'Active'  : score >= 40 ? 'Watch'   : 'Alert';
              const statusBg    = score == null ? '#F3F4F6' : score >= 70 ? '#ECFDF5' : score >= 40 ? '#FFFBEB' : '#FEF2F2';
              return (
                <View key={p.id} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F1F5F9',
                  gap: 12,
                }}>
                  {/* Avatar */}
                  <View style={{
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: color,
                    alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>{initials}</Text>
                  </View>

                  {/* Name */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>{fullName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: '#EFF6FF' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>Academy</Text>
                      </View>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: statusBg }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor }}>{statusLabel}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Manage arrow */}
                  <Text style={{ fontSize: 14, fontWeight: '700', color: NAVY_DARK }}>→</Text>
                </View>
              );
            })
          )}
        </SectionCard>

        {/* ── HEALTH ALERTS ── */}
        {alerts.length > 0 && (
          <SectionCard title="Health Alerts" subtitle="Your athlete's recent check-ins" accentColor={DANGER}>
            {alerts.map((a) => (
              <View key={a.id} className="flex-row items-center px-5 py-4 border-b border-slate-50 gap-4">
                <HealthMeter score={a.overall_score} size={56} />
                <View className="flex-1">
                  <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                    {new Date(a.submitted_at).toLocaleDateString()}{' · '}
                    {new Date(a.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {a.notes && (
                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{a.notes}</Text>
                  )}
                </View>
              </View>
            ))}
          </SectionCard>
        )}

        {/* ── UPCOMING SCHEDULE ── */}
        <SectionCard title="Upcoming Schedule" subtitle="Next sessions & matches">
          {events.length === 0 ? (
            <View className="px-5 pb-5">
              <Text className="text-sm text-slate-400">No upcoming events</Text>
            </View>
          ) : (
            events.map((e) => (
              <View key={e.id} style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 20, paddingVertical: 12,
                borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
              }}>
                <View style={{
                  width: 4, height: 40, borderRadius: 2,
                  backgroundColor: NAVY_DARK, marginRight: 12,
                }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>{e.title}</Text>
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                    {new Date(e.start_time).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {e.type ? ` · ${e.type}` : ''}
                  </Text>
                </View>
              </View>
            ))
          )}
        </SectionCard>

      </View>
    </ScrollView>
  );
}
