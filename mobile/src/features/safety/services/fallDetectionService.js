import { Accelerometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// THRESHOLDS
const SPIKE_THRESHOLD   = 11.0;  // m/s² above this = fall event
const DELAY_BEFORE_FIRE = 1200;  // ms after last spike before firing (lets motion settle)
const COOLDOWN_MS       = 8000;  // 8s between detections
const COUNTDOWN_SECONDS = 30;
const SENSOR_INTERVAL_MS = 50;

const FALL_EVENT_KEY = 'shifaa_fall_event';

let _subscription  = null;
let _isRunning     = false;
let _onFallDetected = null;
let _lastFallTime  = 0;
let _fireTimer     = null;  // debounce timer — fires DELAY_BEFORE_FIRE ms after last spike

const magnitude = ({ x, y, z }) => Math.sqrt(x * x + y * y + z * z);

export async function registerFallNotificationCategory() {
  await Notifications.setNotificationCategoryAsync('fall_check', [
    { identifier: 'im_ok',     buttonTitle: "I am OK",     options: { opensAppToForeground: false } },
    { identifier: 'need_help', buttonTitle: "I Need Help", options: { opensAppToForeground: true  } },
  ]);
}

function handleReading(data) {
  const mag = magnitude(data);
  const now = Date.now();

  if (mag > SPIKE_THRESHOLD) {
    // Each spike debounces the timer — fires 1.2s after the LAST spike
    if (_fireTimer) clearTimeout(_fireTimer);

    _fireTimer = setTimeout(() => {
      _fireTimer = null;
      if (now - _lastFallTime > COOLDOWN_MS) {
        _lastFallTime = Date.now();
        console.log('[FallDetection] FIRE! Peak was above ' + SPIKE_THRESHOLD);
        onFallConfirmed();
      }
    }, DELAY_BEFORE_FIRE);
  }
}

async function onFallConfirmed() {
  console.warn('[FallDetection] Sending notification...');
  try {
    const fallId = 'fall_' + Date.now();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'SHIFAA: Are you okay?',
        body: 'A possible fall was detected. Respond within 30 seconds.',
        sound: true,
        categoryIdentifier: 'fall_check',
        data: { type: 'fall_check', fallId },
      },
      trigger: null,
    });

    const emergencyNotifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'SHIFAA Emergency Alert',
        body: 'No response after a possible fall. Alerting emergency contacts.',
        sound: true,
        data: { type: 'fall_emergency', fallId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: COUNTDOWN_SECONDS,
        repeats: false,
      },
    });

    await AsyncStorage.setItem(FALL_EVENT_KEY, JSON.stringify({ fallId, emergencyNotifId, detectedAt: Date.now() }));

    if (_onFallDetected) _onFallDetected({ fallId, emergencyNotifId, countdownSeconds: COUNTDOWN_SECONDS });

  } catch (err) {
    console.error('[FallDetection] Notification error:', err);
  }
}

export async function resolveFallEvent() {
  try {
    const raw = await AsyncStorage.getItem(FALL_EVENT_KEY);
    if (!raw) return;
    const { emergencyNotifId } = JSON.parse(raw);
    await Notifications.cancelScheduledNotificationAsync(emergencyNotifId);
    await AsyncStorage.removeItem(FALL_EVENT_KEY);
  } catch (err) {
    console.error('[FallDetection] Resolve error:', err);
  }
}

export function setFallCallback(callback) {
  _onFallDetected = callback || null;
}

export function startFallDetection(onFallCallback) {
  _onFallDetected = onFallCallback || null;
  if (_isRunning) { console.log('[FallDetection] Already running'); return; }
  _isRunning = true;
  Accelerometer.setUpdateInterval(SENSOR_INTERVAL_MS);
  _subscription = Accelerometer.addListener(handleReading);
  console.log('[FallDetection] Started — threshold: ' + SPIKE_THRESHOLD + ' m/s2, delay: ' + DELAY_BEFORE_FIRE + 'ms');
}

export function stopFallDetection() {
  if (_fireTimer) { clearTimeout(_fireTimer); _fireTimer = null; }
  if (_subscription) { _subscription.remove(); _subscription = null; }
  _isRunning = false;
  _onFallDetected = null;
  console.log('[FallDetection] Stopped');
}

export const isFallDetectionRunning = () => _isRunning;
