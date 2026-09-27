import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { MapPin, Phone, ShieldAlert } from 'lucide-react-native';

export default function EmergencyModal({ visible, emergencyNumber = '112', onClose }) {
  const [sharingLocation, setSharingLocation] = useState(false);

  const shareLocation = async () => {
    setSharingLocation(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission requise', 'Activez la localisation pour pouvoir la partager aux secours.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coordinates = `${location.coords.latitude},${location.coords.longitude}`;
      await Share.share({
        title: 'Position d’urgence SHIFAA',
        message: `Ma position : https://maps.google.com/?q=${coordinates}\nJ’ai besoin d’une assistance médicale urgente.`,
      });
    } catch {
      Alert.alert('Localisation indisponible', 'Réessayez ou appelez directement les urgences.');
    } finally {
      setSharingLocation(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ShieldAlert size={48} color="#ba1a1a" />
          <Text style={styles.title}>URGENCE MÉDICALE</Text>
          <Text style={styles.text}>Une situation potentiellement grave a été détectée. Appelez les secours immédiatement.</Text>
          <TouchableOpacity style={styles.callButton} onPress={() => Linking.openURL(`tel:${emergencyNumber}`)}>
            <Phone size={20} color="#fff" />
            <Text style={styles.callText}>Appeler le {emergencyNumber}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.locationButton} onPress={shareLocation} disabled={sharingLocation}>
            {sharingLocation ? <ActivityIndicator color="#ba1a1a" /> : <MapPin size={20} color="#ba1a1a" />}
            <Text style={styles.locationText}>{sharingLocation ? 'Localisation…' : 'Partager ma position'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}><Text style={styles.close}>Je comprends, continuer le chat</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.6)' },
  card: { alignItems: 'center', gap: 16, padding: 28, borderRadius: 24, backgroundColor: '#fff' },
  title: { color: '#ba1a1a', fontSize: 21, fontWeight: '800' },
  text: { color: '#374151', fontSize: 16, lineHeight: 23, textAlign: 'center' },
  callButton: { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 10, padding: 15, borderRadius: 12, backgroundColor: '#ba1a1a' },
  callText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  locationButton: { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 10, padding: 14, borderWidth: 1, borderColor: '#ba1a1a', borderRadius: 12 },
  locationText: { color: '#ba1a1a', fontSize: 15, fontWeight: '700' },
  close: { color: '#4b5563', fontSize: 14, fontWeight: '600' },
});
