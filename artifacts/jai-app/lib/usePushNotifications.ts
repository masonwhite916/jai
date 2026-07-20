/**
 * usePushNotifications
 *
 * Handles the full Expo push notification lifecycle for both roles:
 *   1. Requests OS notification permission on first call.
 *   2. Retrieves the Expo push token and saves it to the server.
 *   3. Sets up a foreground notification handler (returns the notification
 *      so the caller can display an in-app banner).
 *   4. Listens for notification *responses* (user tapped a notification)
 *      and deep-links to the relevant screen.
 *
 * Safe on web — all expo-notifications APIs are no-ops there.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { apiFetch, getAuthToken } from './api';

// ── Foreground behaviour (show banner + play sound while app is open) ─────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
    shouldShowBanner: true,
    shouldShowList:   true,
  }),
});

// ── Android notification channel ──────────────────────────────────────────────
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('jobs', {
    name:               'Job Alerts',
    importance:         Notifications.AndroidImportance.MAX,
    vibrationPattern:   [0, 250, 250, 250],
    lightColor:         '#C21875',
    description:        'Technician job requests and customer status updates',
  });
}

// ── Permission + token registration ──────────────────────────────────────────
async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  await ensureAndroidChannel();

  // NotificationPermissionsStatus extends PermissionResponse which uses
  // a string `status` field ('granted' | 'denied' | 'undetermined').
  const existingPerms = await Notifications.getPermissionsAsync();
  let permStatus: string = (existingPerms as any).status ?? '';

  if (permStatus !== 'granted') {
    const newPerms = await Notifications.requestPermissionsAsync();
    permStatus = (newPerms as any).status ?? '';
  }

  if (permStatus !== 'granted') {
    console.log('[Push] Permission not granted');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      // For development builds / Expo Go, no projectId needed.
      // For standalone builds, add: projectId: Constants.expoConfig?.extra?.eas?.projectId
    });
    return tokenData.data;
  } catch (err) {
    console.log('[Push] Failed to get push token:', err);
    return null;
  }
}

// ── Deep-link router ──────────────────────────────────────────────────────────
function useNotificationRouter() {
  const router = useRouter();

  return useCallback((notification: Notifications.Notification) => {
    const data = notification.request.content.data as Record<string, unknown> | undefined;
    if (!data) return;

    const { screen, jobId, requestId } = data as {
      screen?: string;
      jobId?: number | string;
      requestId?: number | string;
    };

    try {
      switch (screen) {
        case 'job':
          if (jobId != null) router.push(`/job/${jobId}` as any);
          break;
        case 'tracking':
          router.push('/tracking' as any);
          break;
        case 'requests':
          router.push('/(tabs)/requests' as any);
          break;
        default:
          router.push('/(tabs)' as any);
      }
    } catch {
      // Silently ignore navigation errors (e.g. screen not mounted yet)
    }
  }, [router]);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface Options {
  /** Whether the user is authenticated with a server token (required for token upload) */
  isAuthenticated: boolean;
  /** Callback fired when a notification arrives while the app is in the foreground */
  onForegroundNotification?: (notification: Notifications.Notification) => void;
}

export function usePushNotifications({ isAuthenticated, onForegroundNotification }: Options) {
  const tokenUploadedRef      = useRef(false);
  const foregroundSub         = useRef<Notifications.Subscription | null>(null);
  const responseSub           = useRef<Notifications.Subscription | null>(null);
  const handleNavigation      = useNotificationRouter();

  // Register token and upload once the user is authenticated
  useEffect(() => {
    if (!isAuthenticated || tokenUploadedRef.current) return;
    if (Platform.OS === 'web') return;
    if (!getAuthToken()) return;

    (async () => {
      const token = await registerForPushNotifications();
      if (!token) return;

      try {
        await apiFetch('/api/users/me', {
          method: 'PUT',
          body:   JSON.stringify({ push_token: token }),
        });
        tokenUploadedRef.current = true;
        console.log('[Push] Token registered:', token.slice(0, 24) + '…');
      } catch {
        // Non-fatal — will retry on next app launch
        console.log('[Push] Failed to upload token to server');
      }
    })();
  }, [isAuthenticated]);

  // Foreground notification listener
  useEffect(() => {
    if (Platform.OS === 'web') return;

    foregroundSub.current = Notifications.addNotificationReceivedListener((notification) => {
      onForegroundNotification?.(notification);
    });

    return () => {
      foregroundSub.current?.remove();
    };
  }, [onForegroundNotification]);

  // Response listener (user tapped a notification — app was backgrounded or killed)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    responseSub.current = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNavigation(response.notification);
    });

    // Also handle the notification that launched the app from a killed state
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleNavigation(response.notification);
    }).catch(() => {});

    return () => {
      responseSub.current?.remove();
    };
  }, [handleNavigation]);

  // Reset upload flag on logout (so the next login re-uploads the token)
  const resetTokenFlag = useCallback(() => {
    tokenUploadedRef.current = false;
  }, []);

  return { resetTokenFlag };
}
