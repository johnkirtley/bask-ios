import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.bask',
  appName: 'Bask',
  webDir: 'out',
  ios: {
    contentInset: 'never',
    backgroundColor: '#0A0E1A',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#FF9500',
      sound: 'default',
    },
  },
};

export default config;
