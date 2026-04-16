import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from './supabase';

/**
 * Listens to new orders via Supabase Realtime and shows local notifications on the device.
 */
export function startOrderNotificationListener() {
  supabase
    .channel('new-orders')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'orders' },
      async (payload) => {
        const order = payload.new as { name?: string; total?: number };
        const title = '🔔 Novo Pedido!';
        const body = `${order.name || 'Cliente'} - R$ ${(order.total ?? 0).toFixed(2)}`;

        if (Capacitor.isNativePlatform()) {
          const perm = await LocalNotifications.requestPermissions();
          if (perm.display === 'granted') {
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
        } else {
          // Fallback: browser Notification API
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body });
          } else if ('Notification' in window && Notification.permission !== 'denied') {
            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
              new Notification(title, { body });
            }
          }
        }
      }
    )
    .subscribe();
}
