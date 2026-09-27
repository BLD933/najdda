import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  Switch, Alert, Animated, ScrollView,
} from 'react-native';
import { Accelerometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { ChevronLeft, ShieldAlert, Activity, CheckCircle, XCircle, Zap } from 'lucide-react-native';
import {
  startFallDetection,
  stopFallDetection,
  resolveFallEvent,
  isFallDetectionRunning,
  setFallCallback,
} from '../../src/features/safety/services/fallDetectionService';
import { triggerEmergencyAutomation } from '../../src/features/chat/services/localFollowupService';

const ACTIVE_KEY = 'shifaa_fall_protection_active';

export default function FallDetectionScreen() {
  const router  = useRouter();
  const [isActive, setIsActive]   = useState(() => isFallDetectionRunning());
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [lastEvent, setLastEvent] = useState(null);

  // Live sensor debug display
  const [sensorMag, setSensorMag]   = useState(0);
  const [peakMag, setPeakMag]       = useState(0);
  const [sensorState, setSensorState] = useState('OFF');
  const peakRef = useRef(0);
  const sensorSub = useRef(null);

  const countdownRef = useRef(null);
  const pulseAnim    = useRef(new Animated.Value(1)).current;

  // Live sensor display (independent of detection service, always shows raw values)
  useEffect(() => {
    Accelerometer.setUpdateInterval(100);
    sensorSub.current = Accelerometer.addListener(({ x, y, z }) => {
      const mag = Math.sqrt(x * x + y * y + z * z);
      setSensorMag(parseFloat(mag.toFixed(1)));
      if (mag > peakRef.current) {
        peakRef.current = mag;
        setPeakMag(parseFloat(mag.toFixed(1)));
      }
    });
    return () => { if (sensorSub.current) sensorSub.current.remove(); };
  }, []);

  // Restore active state from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_KEY).then(async val => {
      if (val === 'true' && !isFallDetectionRunning()) {
        setIsActive(true);
        startFallDetection(onFallDetected);
        await activateKeepAwakeAsync(); // restore screen-on if protection was active
      }
    });
  }, []);

  // Pulse animation
  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
    return () => pulseAnim.stopAnimation();
  }, [isActive]);

  // Countdown for modal
  useEffect(() => {
    if (showModal) {
      setCountdown(30);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            handleEmergency('no_response');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [showModal]);

  // Keep callback in sync with service
  useEffect(() => {
    setFallCallback(onFallDetected);
    return () => setFallCallback(null);
  }, []);

  const onFallDetected = (event) => {
    setShowModal(true);
    setLastEvent({ time: new Date().toLocaleTimeString() });
  };

  const toggleDetection = async (val) => {
    if (val) {
      setIsActive(true);
      startFallDetection(onFallDetected);
      await activateKeepAwakeAsync();          // keep screen ON so sensor keeps running
      await AsyncStorage.setItem(ACTIVE_KEY, 'true');
    } else {
      setIsActive(false);
      stopFallDetection();
      deactivateKeepAwake();                   // allow screen to lock normally
      setShowModal(false);
      await AsyncStorage.setItem(ACTIVE_KEY, 'false');
    }
  };

  const handleImOK = async () => {
    clearInterval(countdownRef.current);
    setShowModal(false);
    await resolveFallEvent();
  };

  const handleEmergency = async (reason = 'user_triggered') => {
    clearInterval(countdownRef.current);
    setShowModal(false);
    await resolveFallEvent();
    await triggerEmergencyAutomation(reason, 'Emergency from fall detection');
    Alert.alert('Emergency Alert', 'Your emergency contacts have been notified.');
  };

  const resetPeak = () => { peakRef.current = 0; setPeakMag(0); };

  // Get color based on magnitude
  const getMagColor = (m) => {
    if (m > 18) return '#EF4444';  // red = would trigger
    if (m > 12) return '#F59E0B';  // orange = getting close
    if (m > 9)  return '#10B981';  // green = normal
    return '#6B7280';              // gray = near free-fall
  };

  if (showModal) {
    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <ShieldAlert size={48} color="#EF4444" style={{ marginBottom: 16 }} />
          <Text style={styles.modalTitle}>Are you okay?</Text>
          <Text style={styles.modalSubtitle}>A possible fall was detected</Text>
          <View style={styles.countdownRing}>
            <Text style={styles.countdownNumber}>{countdown}</Text>
            <Text style={styles.countdownLabel}>seconds</Text>
          </View>
          <Text style={styles.countdownHint}>Emergency sends automatically if no response</Text>
          <TouchableOpacity style={styles.okBtn} onPress={handleImOK}>
            <CheckCircle size={22} color="#fff" />
            <Text style={styles.okBtnText}>I am OK</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.emergencyBtn} onPress={() => handleEmergency('user_triggered')}>
            <XCircle size={22} color="#fff" />
            <Text style={styles.emergencyBtnText}>I Need Help</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#5B21B6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fall Detection</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Status orb */}
        <View style={styles.statusCard}>
          <Animated.View style={[styles.statusOrb, isActive && styles.statusOrbActive, { transform: [{ scale: pulseAnim }] }]}>
            <ShieldAlert size={40} color={isActive ? '#fff' : '#94A3B8'} />
          </Animated.View>
          <Text style={[styles.statusText, isActive && styles.statusTextActive]}>
            {isActive ? 'Protection Active' : 'Protection Off'}
          </Text>
          <Text style={styles.statusSub}>
            {isActive ? 'Monitoring your movement at 20Hz' : 'Enable to detect falls automatically'}
          </Text>
        </View>

        {/* Toggle */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleLeft}>
            <Activity size={22} color="#5B21B6" />
            <View>
              <Text style={styles.toggleTitle}>Fall Detection</Text>
              <Text style={styles.toggleSub}>
                {isActive ? '🔆 Screen stays on for sensor access' : 'Saved — stays on after refresh'}
              </Text>
            </View>
          </View>
          <Switch
            value={isActive}
            onValueChange={toggleDetection}
            trackColor={{ false: '#E2E8F0', true: '#7C3AED' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* iOS warning — shown only when active */}
        {isActive && (
          <View style={styles.warningCard}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>Do not press the lock button</Text>
              <Text style={styles.warningBody}>
                iOS pauses apps when the screen is locked. Keep the screen on and place your phone face-up. The screen will not auto-lock while protection is active.
              </Text>
            </View>
          </View>
        )}

        {/* LIVE SENSOR PANEL — debug */}
        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <Zap size={16} color="#5B21B6" />
            <Text style={styles.sensorTitle}>Live Sensor Debug</Text>
            <TouchableOpacity onPress={resetPeak} style={styles.resetBtn}>
              <Text style={styles.resetTxt}>Reset Peak</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sensorRow}>
            <View style={styles.sensorBox}>
              <Text style={styles.sensorLabel}>Current</Text>
              <Text style={[styles.sensorValue, { color: getMagColor(sensorMag) }]}>
                {sensorMag} m/s²
              </Text>
            </View>
            <View style={styles.sensorBox}>
              <Text style={styles.sensorLabel}>Peak</Text>
              <Text style={[styles.sensorValue, { color: getMagColor(peakMag) }]}>
                {peakMag} m/s²
              </Text>
            </View>
          </View>

          <View style={styles.thresholdBar}>
            <Text style={styles.thresholdText}>Trigger threshold: 11 m/s²</Text>
            <View style={styles.barBg}>
              <View style={[styles.barFill, {
                width: Math.min((sensorMag / 40) * 100, 100) + '%',
                backgroundColor: getMagColor(sensorMag),
              }]} />
              <View style={styles.barMarker} />
            </View>
            <View style={styles.barLabels}>
              <Text style={styles.barLabel}>0</Text>
              <Text style={styles.barLabel}>▲ 11</Text>
              <Text style={styles.barLabel}>40</Text>
            </View>
          </View>

          <Text style={styles.sensorHint}>
            {peakMag > 11
              ? '✅ Peak above threshold — detection should fire!'
              : peakMag > 8
              ? '⚠️ Getting close — shake harder or throw up and catch'
              : '📱 Shake phone hard, then hold still'}
          </Text>
        </View>

        {/* Last event */}
        {lastEvent && (
          <View style={styles.lastEventCard}>
            <Text style={styles.lastEventLabel}>Last Detection</Text>
            <Text style={styles.lastEventTime}>{lastEvent.time}</Text>
          </View>
        )}

        {/* Test button */}
        {isActive && (
          <TouchableOpacity style={styles.testBtn} onPress={() => onFallDetected({})}>
            <Text style={styles.testBtnText}>🧪 Simulate Fall Alert</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#F5F3FF' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center' },
  headerTitle:     { fontSize: 18, fontWeight: '800', color: '#1E1B4B' },
  content:         { padding: 20, gap: 16 },

  statusCard:      { backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', shadowColor: '#5B21B6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  statusOrb:       { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  statusOrbActive: { backgroundColor: '#5B21B6' },
  statusText:      { fontSize: 20, fontWeight: '900', color: '#94A3B8', marginBottom: 6 },
  statusTextActive:{ color: '#5B21B6' },
  statusSub:       { fontSize: 13, color: '#6B7280', textAlign: 'center' },

  toggleCard:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  toggleLeft:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
  toggleTitle:     { fontSize: 16, fontWeight: '700', color: '#1E1B4B' },
  toggleSub:       { fontSize: 12, color: '#6B7280', marginTop: 2 },
  warningCard:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#FFF7ED', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FED7AA' },
  warningIcon:     { fontSize: 20, marginTop: 1 },
  warningTitle:    { fontSize: 13, fontWeight: '800', color: '#C2410C', marginBottom: 4 },
  warningBody:     { fontSize: 12, color: '#92400E', lineHeight: 18 },

  // Sensor debug panel
  sensorCard:      { backgroundColor: '#fff', borderRadius: 20, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
  sensorHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sensorTitle:     { fontSize: 14, fontWeight: '800', color: '#1E1B4B', flex: 1 },
  resetBtn:        { backgroundColor: '#EDE9FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  resetTxt:        { fontSize: 11, fontWeight: '700', color: '#5B21B6' },
  sensorRow:       { flexDirection: 'row', gap: 12, marginBottom: 14 },
  sensorBox:       { flex: 1, backgroundColor: '#F8F7FF', borderRadius: 14, padding: 14, alignItems: 'center' },
  sensorLabel:     { fontSize: 11, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  sensorValue:     { fontSize: 22, fontWeight: '900' },
  thresholdBar:    { marginBottom: 10 },
  thresholdText:   { fontSize: 11, color: '#6B7280', marginBottom: 6 },
  barBg:           { height: 10, backgroundColor: '#E5E7EB', borderRadius: 5, overflow: 'hidden', position: 'relative' },
  barFill:         { height: '100%', borderRadius: 5 },
  barMarker:       { position: 'absolute', left: '45%', top: 0, bottom: 0, width: 2, backgroundColor: '#EF4444' },
  barLabels:       { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  barLabel:        { fontSize: 10, color: '#9CA3AF' },
  sensorHint:      { fontSize: 12, color: '#374151', textAlign: 'center', marginTop: 4 },

  lastEventCard:   { backgroundColor: '#EDE9FE', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastEventLabel:  { fontSize: 13, fontWeight: '700', color: '#5B21B6' },
  lastEventTime:   { fontSize: 13, color: '#7C3AED', fontWeight: '600' },

  testBtn:         { backgroundColor: '#EDE9FE', borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#C4B5FD' },
  testBtnText:     { fontSize: 15, fontWeight: '700', color: '#5B21B6' },

  modalOverlay:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(91,33,182,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 999 },
  modalCard:       { backgroundColor: '#fff', borderRadius: 28, padding: 32, width: '100%', alignItems: 'center' },
  modalTitle:      { fontSize: 28, fontWeight: '900', color: '#1E1B4B', marginBottom: 6, textAlign: 'center' },
  modalSubtitle:   { fontSize: 15, color: '#6B7280', marginBottom: 28, textAlign: 'center' },
  countdownRing:   { width: 120, height: 120, borderRadius: 60, borderWidth: 6, borderColor: '#EF4444', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  countdownNumber: { fontSize: 40, fontWeight: '900', color: '#EF4444' },
  countdownLabel:  { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
  countdownHint:   { fontSize: 12, color: '#94A3B8', marginBottom: 28, textAlign: 'center' },
  okBtn:           { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#10B981', borderRadius: 100, paddingVertical: 16, paddingHorizontal: 32, width: '100%', justifyContent: 'center', marginBottom: 12 },
  okBtnText:       { fontSize: 17, fontWeight: '800', color: '#fff' },
  emergencyBtn:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EF4444', borderRadius: 100, paddingVertical: 16, paddingHorizontal: 32, width: '100%', justifyContent: 'center' },
  emergencyBtnText:{ fontSize: 17, fontWeight: '800', color: '#fff' },
});
