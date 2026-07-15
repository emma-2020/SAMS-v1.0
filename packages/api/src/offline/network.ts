type Listener = (online: boolean) => void;

// Seeded from navigator.onLine, then kept up to date by BOTH the browser's
// online/offline events AND the real outcome of actual API requests — the
// browser event alone is unreliable on a flaky connection (e.g. still
// associated with WiFi but the upstream link is down), so a real request
// failing/succeeding is treated as an equally valid signal.
let online = typeof navigator !== 'undefined' ? navigator.onLine : true;
const listeners = new Set<Listener>();

function setOnline(next: boolean): void {
  if (online === next) return;
  online = next;
  listeners.forEach((l) => l(online));
}

export function isOffline(): boolean {
  return !online;
}

export function reportNetworkOutcome(success: boolean): void {
  setOnline(success);
}

export function onNetworkChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Actively re-reads the live navigator.onLine value instead of waiting for a
// push event. Exists for the Android/Capacitor WebView case: backgrounding
// pauses JS timers and can cause the 'online'/'offline' events (and their
// underlying navigator.onLine change notification) to never reach this
// module's listeners across a background→foreground transition, leaving
// `online` stuck at whatever it was the instant the app was suspended. A
// fresh synchronous read on resume sidesteps that — see
// apps/next/lib/auth/useNativeConnectivityResume.ts, which calls this from
// Capacitor's native 'resume' lifecycle signal.
export function recheckConnectivity(): void {
  if (typeof navigator !== 'undefined') setOnline(navigator.onLine);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => setOnline(true));
  window.addEventListener('offline', () => setOnline(false));
}
