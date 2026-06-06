'use client';

import { PublicOnlyGuard } from '@/lib/auth/provider';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <PublicOnlyGuard>{children}</PublicOnlyGuard>;
}
