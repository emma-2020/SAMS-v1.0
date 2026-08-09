'use client';

import { useEffect } from 'react';

// Client-only, deliberately not using @sentry/nextjs: this app builds with
// `output: 'export'` (next.config.js) — a fully static export with no Next.js
// server/edge runtime (Vercel serves static files; Capacitor points at the
// same build). @sentry/nextjs's automatic instrumentation and next.config.js
// webpack plugin assume a live server process this app doesn't have, and
// wrapping next.config risks the existing custom react-native-web alias.
// @sentry/react covers what's actually needed here: browser-side error and
// unhandled-rejection capture. Runs in a useEffect (browser-only) so it never
// executes during the Node.js static-export build.
//
// No-ops with a clear console note until NEXT_PUBLIC_SENTRY_DSN is set (add
// it to apps/next/.env.production once a Sentry project/DSN exists).
export function SentryInit() {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) {
      if (process.env.NODE_ENV === 'development') {
        console.info('[Sentry] NEXT_PUBLIC_SENTRY_DSN not set — error monitoring disabled.');
      }
      return;
    }
    import('@sentry/react').then((Sentry) => {
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
      });
    });
  }, []);

  return null;
}
