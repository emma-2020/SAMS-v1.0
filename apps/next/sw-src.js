importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js');

// API data caching and the offline mutation queue for chat/attendance
// already live in IndexedDB via @sams/api's offline module (packages/api/src/offline/)
// — this service worker's job is ONLY the app shell (every static HTML/JS/CSS
// file produced by the static export build), so /api/ requests are always
// left alone here, same as before.

if (typeof workbox !== 'undefined') {
  workbox.core.setCacheNameDetails({ prefix: 'sams-shell' });

  // The manifest placeholder below is replaced by workbox-build's
  // injectManifest with the real list of {url, revision} entries for every
  // file in the static export output — this is what lets the ENTIRE app
  // boot with zero network, not just whichever page happened to load before.
  // (workbox-build does a literal text search for that exact placeholder
  // string, so it must appear in this file EXACTLY once — don't repeat it
  // in a comment, that was the bug that broke this the first time.)
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || [], {
    // The manifest itself is built with clean URLs (see scripts/build-sw.js's
    // manifestTransforms — "/dashboard/coach/chat/", not the on-disk
    // "dashboard/coach/chat/index.html"), matching what real navigation
    // actually requests with next.config.js's trailingSlash:true. This is
    // just a fallback for a request that arrives WITHOUT the trailing slash
    // (an old link, something typed by hand) — normally the server 301s
    // that to the slash form, but there's no server to do that while
    // offline, so the service worker needs to try both itself.
    urlManipulation: ({ url }) => {
      const variations = [url];
      if (!url.pathname.endsWith('/') && !url.pathname.includes('.')) {
        const slashUrl = new URL(url.href);
        slashUrl.pathname = url.pathname + '/';
        variations.push(slashUrl);
      }
      return variations;
    },
  });
}

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Anything precached is already handled by precacheAndRoute above (it
  // registers its own fetch listener). This handler covers everything else:
  // network-first, falling back to cache, for any static asset that wasn't
  // part of the precache manifest for some reason, and a last-resort
  // fallback to the root shell for navigations so the app can still boot
  // and let its own client-side router figure out what to render.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open('sams-shell-runtime').then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
