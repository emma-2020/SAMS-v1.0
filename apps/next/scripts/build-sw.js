const { injectManifest } = require('workbox-build');
const path = require('path');

// Precache URLs must match what a real browser actually requests, not the
// on-disk filename — those aren't always the same thing on a given static
// host. With trailingSlash:true, Next.js writes "<route>/index.html" to
// disk, but the URL a link/navigation actually requests is "<route>/". Some
// hosts serve both; Vercel's clean-URL rewriting for this Next.js export
// setup only reliably serves the clean form. Precaching the raw filename
// caused every install to fail with "bad-precaching-response" there (it
// worked fine against a local test server, which is more permissive about
// serving raw filenames — that's what hid this the first time). Rewriting
// here to the clean URL means the service worker requests, during install,
// the exact same URL shape real navigation uses.
function toCleanUrl(entry) {
  if (entry.url === 'index.html') {
    entry.url = '/';
  } else if (entry.url.endsWith('/index.html')) {
    entry.url = '/' + entry.url.slice(0, -'index.html'.length);
  } else if (!entry.url.startsWith('/')) {
    entry.url = '/' + entry.url;
  }
  return entry;
}

// Workbox aborts precaching ENTIRELY if a single manifest entry 404s on
// install — confirmed via the actual deployed service worker's own install
// lifecycle (it silently died partway through with only 4/148 files
// cached). Two categories fail specifically on Vercel's hosting (not on a
// local static-file server, which is why local testing didn't catch this):
//  - Next's special error-page artifacts (404.html, 404/) — Vercel
//    intercepts requests to its own error-page path and serves its own
//    404 response rather than the literal static file there.
//  - JS chunk filenames containing literal "[" "]" characters, produced for
//    the one dynamic route (platform/requests/[id]) — that route already
//    has its own generateStaticParams placeholder fallback and works fine
//    loaded fresh online; not precaching this one chunk doesn't undermine
//    the app-shell-boots-offline goal for every real user-facing route.
function isUnprecacheable(entry) {
  if (entry.url === '404.html' || entry.url === '404/index.html') return true;
  if (entry.url.includes('[') || entry.url.includes(']')) return true;
  return false;
}

async function run() {
  const { count, size, warnings } = await injectManifest({
    swSrc: path.join(__dirname, '..', 'sw-src.js'),
    swDest: path.join(__dirname, '..', 'out', 'sw.js'),
    globDirectory: path.join(__dirname, '..', 'out'),
    globPatterns: ['**/*.{html,js,css,json,ico,png,jpg,jpeg,svg,woff,woff2}'],
    // The manifest itself would otherwise try to precache prior manifest
    // output if this script is ever re-run without a clean build; exclude
    // sw.js itself and any map files, which shouldn't be precached anyway.
    globIgnores: ['sw.js', '**/*.map'],
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    manifestTransforms: [
      (entries) => ({ manifest: entries.filter((e) => !isUnprecacheable(e)).map(toCleanUrl), warnings: [] }),
    ],
  });
  if (warnings.length) {
    console.warn('[build-sw] workbox warnings:', warnings);
  }
  console.log(`[build-sw] Precached ${count} files, totaling ${(size / 1024 / 1024).toFixed(2)} MB.`);
}

run().catch((err) => {
  console.error('[build-sw] failed:', err);
  process.exit(1);
});
