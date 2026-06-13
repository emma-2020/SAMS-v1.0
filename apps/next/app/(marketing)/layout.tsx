'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { label: 'Features', hash: '#features' },
  { label: 'Roles',    hash: '#roles'    },
  { label: 'Pricing',  hash: '#pricing'  },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEnroll = pathname === '/enroll';

  function navHref(hash: string) {
    return isEnroll ? `/${hash}` : hash;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060B14', fontFamily: 'Inter, sans-serif', color: '#F1F5F9' }}>

      {/* ── Fixed frosted-glass navbar ── */}
      <header style={{
        position: 'fixed', inset: '0 0 auto 0', zIndex: 100,
        height: 64,
        background: 'rgba(6,11,20,0.85)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(255,255,255,0.055)',
        display: 'flex', alignItems: 'center',
        padding: '0 clamp(20px, 5vw, 64px)',
        gap: 32,
      }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(124,58,237,0.55)',
            flexShrink: 0,
          }}>
            <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#fff' }}>S</span>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#F1F5F9', letterSpacing: '0.08em' }}>SAMS</div>
            <div style={{ fontSize: '0.57rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.07em', marginTop: 1 }}>
              Sports Academy Management
            </div>
          </div>
        </Link>

        {/* Centre nav */}
        <nav style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          {NAV.map(({ label, hash }) => (
            <Link
              key={label}
              href={navHref(hash)}
              style={{
                padding: '7px 18px', borderRadius: 99,
                fontSize: '0.83rem', fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                textDecoration: 'none', letterSpacing: '0.01em',
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.color = '#F1F5F9';
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.07)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.5)';
                (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
              }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right CTA — swaps on /enroll */}
        {isEnroll ? (
          <Link href="/" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 99, flexShrink: 0,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.45)',
            fontSize: '0.8rem', fontWeight: 600,
            textDecoration: 'none', letterSpacing: '0.01em',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to home
          </Link>
        ) : (
          <Link
            href="/enroll"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 22px', borderRadius: 99, flexShrink: 0,
              background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
              color: '#fff', fontSize: '0.83rem', fontWeight: 700,
              textDecoration: 'none', letterSpacing: '0.01em',
              boxShadow: '0 4px 18px rgba(109,40,217,0.52)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.04)';
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 30px rgba(109,40,217,0.72)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 18px rgba(109,40,217,0.52)';
            }}
          >
            Enroll Academy
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
        )}
      </header>

      <main>{children}</main>

      <style>{`html { scroll-behavior: smooth; }`}</style>
    </div>
  );
}
