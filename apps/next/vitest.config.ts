import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Mirrors next.config.js's webpack resolve config (react-native ->
// react-native-web alias, .web.tsx extension priority) so components shared
// with the Capacitor/RN app resolve the same way under Vitest as they do
// under the real Next.js build. See CLAUDE.md investigation notes, item 5.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
    css: false,
  },
  resolve: {
    alias: [
      { find: /^react-native$/, replacement: 'react-native-web' },
      { find: '@', replacement: path.resolve(__dirname, '.') },
    ],
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
});
