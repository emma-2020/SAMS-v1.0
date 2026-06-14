import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sams.sportsmanagement',
  appName: 'SAMS',
  webDir: 'out',
  server: {
    url: 'http://10.0.2.2:3002',
    cleartext: true,
  },
};

export default config;
