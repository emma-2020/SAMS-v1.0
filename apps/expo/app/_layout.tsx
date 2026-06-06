import '../global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { configureApiClient, authApi } from '@sams/api';
import { useAuthStore } from '@sams/store';

// Must be called before the first render
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { session, isInitialised, login, logout, refreshSession, setInitialised } = useAuthStore();

  // Wire API client with native token getter
  useEffect(() => {
    configureApiClient({
      getToken: () => useAuthStore.getState().session?.access_token ?? null,
      refresh: async () => {
        const rt = useAuthStore.getState().session?.refresh_token;
        if (!rt) return null;
        try {
          const newSession = await authApi.refreshSession(rt);
          refreshSession(newSession);
          return newSession.access_token;
        } catch {
          return null;
        }
      },
      onUnauthorized: () => logout(),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Revalidate persisted session from AsyncStorage on mount
  useEffect(() => {
    if (isInitialised) {
      SplashScreen.hideAsync().catch(() => {});
      return;
    }

    const validate = async () => {
      if (session?.access_token) {
        try {
          const { profile } = await authApi.me();
          login(session, profile);
        } catch (err: unknown) {
          if (err instanceof Error && err.message.includes('401')) logout();
        }
      }
      setInitialised();
      SplashScreen.hideAsync().catch(() => {});
    };

    validate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
