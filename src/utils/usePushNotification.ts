import { useState, useEffect, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type PushPermissionState = 'unsupported' | 'prompt' | 'granted' | 'denied' | 'subscribing';

interface UsePushNotificationOptions {
  supabaseClient?: SupabaseClient;
  vapidPublicKey?: string;
  swPath?: string;
  userId?: string;
}

/**
 * Utility to convert base64url VAPID public key string into a Uint8Array
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotification(options: UsePushNotificationOptions = {}) {
  const {
    supabaseClient,
    vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
    swPath = '/sw.js',
    userId,
  } = options;

  const [state, setState] = useState<PushPermissionState>('prompt');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkSupportAndStatus = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }

    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }

    try {
      const reg = await navigator.serviceWorker.getRegistration(swPath);
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub && Notification.permission === 'granted') {
          setSubscription(sub);
          setState('granted');
          return;
        }
      }
    } catch (err: any) {
      console.warn('[usePushNotification] Error checking subscription:', err);
    }

    setState('prompt');
  }, [swPath]);

  useEffect(() => {
    checkSupportAndStatus();
  }, [checkSupportAndStatus]);

  const enableNotifications = async (): Promise<boolean> => {
    setError(null);

    if (state === 'unsupported') {
      setError('Push notifications are not supported by this browser.');
      return false;
    }

    if (Notification.permission === 'denied') {
      setState('denied');
      setError('Notifications are blocked in your browser settings.');
      return false;
    }

    setState('subscribing');

    try {
      // 1. Request user permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState('denied');
        setError('Notification permission was not granted.');
        return false;
      }

      // 2. Register Service Worker if not registered
      let reg = await navigator.serviceWorker.getRegistration(swPath);
      if (!reg) {
        reg = await navigator.serviceWorker.register(swPath, { scope: '/' });
      }
      await navigator.serviceWorker.ready;

      // 3. Obtain VAPID Public Key
      let key = vapidPublicKey;
      if (!key) {
        const keyRes = await fetch('/api/dashboard/push/vapid-public-key');
        if (keyRes.ok) {
          const keyData = await keyRes.json();
          key = keyData.publicKey;
        }
      }

      if (!key) {
        throw new Error('VAPID public key is missing.');
      }

      const applicationServerKey = urlBase64ToUint8Array(key);

      // 4. Subscribe to Push Manager
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      const subJson = sub.toJSON();
      const endpoint = subJson.endpoint;
      const p256dh = subJson.keys?.p256dh;
      const auth = subJson.keys?.auth;

      if (!endpoint || !p256dh || !auth) {
        throw new Error('Push subscription missing cryptographic keys');
      }

      // 5. Store in Supabase push_subscriptions table
      if (supabaseClient) {
        const authUser = userId ? { id: userId } : (await supabaseClient.auth.getUser()).data.user;
        const currentUserId = authUser?.id || userId || 'anonymous-device';

        const { error: dbError } = await supabaseClient
          .from('push_subscriptions')
          .upsert(
            {
              user_id: currentUserId,
              endpoint,
              p256dh,
              auth,
              user_agent: navigator.userAgent,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'endpoint' }
          );

        if (dbError) {
          throw new Error(`Database upsert failed: ${dbError.message}`);
        }
      } else {
        // Fallback to internal API route
        const res = await fetch('/api/dashboard/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint,
            p256dh,
            auth,
            userId,
            userAgent: navigator.userAgent,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to save subscription');
        }
      }

      setSubscription(sub);
      setState('granted');
      return true;
    } catch (err: any) {
      console.error('[usePushNotification] Subscription failed:', err);
      setState('prompt');
      setError(err.message || 'Failed to subscribe to push notifications');
      return false;
    }
  };

  return {
    state,
    subscription,
    error,
    enableNotifications,
    isSupported: state !== 'unsupported',
    isGranted: state === 'granted',
    isDenied: state === 'denied',
    isSubscribing: state === 'subscribing',
  };
}
