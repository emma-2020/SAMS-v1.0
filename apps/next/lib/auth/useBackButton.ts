'use client';

import { useEffect } from 'react';

/**
 * Wires the Android hardware/gesture back button to in-app navigation when
 * running inside the Capacitor native shell. Without this, Capacitor's
 * default behaviour is to exit the app on every back-button press, from any
 * screen depth — there is no built-in "step back through the app" behaviour
 * for a live-server WebView.
 *
 * No-ops entirely on plain web (isNativePlatform() is false there), so this
 * only affects the native Android/iOS build.
 */
export function useBackButton() {
  useEffect(() => {
    let removeListener: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      // Dynamic import so this native-only plugin never ends up in the
      // plain-web bundle's critical path and never throws on platforms
      // where the native bridge isn't present.
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;

      const { App } = await import('@capacitor/app');
      const handle = await App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          // Already at the true root of the in-app history stack — mirror
          // stock Android behaviour and exit rather than trap the user.
          App.exitApp();
        }
      });

      if (cancelled) {
        handle.remove();
      } else {
        removeListener = () => handle.remove();
      }
    })();

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, []);
}
