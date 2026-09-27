import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVE_CHECKIN_KEY = 'shifaa_active_checkin';
const RESPONSE_WINDOW_MINUTES = 120; // 2 hours — if no response, emergency triggers

/**
 * Schedules a health check-in notification + emergency fallback.
 *
 * Timeline:
 *   T + followupMinutes       → "How are you feeling?" (Notification A)
 *   T + followupMinutes + 2h  → Emergency fallback (Notification B) if user never responds
 */
export async function scheduleLocalFollowup(chatType, title, message, context = '', followupMinutes) {
  const Notifications = require('expo-notifications');

  const { status: existing } = await Notifications.getPermissionsAsync();
  const finalStatus =
    existing === 'granted'
      ? existing
      : (await Notifications.requestPermissionsAsync()).status;

  if (finalStatus !== 'granted') {
    console.log('[CheckIn] Notification permission not granted.');
    return null;
  }

  const checkInId = `checkin_${Date.now()}`;
  const checkInSeconds = Math.max(1, Math.round(followupMinutes * 60));
  const emergencySeconds = checkInSeconds + RESPONSE_WINDOW_MINUTES * 60;

  console.log(`[CheckIn] Scheduling check-in in ${checkInSeconds}s for ${chatType}, emergency fallback in ${emergencySeconds}s.`);
  
  const displayTime = checkInSeconds < 60 ? `${checkInSeconds} second(s)` : `${Math.round(followupMinutes)} minute(s)`;
  
  const { Alert } = require('react-native');
  Alert.alert(
    "Active Monitoring", 
    `The AI Assistant will follow up with you in ${displayTime}.`
  );

  // Notification A: The health check-in
  const checkInNotifId = await Notifications.scheduleNotificationAsync({
    content: {
      title: title || '🩺 SHIFAA Health Check-In',
      body: message || 'How are you feeling?',
      sound: true,
      data: { type: 'follow_up', checkInId, context, chatType },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: checkInSeconds,
      repeats: false,
    },
  });

  // Notification B: Emergency fallback (2h after check-in notification fires)
  const emergencyNotifId = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🚨 SHIFAA — No Response',
      body: 'We noticed you did not respond to our check-in. Your emergency contact will be alerted.',
      sound: true,
      data: { type: 'emergency_fallback', checkInId, context, chatType },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: emergencySeconds,
      repeats: false,
    },
  });

  // Persist so it survives app restarts
  await AsyncStorage.setItem(
    ACTIVE_CHECKIN_KEY,
    JSON.stringify({ checkInId, checkInNotifId, emergencyNotifId, context, chatType, scheduledAt: Date.now() })
  );

  console.log(`[CheckIn] Scheduled — id: ${checkInId}, checkIn: ${checkInNotifId}, emergency: ${emergencyNotifId}`);
  return checkInId;
}

export async function scheduleCheckIn(followupMinutes, message, context = '') {
  return scheduleLocalFollowup('triage', '🩺 SHIFAA Health Check-In', message, context, followupMinutes);
}

/**
 * Resolves a check-in — cancels the emergency fallback notification.
 * Call when user taps "I feel fine" OR after manually triggering emergency on "Not Good".
 */
export async function resolveCheckIn(checkInId) {
  const Notifications = require('expo-notifications');

  try {
    const raw = await AsyncStorage.getItem(ACTIVE_CHECKIN_KEY);
    if (!raw) return;
    const stored = JSON.parse(raw);
    if (stored.checkInId !== checkInId) return;

    await Notifications.cancelScheduledNotificationAsync(stored.emergencyNotifId);
    await AsyncStorage.removeItem(ACTIVE_CHECKIN_KEY);
    console.log(`[CheckIn] Resolved — emergency fallback cancelled for ${checkInId}`);
  } catch (err) {
    console.error('[CheckIn] Error resolving check-in:', err);
  }
}

/**
 * Triggers the emergency automation.
 * TODO: Replace placeholder with your real n8n webhook URL when ready.
 */
export async function triggerEmergencyAutomation(reason, context = '') {
  console.warn(`[Emergency] Triggered! Reason: ${reason}. Context: "${context}"`);

  // TODO: Replace with real n8n webhook URL when ready
  const N8N_WEBHOOK_URL = null; // e.g. 'https://your-n8n.com/webhook/shifaa-emergency'

  if (!N8N_WEBHOOK_URL) {
    console.warn('[Emergency] No webhook URL configured yet. Skipping network call.');
    return;
  }

  try {
    await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, context, triggeredAt: new Date().toISOString() }),
    });
    console.log('[Emergency] Webhook sent successfully.');
  } catch (err) {
    console.error('[Emergency] Failed to send webhook:', err);
  }
}

