'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getPlatformToken, clearPlatformToken } from '@sams/api';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/platform/dashboard', icon: '⬡' },
  { label: 'Requests',  path: '/platform/requests',  icon: '📋' },
  { label: 'Academies', path: '/platform/academies',  icon: '🏫' },
  { label: 'Security',  path: '/platform/dashboard/security', icon: '🔐' },
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

  if (pathname === '/platform/login') return <>{children}</>;
  if (!ready) return null;

  function handleLogout() {
    clearPlatformToken();
    router.replace('/platform/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#060B14' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 240, flexShrink: 0,
        background: '#07091A',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '28px 22px 22px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(124,58,237,0.1)',
            border: '1px solid rgba(124,58,237,0.25)',
            borderRadius: 5, padding: '3px 9px',
            color: '#A78BFA',
            fontSize: '0.58rem', fontWeight: 800,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            <span style={{
              width: 4, height: 4, borderRadius: '50%',
              background: '#8B5CF6',
              boxShadow: '0 0 5px #8B5CF6',
              display: 'inline-block',
            }} />
            PLATFORM ADMIN
          </div>
          <div style={{ color: '#F1F5F9', fontSize: '1.25rem', fontWeight: 900, letterSpacing: -0.5 }}>
            SAMS
          </div>
          <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.72rem', marginTop: 2 }}>
            Control Plane
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 22px 18px' }} />

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 10px' }}>
          {NAV_ITEMS.map(item => {
            const active = pathname.startsWith(item.path);
            return (
              <div key={item.path} style={{ position: 'relative', marginBottom: 3 }}>
                {/* Active indicator bar */}
                {active && (
                  <div style={{
                    position: 'absolute', left: 0,
                    top: '50%', transform: 'translateY(-50%)',
                    width: 3, height: '60%',
                    borderRadius: '0 3px 3px 0',
                    background: 'linear-gradient(180deg, #8B5CF6, #EC4899)',
                    boxShadow: '0 0 10px rgba(139,92,246,0.9)',
                    zIndex: 1,
                  }} />
                )}
                <Link
                  href={item.path}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px 10px 18px', borderRadius: 10,
                    textDecoration: 'none', transition: 'all 0.15s',
                    background: active ? 'rgba(124,58,237,0.12)' : 'transparent',
                    color: active ? '#C4B5FD' : 'rgba(255,255,255,0.42)',
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.875rem',
                    border: active ? '1px solid rgba(124,58,237,0.14)' : '1px solid transparent',
                    boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.04)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                  {item.label}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '16px 10px 26px' }}>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 12px 16px' }} />
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '10px 14px 10px 18px', borderRadius: 10,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.28)', fontSize: '0.875rem',
              textAlign: 'left', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = '#F87171';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.28)';
              (e.currentTarget as HTMLButtonElement).style.background = 'none';
            }}
          >
            <span>⎋</span> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{
        marginLeft: 240, flex: 1,
        padding: '36px 40px',
        minHeight: '100vh',
        background: '#060B14',
      }}>
        {children}
      </main>
    </div>
  );
}
