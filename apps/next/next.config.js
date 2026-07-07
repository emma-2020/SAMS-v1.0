/** @type {import('next').NextConfig} */

const nextConfig = {
  // Static export for all builds: web production and Capacitor both ship the
  // same static export (app shell is now fully offline-cacheable).
  output: 'export',

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
