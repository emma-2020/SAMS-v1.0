'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@sams/store';
import { ROLE_DASHBOARD } from '@sams/app';

/** Root `/` — redirect to role dashboard or login */
export default function RootPage() {
  const { isAuthenticated, isInitialised, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialised) return;
    if (isAuthenticated && user) {
      router.replace(ROLE_DASHBOARD[user.role] ?? '/dashboard');
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, isInitialised, user, router]);

  return null;
}
