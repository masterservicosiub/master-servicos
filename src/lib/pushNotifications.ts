import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

export async function initPushNotifications() {
  if (!Capacitor.isNativePlatform()) return;

  const permResult = await PushNotifications.requestPermissions();
  if (permResult.receive !== 'granted') {
    console.warn('Push notification permission not granted');
    return;
  }

  await PushNotifications.register();

  PushNotifications.addListener('registration', (token) => {
    console.log('Push registration token:', token.value);
    // Salvar token no banco se necessário
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.error('Push registration error:', err.error);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received:', notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push action:', notification);
  });
}

export async function showLocalNotification(title: string, body: string) {
  if (!Capacitor.isNativePlatform()) return;

  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== 'granted') return;

  await LocalNotifications.schedule({
    notifications: [
      {
        title,
        body,
        id: Date.now(),
        schedule: { at: new Date(Date.now() + 500) },
        sound: undefined,
        attachments: undefined,
        actionTypeId: '',
        extra: null,
      },
    ],
  });
}
