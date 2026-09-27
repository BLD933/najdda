import { Stack } from 'expo-router';
import { AuthProvider } from '../src/features/auth/context/AuthContext';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useCallback } from 'react';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { registerFallNotificationCategory, resolveFallEvent, startFallDetection } from '../src/features/safety/services/fallDetectionService';
import { triggerEmergencyAutomation } from '../src/features/chat/services/localFollowupService';
import AsyncStorage from '@react-native-async-storage/async-storage';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const onLayoutRootView = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    onLayoutRootView();
    // Auto-restart fall detection if it was active before app refresh
    AsyncStorage.getItem('shifaa_fall_protection_active').then(val => {
      if (val === 'true') {
        console.log('[Layout] Auto-restarting fall detection...');
        startFallDetection(null);
      }
    });
  }, []);

  return (
    <AuthProvider>
      <PushNotificationRegistration />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/register" />
        <Stack.Screen name="(onboarding)/complete-profile" />
        <Stack.Screen name="(main)/dashboard" options={{ animation: 'none' }} />
        <Stack.Screen name="(main)/triage-hub" options={{ animation: 'none' }} />
        <Stack.Screen name="(main)/orchestrator" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(main)/pregnancy" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(main)/triage" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(main)/settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(main)/follow-up-modal" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="(main)/fall-detection" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
    </AuthProvider>
  );
}

function PushNotificationRegistration() {
  const router = useRouter();
  useEffect(() => {
    const Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
    });

    // Register fall detection notification category (buttons on lock screen)
    registerFallNotificationCategory().catch(console.error);

    const handleNotificationResponse = async (response) => {
      const data           = response.notification.request.content.data;
      const actionId       = response.actionIdentifier;

      // ── FALL DETECTION responses ─────────────────────────────────────────
      if (data?.type === 'fall_check') {
        if (actionId === 'im_ok' || actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          // User tapped "I'm OK" from lock screen or opened the app
          await resolveFallEvent();
        } else if (actionId === 'need_help') {
          await resolveFallEvent();
          await triggerEmergencyAutomation('fall_detected', 'User requested help after fall detection');
        }
        return;
      }

      if (data?.type === 'fall_emergency') {
        // No response within 30s — emergency fires automatically
        await resolveFallEvent();
        await triggerEmergencyAutomation('fall_no_response', 'No response detected after fall');
        return;
      }

      // ── HEALTH CHECK-IN responses ─────────────────────────────────────────
      if (data?.type === 'follow_up') {
        router.push({
          pathname: '/(main)/follow-up-modal',
          params: { context: data.context, checkInId: data.checkInId || '' },
        });
        return;
      }

      if (data?.type === 'emergency_fallback') {
        router.push({
          pathname: '/(main)/follow-up-modal',
          params: { context: data.context, checkInId: data.checkInId || '', emergencyFallback: 'true' },
        });
        return;
      }

      const chatType = data?.chatType;
      if (['triage', 'pregnancy', 'allergy', 'children', 'medications'].includes(chatType)) {
        router.push({ pathname: `/(main)/${chatType}`, params: { followup: String(Date.now()) } });
      }
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleNotificationResponse(response);
    });
    return () => subscription.remove();
  }, [router]);
  return null;
}
