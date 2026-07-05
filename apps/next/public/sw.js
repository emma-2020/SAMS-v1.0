// Minimal app-shell service worker. This only makes the shell (HTML/JS/CSS)
// available offline — API data caching and the mutation queue for chat/
// attendance already live in IndexedDB via @sams/api's offline module, not
// here, so this file deliberately ignores /api/ requests.
const CACHE_NAME = 'sams-shell-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first, falling back to the last cached copy when offline — never
// serves a stale shell while online, but still loads something without a
// connection.
//
// Page navigations (the actual dashboard HTML) are deliberately NOT cached
// or served from cache here: that HTML is rendered per logged-in user, and
// this cache is shared by whoever next uses the device/browser — caching it
// would risk showing one account's page to another on a shared/kiosk device.
// Only static, non-user-specific assets (JS/CSS/images/fonts) are cached.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req));
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
