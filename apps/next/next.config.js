/** @type {import('next').NextConfig} */

const nextConfig = {
  // Static export for all builds: web production and Capacitor both ship the
  // same static export (app shell is now fully offline-cacheable).
  output: 'export',

  // Without this, static export writes "foo.html" for the /foo route, but
  // Vercel's static hosting only serves the clean URL "/foo" — it 404s on
  // the literal "/foo.html" path. The service worker's precache list is
  // built from the literal on-disk filenames, so those installs failed with
  // "bad-precaching-response" on Vercel (it worked against a local test
  // server that's more permissive about serving raw filenames, which hid
  // this). trailingSlash makes static export write "foo/index.html"
  // instead — servers universally serve index.html for a directory
  // request, so "/foo/" resolves correctly everywhere, not just locally.
  trailingSlash: true,

  // Transpile workspace packages and react-native-web
  transpilePackages: [
    'react-native',
    'react-native-web',
    'nativewind',
    'react-native-css-interop',
    'solito',
    '@sams/ui',
    '@sams/app',
    '@sams/store',
    '@sams/api',
  ],

  // Alias 'react-native' → 'react-native-web' so RN primitives compile on Next.js
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'react-native$': 'react-native-web',
    };
    // Resolve platform-specific extensions: .web.tsx wins before .tsx on Next.js
    config.resolve.extensions = [
      '.web.tsx', '.web.ts', '.web.jsx', '.web.js',
      ...config.resolve.extensions,
    ];
    return config;
  },
};

module.exports = nextConfig;
