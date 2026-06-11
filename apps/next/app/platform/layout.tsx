'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getPlatformToken, clearPlatformToken } from '@sams/api';

const NAVY     = '#0D1B3E';
const NAVY_MID = '#172B5E';

const NAV_ITEMS = [
  { label: 'Dashboard',  path: '/platform/dashboard',  icon: '▦' },
  { label: 'Requests',   path: '/platform/requests',   icon: '📋' },
  { label: 'Academies',  path: '/platform/academies',  icon: '🏫' },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getPlatformToken();
    if (!token && pathname !== '/platform/login') {
      router.replace('/platform/login');
    } else {
      setReady(true);
    }
  }, [pathname, router]);

  // Don't render shell on the login page itself
  if (pathname === '/platform/login') {
    return <>{children}</>;
  }

  if (!ready) return null;

  function handleLogout() {
    clearPlatformToken();
    router.replace('/platform/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 240, flexShrink: 0,
        background: NAVY,
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '28px 24px 20px' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6, padding: '3px 8px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.6rem', fontWeight: 800,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            marginBottom: 10,
          }}>PLATFORM ADMIN</div>
          <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 900, letterSpacing: -0.5 }}>
            SAMS
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', marginTop: 2 }}>
            Control Plane
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 24px 16px' }} />

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 12px' }}>
          {NAV_ITEMS.map(item => {
            const active = pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 10, marginBottom: 4,
                  textDecoration: 'none', transition: 'all 0.15s',
                  background: active
                    ? 'linear-gradient(90deg, #EC4899, #8B5CF6)'
                    : 'transparent',
                  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.875rem',
                }}
              >
                <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '16px 12px 24px' }}>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 12px 16px' }} />
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '10px 14px', borderRadius: 10,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem',
              textAlign: 'left', transition: 'color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)'; }}
          >
            <span>⎋</span> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ marginLeft: 240, flex: 1, padding: '32px 36px', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}
