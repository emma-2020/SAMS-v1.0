'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV = [
  { label: 'Features',     hash: '#features'     },
  { label: 'How It Works', hash: '#how-it-works' },
  { label: 'Roles',        hash: '#roles'        },
  { label: 'Pricing',      hash: '#pricing'      },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const isEnroll  = pathname === '/enroll';
  const [menuOpen, setMenuOpen] = useState(false);

  function navHref(hash: string) {
    return isEnroll ? `/${hash}` : hash;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060B14', fontFamily: 'Inter, sans-serif', color: '#F1F5F9' }}>

      {/* ── Fixed frosted-glass navbar ── */}
      <header style={{
        position: 'fixed', inset: '0 0 auto 0', zIndex: 100,
        height: 64,
        background: 'rgba(6,11,20,0.88)',
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

        {/* Centre nav — hidden on mobile */}
        <nav className="mkt-center-nav" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          {NAV.map(({ label, hash }) => (
            <Link
              key={label}
              href={navHref(hash)}
              style={{
                padding: '7px 16px', borderRadius: 99,
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

        {/* Right CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {isEnroll ? (
            <Link href="/" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 99,
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
            <>
              {/* Sign In */}
              <Link
                href="/login"
                className="mkt-signin-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 20px', borderRadius: 99,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: '0.83rem', fontWeight: 600,
                  textDecoration: 'none', letterSpacing: '0.01em',
                  transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = 'rgba(255,255,255,0.1)';
                  el.style.borderColor = 'rgba(255,255,255,0.22)';
                  el.style.color = '#F1F5F9';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = 'rgba(255,255,255,0.05)';
                  el.style.borderColor = 'rgba(255,255,255,0.12)';
                  el.style.color = 'rgba(255,255,255,0.75)';
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Sign In
              </Link>

              {/* Enroll */}
              <Link
                href="/enroll"
                className="mkt-enroll-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 22px', borderRadius: 99,
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
                <span className="mkt-btn-text">Enroll Academy</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>

              {/* Hamburger — shown on mobile only via CSS */}
              <button
                className="mkt-hamburger"
                onClick={() => setMenuOpen(v => !v)}
                aria-label="Toggle navigation menu"
                style={{
                  display: 'none',
                  background: menuOpen ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${menuOpen ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 8, padding: '7px',
                  cursor: 'pointer',
                  color: menuOpen ? '#A78BFA' : 'rgba(255,255,255,0.7)',
                  alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >
                {menuOpen ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                  </svg>
                )}
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Mobile dropdown nav ── */}
      {menuOpen && !isEnroll && (
        <div
          className="mkt-mobile-dropdown"
          style={{
            position: 'fixed', top: 64, left: 0, right: 0, zIndex: 99,
            background: 'rgba(6,11,20,0.97)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            padding: '8px 16px 16px',
            display: 'flex', flexDirection: 'column', gap: 2,
          }}
        >
          {NAV.map(({ label, hash }) => (
            <Link
              key={label}
              href={navHref(hash)}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '12px 16px', borderRadius: 10,
                fontSize: '0.92rem', fontWeight: 600,
                color: 'rgba(255,255,255,0.65)',
                textDecoration: 'none', display: 'block',
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.color = '#F1F5F9'; el.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.color = 'rgba(255,255,255,0.65)'; el.style.background = 'transparent'; }}
            >
              {label}
            </Link>
          ))}
          <div style={{ marginTop: 6, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '12px 16px', borderRadius: 10,
                fontSize: '0.92rem', fontWeight: 600,
                color: 'rgba(255,255,255,0.4)',
                textDecoration: 'none', display: 'block',
              }}
            >
              Sign In
            </Link>
          </div>
        </div>
      )}

      <main>{children}</main>

      <style>{`
        html { scroll-behavior: smooth; }
        @media (max-width: 680px) {
          .mkt-center-nav    { display: none !important; }
          .mkt-signin-btn    { display: none !important; }
          .mkt-hamburger     { display: flex !important; }
          .mkt-enroll-btn    { padding: 9px 14px !important; }
          .mkt-btn-text      { display: none !important; }
        }
        @media (min-width: 681px) {
          .mkt-hamburger       { display: none !important; }
          .mkt-mobile-dropdown { display: none !important; }
        }
        @media (max-width: 380px) {
          .mkt-enroll-btn { display: none !important; }
        }
      `}</style>
    </div>
  );
}
