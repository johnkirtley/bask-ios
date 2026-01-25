import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.bask',
  appName: 'Bask',
  webDir: 'out',
  ios: {
    contentInset: 'never',
    backgroundColor: '#F9F9F7',
  },
};

export default config;
