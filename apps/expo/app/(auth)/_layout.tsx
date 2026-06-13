import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '@sams/store';

export default function AuthLayout() {
  const { isAuthenticated, isInitialised, user } = useAuthStore();

  if (isInitialised && isAuthenticated && user) {
    // ROLE_DASHBOARD from @sams/app holds Next.js paths (/dashboard/admin).
    // On Expo, all roles share the same tab navigator at '/' — the tabs layout
    // shows the role-appropriate dashboard based on the user's role in Zustand.
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
