import { View, Text, ScrollView, Pressable } from '@sams/ui';
import { useAuthStore } from '@sams/store';
import { ROLE_COLOR, Avatar } from '@sams/ui';
import { useRouter } from 'expo-router';
import { authApi } from '@sams/api';

export default function SettingsTab() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const role = user?.role ?? 'Player';
  const color = ROLE_COLOR[role as keyof typeof ROLE_COLOR] ?? '#6366F1';

  async function handleLogout() {
    try { await authApi.logout(); } catch (_) {}
    logout();
    router.replace('/(auth)/login');
  }

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-950" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text className="text-xl font-black text-slate-900 dark:text-white mb-5">Settings</Text>

      {/* Profile card */}
      <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-4 border border-slate-100 dark:border-slate-700 flex-row items-center gap-4">
        <Avatar user={user} size={56} />
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-900 dark:text-white">
            {user?.first_name} {user?.last_name}
          </Text>
          <Text className="text-sm text-slate-400">{user?.email}</Text>
          <View style={{ marginTop: 6, alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 99, backgroundColor: `${color}15` }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{role}</Text>
          </View>
        </View>
      </View>

      {/* Info rows */}
      <View className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden mb-4">
        {[
          { label: 'Academy ID', value: user?.academy_id?.slice(0, 8) + '…' },
          { label: 'Role', value: user?.role },
        ].map(({ label, value }) => (
          <View key={label} className="flex-row items-center justify-between px-5 py-4 border-b border-slate-50 dark:border-slate-700">
            <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</Text>
            <Text className="text-sm font-bold text-slate-900 dark:text-white">{value}</Text>
          </View>
        ))}
      </View>

      {/* Logout */}
      <Pressable onPress={handleLogout}
        style={({ pressed }: { pressed: boolean }) => ({
          backgroundColor: pressed ? '#FEF2F2' : '#FFFFFF',
          borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FECACA',
          flexDirection: 'row', alignItems: 'center', gap: 12,
        })}>
        <Text style={{ fontSize: 20 }}>🚪</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#EF4444', flex: 1 }}>Sign Out</Text>
        <Text style={{ color: '#EF4444', fontSize: 18 }}>›</Text>
      </Pressable>
    </ScrollView>
  );
}
