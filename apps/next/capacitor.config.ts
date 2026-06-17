import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sams.sportsmanagement',
  appName: 'SAMS',
  webDir: 'out',
  server: {
    // Production live-server mode — always loads latest from Vercel.
    // For a fully-bundled offline build remove this `server` block entirely
    // and run `pnpm build` (static export) before `npx cap sync`.
    url: 'https://app.playsams.com',
  },
};

export default config;
