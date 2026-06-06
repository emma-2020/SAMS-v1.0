import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '@sams/store';
import { ROLE_DASHBOARD } from '@sams/app';

export default function AuthLayout() {
  const { isAuthenticated, isInitialised, user } = useAuthStore();

  if (isInitialised && isAuthenticated && user) {
    const dest = ROLE_DASHBOARD[user.role] ?? '/(tabs)';
    return <Redirect href={dest as never} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
