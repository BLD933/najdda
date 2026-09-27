import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Alert, Platform, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/features/auth/context/AuthContext';
import profileService from '../../src/features/auth/services/profileService';
import { ChevronLeft, Save, Activity, Droplets, Heart, Phone, MapPin } from 'lucide-react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [constants, setConstants] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    chronicDiseases: ['None (Healthy)'],
    drugAllergies: ['None'],
    medications: [],
    weight: '',
    height: '',
    bloodType: '',
    smokingStatus: 'Non-smoker',
    alcoholStatus: 'Never',
    insuranceType: 'None / Self-Pay',
    preferredHospital: '',
    emergencyContacts: [{ name: '', relationship: '', phone: '' }],
  });

  const [medicationSearch, setMedicationSearch] = useState('');
  const [medicationResults, setMedicationResults] = useState([]);
  const [searchingMed, setSearchingMed] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const consts = await profileService.getConstants();
        setConstants(consts);
        if (user?.profile) {
          setFormData({
            chronicDiseases: user.profile.chronicDiseases?.split(', ') || ['None (Healthy)'],
            drugAllergies: user.profile.drugAllergies?.split(', ') || ['None'],
            medications: user.profile.medications || [],
            weight: user.profile.weight?.toString() || '',
            height: user.profile.height?.toString() || '',
            bloodType: user.profile.bloodType || '',
            smokingStatus: user.profile.smokingStatus || 'Non-smoker',
            alcoholStatus: user.profile.alcoholStatus || 'Never',
            insuranceType: user.profile.insuranceType || 'None / Self-Pay',
            preferredHospital: user.profile.preferredHospital || '',
            emergencyContacts: user.profile.emergencyContacts || [{ name: '', relationship: '', phone: '' }],
          });
        }
      } catch (e) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    if (medicationSearch.length < 3) {
      setMedicationResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearchingMed(true);
      try {
        const res = await fetch(`https://medicament-api.vercel.app/api/medicaments/search?keyword=${medicationSearch}`);
        const data = await res.json();
        setMedicationResults(Array.isArray(data) ? data.slice(0, 5) : []);
      } catch (e) {
        console.error(e);
      } finally {
        setSearchingMed(false);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [medicationSearch]);

  const handleMultiSelect = (field, value) => {
    setFormData(prev => {
      const current = prev[field];
      if (value.includes('None')) return { ...prev, [field]: [value] };
      let updated = current.filter(v => !v.includes('None'));
      if (updated.includes(value)) {
        updated = updated.filter(v => v !== value);
      } else {
        updated = [...updated, value];
      }
      if (updated.length === 0) {
        updated = [field === 'chronicDiseases' ? 'None (Healthy)' : 'None'];
      }
      return { ...prev, [field]: updated };
    });
  };

  const addMedication = (med) => {
    if (!formData.medications.find(m => m.id === med.id)) {
      setFormData(prev => ({ ...prev, medications: [...prev.medications, { ...med, frequency: 'Once a day' }] }));
    }
    setMedicationSearch('');
    setMedicationResults([]);
  };

  const removeMedication = (id) => {
    setFormData(prev => ({ ...prev, medications: prev.medications.filter(m => m.id !== id) }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      await profileService.updateProfile({
        ...formData,
        weight: parseInt(formData.weight) || null,
        height: parseInt(formData.height) || null,
      });
      await refreshUser();
      Alert.alert('Updated', 'Your medical profile has been updated.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      setError(e.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#191c1e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medical Passport</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Chronic Conditions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Activity size={18} color="#2563EB" />
            <Text style={styles.sectionTitle}>Chronic Conditions</Text>
          </View>
          <View style={styles.chipRow}>
            {constants?.medical.CHRONIC_CONDITIONS?.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, formData.chronicDiseases.includes(c) && styles.chipActive]}
                onPress={() => handleMultiSelect('chronicDiseases', c)}
              >
                <Text style={[styles.chipText, formData.chronicDiseases.includes(c) && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Drug Allergies */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Heart size={18} color="#EF4444" />
            <Text style={styles.sectionTitle}>Drug Allergies</Text>
          </View>
          <View style={styles.chipRow}>
            {constants?.medical.ALLERGIES?.DRUGS?.map(a => (
              <TouchableOpacity
                key={a}
                style={[styles.chip, formData.drugAllergies.includes(a) && styles.chipActive]}
                onPress={() => handleMultiSelect('drugAllergies', a)}
              >
                <Text style={[styles.chipText, formData.drugAllergies.includes(a) && styles.chipTextActive]}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Medications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Droplets size={18} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>Medications</Text>
          </View>
          <View style={styles.searchInputRow}>
            <TextInput
              style={styles.searchInput}
              value={medicationSearch}
              onChangeText={setMedicationSearch}
              placeholder="Search medication..."
              placeholderTextColor="#94A3B8"
            />
            {searchingMed && <ActivityIndicator size="small" color="#2563EB" />}
          </View>
          {medicationResults.map(med => (
            <TouchableOpacity key={med.id} style={styles.searchResult} onPress={() => addMedication(med)}>
              <View>
                <Text style={styles.searchResultText}>{med.nom}</Text>
                <Text style={styles.searchResultSub}>{med.dosage1}</Text>
              </View>
              <Text style={styles.addLabel}>+ Add</Text>
            </TouchableOpacity>
          ))}
          {formData.medications.map(med => (
            <View key={med.id} style={styles.medItem}>
              <View>
                <Text style={styles.medName}>{med.nom}</Text>
                <Text style={styles.medDosage}>{med.dosage1}</Text>
              </View>
              <TouchableOpacity onPress={() => removeMedication(med.id)}>
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Vitals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Activity size={18} color="#22C55E" />
            <Text style={styles.sectionTitle}>Vitals</Text>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Weight (kg)</Text>
              <TextInput style={styles.fieldInput} value={formData.weight} onChangeText={v => setFormData(p => ({ ...p, weight: v }))} placeholder="70" keyboardType="numeric" />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Height (cm)</Text>
              <TextInput style={styles.fieldInput} value={formData.height} onChangeText={v => setFormData(p => ({ ...p, height: v }))} placeholder="175" keyboardType="numeric" />
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#191c1e' },
  content: { flex: 1, padding: 16 },
  section: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#191c1e' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  chipTextActive: { color: '#FFFFFF' },
  row: { flexDirection: 'row' },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  fieldInput: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: '#191c1e', fontWeight: '500',
  },
  searchInputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingRight: 10,
  },
  searchInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#191c1e',
  },
  searchResult: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#E2E8F0', marginTop: 6,
  },
  searchResultText: { fontSize: 14, fontWeight: '700', color: '#191c1e' },
  searchResultSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  addLabel: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  medItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#E2E8F0', marginTop: 6,
  },
  medName: { fontSize: 14, fontWeight: '700', color: '#191c1e' },
  medDosage: { fontSize: 12, color: '#64748B' },
  removeText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  errorBox: { backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FCA5A5', marginBottom: 12 },
  errorText: { color: '#B91C1C', fontSize: 14, fontWeight: '600' },
  bottomBar: {
    padding: 16, paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 14,
  },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
});
