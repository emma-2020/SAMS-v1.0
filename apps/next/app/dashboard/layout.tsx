'use client';

import { ProtectedGuard } from '@/lib/auth/provider';
import AppShell from '@/components/shell/AppShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedGuard>
      <AppShell>{children}</AppShell>
    </ProtectedGuard>
  );
}
