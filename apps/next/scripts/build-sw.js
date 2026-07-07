const { injectManifest } = require('workbox-build');
const path = require('path');

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
