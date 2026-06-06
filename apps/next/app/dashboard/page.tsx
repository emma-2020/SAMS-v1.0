'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@sams/store';
import { ROLE_DASHBOARD } from '@sams/app';

/** /dashboard → redirect to role-specific dashboard */
export default function DashboardRedirect() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace(ROLE_DASHBOARD[user.role] ?? '/dashboard/admin');
  }, [user, router]);

  return null;
}
