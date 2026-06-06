import { Tabs, Redirect } from 'expo-router';
import { useAuthStore } from '@sams/store';
import { ROLE_COLOR } from '@sams/ui';
import type { UserProfile } from '@sams/api';

const ROLE_TABS: Record<UserProfile['role'], Array<{ name: string; title: string; icon: string }>> = {
  Admin:  [
    { name: 'index',    title: 'Dashboard', icon: '⊞' },
    { name: 'schedule', title: 'Schedule',  icon: '📅' },
    { name: 'chat',     title: 'Chat',      icon: '💬' },
    { name: 'settings', title: 'Settings',  icon: '⚙️' },
  ],
  Coach:  [
    { name: 'index',     title: 'Dashboard', icon: '⊞' },
    { name: 'players',   title: 'Players',   icon: '👥' },
    { name: 'attendance',title: 'Attendance',icon: '✓' },
    { name: 'health',    title: 'Health',    icon: '❤️' },
    { name: 'settings',  title: 'Settings',  icon: '⚙️' },
  ],
  Player: [
    { name: 'index',    title: 'Dashboard', icon: '⊞' },
    { name: 'schedule', title: 'Schedule',  icon: '📅' },
    { name: 'health',   title: 'Wellness',  icon: '❤️' },
    { name: 'chat',     title: 'Chat',      icon: '💬' },
    { name: 'settings', title: 'Settings',  icon: '⚙️' },
  ],
  Parent: [
    { name: 'index',    title: 'Home',     icon: '⊞' },
    { name: 'schedule', title: 'Schedule', icon: '📅' },
    { name: 'health',   title: 'Health',   icon: '❤️' },
    { name: 'chat',     title: 'Messages', icon: '💬' },
    { name: 'settings', title: 'Settings', icon: '⚙️' },
  ],
};

export default function TabsLayout() {
  const { isAuthenticated, isInitialised, user } = useAuthStore();

  if (isInitialised && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  const role = user?.role ?? 'Player';
  const tabs = ROLE_TABS[role];
  const activeColor = ROLE_COLOR[role] ?? '#6366F1';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F1F5F9',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => (
              <span style={{ fontSize: 20, color }}>{tab.icon}</span>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
