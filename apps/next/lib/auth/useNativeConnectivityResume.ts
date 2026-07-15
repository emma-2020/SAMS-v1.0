'use client';

import { useEffect } from 'react';
import { recheckOfflineStateOnResume } from '@sams/api';

/**
 * Fixes the offline indicator getting stuck "Offline" after an Android
 * Capacitor WebView is backgrounded and resumed (e.g. Home button, or
 * switching apps to toggle airplane mode) even though connectivity is fine.
 *
 * Root cause: packages/api/src/offline/network.ts's online/offline state is
 * only ever updated by (a) the browser's 'online'/'offline' events and (b)
 * the outcome of real API requests. Backgrounding an Android WebView pauses
 * JS timers and is known to cause both of those signals to be missed or
 * delayed across the background→foreground transition — the 'online' event
 * may never (re)fire, and nothing else proactively re-checks connectivity,
 * so a stale `offline` reading can persist indefinitely even through
 * successful navigations, because ordinary successful requests don't report
 * a "back online" outcome (only the offline queue's replay does).
 *
 * Fix: on native platforms only, actively re-check connectivity whenever the
 * app resumes from the background, rather than passively waiting for a push
 * event that may never arrive.
 *
 * Ideally this would use @capacitor/app's `App.addListener('resume', ...)` /
 * `'appStateChange'` — the officially documented way to observe this
 * transition. That package is not currently a dependency of apps/next (only
 * @capacitor/core, @capacitor/android, @capacitor/ios, @capacitor/cli are
 * installed), so this instead listens for two redundant, dependency-free
 * signals that both cover the same transition:
 *  - the 'resume' DOM event, which the Capacitor native bridge dispatches on
 *    `document` directly (the same underlying signal @capacitor/app's
 *    listener is built on, kept for Cordova-plugin backwards compatibility)
 *  - the standard Page Visibility API ('visibilitychange' → 'visible'), as a
 *    platform-guaranteed backstop in case 'resume' isn't dispatched on a
 *    given WebView/Capacitor version
 * Follow-up: adding @capacitor/app and switching to its App plugin would be
 * a small, drop-in improvement if/when that dependency is added — it's the
 * more explicitly-documented API surface for this exact use case.
 *
 * Guarded by Capacitor.isNativePlatform() (dynamically imported to avoid
 * pulling native-only code into the SSR/plain-web bundle) so plain-web
 * behavior is unchanged — mirrors the dynamic-import + isNativePlatform
 * guard convention used elsewhere in this app for native-only integrations.
 */
export function useNativeConnectivityResume() {
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    import('@capacitor/core').then(({ Capacitor }) => {
      if (cancelled || !Capacitor.isNativePlatform()) return;

      const recheck = () => recheckOfflineStateOnResume();

      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') recheck();
      };

      document.addEventListener('resume', recheck);
      document.addEventListener('visibilitychange', onVisibilityChange);

      // Also cover the case where this hook mounts while the app is already
      // in the foreground after having missed an earlier transition (e.g.
      // fast refresh, or a fresh page load right after a resume).
      recheck();

      cleanup = () => {
        document.removeEventListener('resume', recheck);
        document.removeEventListener('visibilitychange', onVisibilityChange);
      };
    }).catch(() => {});

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);
}
