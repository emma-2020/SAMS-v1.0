import { View } from 'react-native';
import { useAuthStore } from '@sams/store';
import { AdminDashboardScreen, CoachDashboardScreen, PlayerDashboardScreen, ParentDashboardScreen } from '@sams/app';

const SCREENS = {
  Admin:  AdminDashboardScreen,
  Coach:  CoachDashboardScreen,
  Player: PlayerDashboardScreen,
  Parent: ParentDashboardScreen,
};

export default function DashboardTab() {
  const role = useAuthStore((s) => s.user?.role) ?? 'Player';
  const Screen = SCREENS[role as keyof typeof SCREENS] ?? PlayerDashboardScreen;
  return (
    <View style={{ flex: 1 }}>
      <Screen />
    </View>
  );
}
