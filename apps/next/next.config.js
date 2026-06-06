/** @type {import('next').NextConfig} */
const { withNativeWind } = require('nativewind/next');

const nextConfig = {
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
    // Allow platform-specific extensions: .web.tsx before .tsx
    config.resolve.extensions = [
      '.web.tsx', '.web.ts', '.web.jsx', '.web.js',
      ...config.resolve.extensions,
    ];
    return config;
  },
};

module.exports = withNativeWind(nextConfig, { input: './app/global.css' });
