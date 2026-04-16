import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.73d7cddbe5cd48c3b1065c6157f2041e',
  appName: 'Master Serviços',
  webDir: 'dist',
  server: {
    url: 'https://73d7cddb-e5cd-48c3-b106-5c6157f2041e.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
