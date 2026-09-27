import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThumbsUp, AlertTriangle, PhoneCall, MessageSquare } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { useAuth } from '../../src/features/auth/context/AuthContext';
import { resolveCheckIn, triggerEmergencyAutomation } from '../../src/features/chat/services/localFollowupService';

export default function FollowUpModalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const contextMsg = params.context || "No context provided";
  const checkInId = params.checkInId || null;
  const isEmergencyFallback = params.emergencyFallback === 'true';
  
  const { user } = useAuth();
  
  // If triggered by no-response timeout, jump straight to emergency screen
  const [step, setStep] = useState(isEmergencyFallback ? 'EMERGENCY' : 'CHECK');
  
  const handleGood = async () => {
    // Cancel the emergency fallback — user is fine!
    if (checkInId) await resolveCheckIn(checkInId);
    router.back();
  };
  
  const handleNotGood = async () => {
    // Cancel the fallback (we're handling it right now) and trigger emergency
    if (checkInId) await resolveCheckIn(checkInId);
    await triggerEmergencyAutomation('not_good', contextMsg);
    setStep('EMERGENCY');
  };
  
  const handleCallSamu = () => {
    Linking.openURL('tel:15');
  };
  
  const handleAlertContact = () => {
    const contacts = user?.profile?.emergencyContacts;
    if (!contacts || contacts.length === 0 || !contacts[0].phone) {
      Alert.alert('No Emergency Contact', 'Please add an emergency contact in your profile settings.');
      return;
    }
    
    Alert.alert(
      'Emergency Alert Initiated',
      `An alert has been triggered for your emergency contact (${contacts[0].name}). They will receive your context soon.`,
      [{ text: 'Understood', onPress: () => router.back() }]
    );
  };

  
  if (step === 'EMERGENCY') {
    return (
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
            <AlertTriangle size={32} color="#DC2626" />
          </View>
          
          <Text style={styles.title}>We're here to help</Text>
          <Text style={styles.subtitle}>
            Since you're not feeling well, please choose an option below.
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#DC2626' }]} onPress={handleCallSamu}>
              <PhoneCall size={20} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Call Emergency (15)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#004ac6' }]} onPress={handleAlertContact}>
              <MessageSquare size={20} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Alert Emergency Contact</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.modalBox}>
        <Text style={styles.title}>How are you feeling?</Text>
        <Text style={styles.subtitle}>
          We are checking up on you regarding your recent concern.
        </Text>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.goodBtn} onPress={handleGood}>
            <ThumbsUp size={24} color="#16A34A" />
            <Text style={styles.goodBtnText}>I feel fine</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.badBtn} onPress={handleNotGood}>
            <AlertTriangle size={24} color="#DC2626" />
            <Text style={styles.badBtnText}>Not good</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  goodBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
    paddingVertical: 20,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  goodBtnText: {
    color: '#16A34A',
    fontWeight: '700',
    fontSize: 16,
  },
  badBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 20,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  badBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
