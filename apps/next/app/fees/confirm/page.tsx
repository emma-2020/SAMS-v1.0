'use client';

// Paystack redirects here after a checkout attempt (success or otherwise),
// appending ?trxref=...&reference=... to whatever callback_url the backend
// gave it (see backend/src/services/fee.service.js). The actual ledger
// update happens asynchronously via the /api/fees/webhook/paystack webhook —
// this page does not re-verify the transaction itself, it only acknowledges
// that checkout completed and points the visitor back into the app.
//
// Deliberately lives OUTSIDE /dashboard/*: whoever completes checkout (the
// player, a parent, or an admin paying on someone's behalf) may be doing so
// in a browser session with no live app login at all — e.g. a payment link
// opened from an email on a device they've never signed into. Rendering
// under the /dashboard tree would force ProtectedGuard to bounce them to
// /login before they ever saw a confirmation. Nothing on this page is
// gated behind — or displays — actual fee data (no amount, no description,
// no balance), so it's safe to show before we know who, if anyone, is
// signed in.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@sams/store';

const ROLE_FEES_PATH: Partial<Record<string, string>> = {
  Admin:  '/dashboard/admin/fees',
  Player: '/dashboard/player/fees',
  Parent: '/dashboard/parent/fees',
};

const IconCheck = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconAlert = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export default function FeesConfirmPage() {
  // Read query params directly from location instead of next/navigation's
  // useSearchParams — avoids needing a Suspense boundary on a page that must
  // render immediately for a signed-out visitor (mirrors the pattern used by
  // (auth)/reset-password for its token param).
  const [hasReference, setHasReference] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setHasReference(Boolean(params.get('trxref') || params.get('reference')));
  }, []);

  const { isInitialised, isAuthenticated, user } = useAuthStore();

  const feesPath = user ? (ROLE_FEES_PATH[user.role] ?? '/dashboard') : null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F6FA', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.10)', padding: '40px 36px', textAlign: 'center' }}>

        {hasReference === null ? (
          // Brief instant before the query-string check runs client-side.
          <div style={{ padding: '20px 0' }}>
            <div style={{ width: 32, height: 32, margin: '0 auto', borderRadius: '50%', border: '3px solid #E2E8F0', borderTopColor: '#6366F1', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : hasReference ? (
          <>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', boxShadow: '0 8px 24px rgba(16,185,129,0.35)',
            }}>
              <IconCheck />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>Payment received, thank you!</h1>
            <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0 }}>
              Your payment is being processed. It can take a minute or two for your balance to update.
            </p>
          </>
        ) : (
          <>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', boxShadow: '0 8px 24px rgba(245,158,11,0.35)',
            }}>
              <IconAlert />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>We couldn&apos;t confirm this payment</h1>
            <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0 }}>
              Please check your fee status, or contact your academy if you believe a payment went through.
            </p>
          </>
        )}

        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isInitialised && isAuthenticated && feesPath ? (
            <Link href={feesPath} style={{
              display: 'block', padding: '12px 28px', borderRadius: 10,
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              color: 'white', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
            }}>
              View My Fees
            </Link>
          ) : isInitialised ? (
            <Link href="/login" style={{
              display: 'block', padding: '12px 28px', borderRadius: 10,
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              color: 'white', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
            }}>
              Go to Login
            </Link>
          ) : (
            <div style={{ height: 46 }} />
          )}
        </div>
      </div>
    </div>
  );
}
