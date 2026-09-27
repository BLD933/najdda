import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Linking,
  Switch,
  StatusBar,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/features/auth/context/AuthContext';
import profileService from '../../src/features/auth/services/profileService';
import {
  User, MapPin, Droplets, Activity, ChevronLeft, ChevronRight, Save,
  ChevronDown, X, Heart, ShieldAlert, Shield, Plus, Trash2, Info, Globe
} from 'lucide-react-native';

const TOTAL_STEPS = 4;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_MAP = {
  January: '01', February: '02', March: '03', April: '04', May: '05', June: '06',
  July: '07', August: '08', September: '09', October: '10', November: '11', December: '12',
};

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

const generateDays = (month, year) => {
  const m = MONTHS.indexOf(month);
  if (m === -1 || !year) return Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const daysInMonth = new Date(parseInt(year), m + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
};

const PickerModal = ({ visible, options, selected, onSelect, onClose, title }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={20} color="#7b7485" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={options}
          keyExtractor={(item) => item}
          showsVerticalScrollIndicator={false}
          initialNumToRender={20}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.modalOption, selected === item && styles.modalOptionActive]}
              onPress={() => { onSelect(item); onClose(); }}
            >
              <Text style={[styles.modalOptionText, selected === item && styles.modalOptionTextActive]}>
                {item}
              </Text>
              {selected === item && (
                <View style={styles.modalCheckCircle}>
                  <Text style={styles.modalCheckMark}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      </View>
    </TouchableOpacity>
  </Modal>
);

const StepIndicator = ({ currentStep }) => {
  const steps = [
    { num: 1, label: 'Identity' },
    { num: 2, label: 'Health' },
    { num: 3, label: 'Medical' },
    { num: 4, label: 'Emergency' },
  ];

  return (
    <View style={styles.stepsContainer}>
      <View style={styles.progressLineBg} />
      <View 
        style={[
          styles.progressLineActive, 
          { width: `${((currentStep - 1) / (TOTAL_STEPS - 1)) * 100}%` }
        ]} 
      />
      {steps.map((step, index) => {
        const isActive = currentStep === step.num;
        const isCompleted = currentStep > step.num;
        return (
          <View key={step.num} style={styles.stepWrapper}>
            <View style={[
              styles.stepCircle, 
              isActive && styles.stepCircleActive,
              isCompleted && styles.stepCircleCompleted
            ]}>
              {isCompleted ? (
                <Text style={styles.stepCircleCompletedText}>✓</Text>
              ) : (
                <Text style={[styles.stepCircleText, isActive && styles.stepCircleTextActive]}>
                  {step.num}
                </Text>
              )}
            </View>
            <Text style={[
              styles.stepLabel, 
              isActive && styles.stepLabelActive,
              isCompleted && styles.stepLabelCompleted
            ]}>
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const InputField = ({ label, value, onChangeText, placeholder, keyboardType, onFocus, onBlur, isFocused }) => (
  <View style={styles.fieldGroup}>
    <Text style={[styles.fieldLabel, isFocused && styles.fieldLabelFocused]}>{label}</Text>
    <View style={[styles.inputRow, isFocused && styles.inputRowFocused]}>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#7b7485"
        keyboardType={keyboardType}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </View>
  </View>
);

const PickerField = ({ label, value, onPress, placeholder, isFocused }) => (
  <View style={styles.fieldGroup}>
    <Text style={[styles.fieldLabel, isFocused && styles.fieldLabelFocused]}>{label}</Text>
    <TouchableOpacity 
      style={[styles.pickerButton, isFocused && styles.pickerButtonFocused]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <Text style={[styles.pickerText, !value && styles.pickerPlaceholder]}>
        {value || placeholder}
      </Text>
      <ChevronDown size={16} color="#7b7485" />
    </TouchableOpacity>
  </View>
);

const SmallPicker = ({ value, onPress, placeholder, flex }) => (
  <TouchableOpacity
    style={[styles.smallPicker, flex ? { flex } : {}]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.smallPickerText, !value && { color: '#7b7485' }]} numberOfLines={1}>
      {value || placeholder}
    </Text>
    <ChevronDown size={12} color="#7b7485" />
  </TouchableOpacity>
);

const MultiSelectField = ({ label, value, options, field, onMultiSelect }) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.chipRow}>
      {options.map(opt => {
        const isSelected = value.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, isSelected && styles.chipActive]}
            onPress={() => onMultiSelect(field, opt)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [constants, setConstants] = useState(null);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [focusedField, setFocusedField] = useState(null);
  const fadeAnim = useState(new Animated.Value(1))[0];

  const [formData, setFormData] = useState({
    countryCode: '+212',
    phoneNumber: '',
    dobDay: '',
    dobMonth: '',
    dobYear: '',
    gender: '',
    bloodType: '',
    country: 'Morocco',
    city: '',
    preferredLanguage: 'Arabic',
    weight: '',
    height: '',
    isPregnant: false,
    drugAllergies: ['None'],
    chronicDiseases: ['None (Healthy)'],
    smokingStatus: 'Non-smoker',
    alcoholStatus: 'Never',
    insuranceType: 'None / Self-Pay',
    medications: [],
    preferredHospital: '',
    latitude: null,
    longitude: null,
    emergencyContacts: [{ name: '', relationship: '', phone: '' }],
  });

  const [medicationSearch, setMedicationSearch] = useState('');
  const [medicationResults, setMedicationResults] = useState([]);
  const [searchingMed, setSearchingMed] = useState(false);

  const [hospitalSearch, setHospitalSearch] = useState('');
  const [hospitalResults, setHospitalResults] = useState([]);
  const [searchingHospitals, setSearchingHospitals] = useState(false);

  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showCountryCodePicker, setShowCountryCodePicker] = useState(false);
  const [showBloodTypePicker, setShowBloodTypePicker] = useState(false);
  const [showSmokingPicker, setShowSmokingPicker] = useState(false);
  const [showInsurancePicker, setShowInsurancePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showRelationshipPicker, setShowRelationshipPicker] = useState(null);

  const days = generateDays(formData.dobMonth, formData.dobYear);

  useEffect(() => {
    const fetchConstants = async () => {
      try {
        const data = await profileService.getConstants();
        setConstants(data);
      } catch (err) {
        setError('Failed to load form options');
      } finally {
        setLoading(false);
      }
    };
    fetchConstants();
  }, []);

  useEffect(() => {
    if (medicationSearch.length < 3) {
      setMedicationResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearchingMed(true);
      try {
        const res = await fetch(`https://medicament-api.vercel.app/api/medicaments/search?keyword=${medicationSearch}`);
        const json = await res.json();
        setMedicationResults(Array.isArray(json) ? json.slice(0, 5) : []);
      } catch (err) {
        console.error('Medication search error:', err);
      } finally {
        setSearchingMed(false);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [medicationSearch]);

  useEffect(() => {
    if (hospitalSearch.length < 2) {
      setHospitalResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearchingHospitals(true);
      try {
        const cityQuery = formData.city ? `, ${formData.city}` : '';
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(hospitalSearch + ' hospital' + cityQuery)}&format=json&limit=7`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const json = await res.json();
        const results = Array.isArray(json)
          ? json.map((p, i) => ({
              id: p.place_id || i,
              name: p.display_name.split(',')[0],
              address: p.display_name.split(',').slice(1, 3).join(',').trim(),
            }))
          : [];
        setHospitalResults(results);
      } catch (err) {
        console.error('Hospital search error:', err);
      } finally {
        setSearchingHospitals(false);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [hospitalSearch, formData.city]);

  const fetchNearbyHospitals = async () => {
    if (!formData.city && !formData.latitude) return;
    setSearchingHospitals(true);
    try {
      let query = `hospital+${encodeURIComponent(formData.city || '')}`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=10`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const json = await res.json();
      const results = Array.isArray(json)
        ? json.filter(p => p.display_name).map((p, i) => ({
            id: p.place_id || i,
            name: p.display_name.split(',')[0],
            address: p.display_name.split(',').slice(1, 3).join(',').trim(),
          }))
        : [];
      setHospitalResults(results);
    } catch (err) {
      console.error('Nearby hospitals error:', err);
    } finally {
      setSearchingHospitals(false);
    }
  };

  const animateStep = (next) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setCurrentStep(next);
  };

  const addMedication = (med) => {
    if (!formData.medications.find(m => m.id === med.id)) {
      setFormData(prev => ({
        ...prev,
        medications: [...prev.medications, { ...med, frequency: 'Once a day' }],
      }));
    }
    setMedicationSearch('');
    setMedicationResults([]);
  };

  const removeMedication = (id) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter(m => m.id !== id),
    }));
  };

  const handleMultiSelect = (field, value) => {
    setFormData(prev => {
      const current = prev[field];
      if (value.includes('None')) {
        return { ...prev, [field]: [value] };
      }
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

  const handleContactChange = (index, field, value) => {
    const newContacts = [...formData.emergencyContacts];
    newContacts[index][field] = value;
    setFormData({ ...formData, emergencyContacts: newContacts });
  };

  const addContact = () => {
    setFormData({
      ...formData,
      emergencyContacts: [...formData.emergencyContacts, { name: '', relationship: '', phone: '' }],
    });
  };

  const removeContact = (index) => {
    if (formData.emergencyContacts.length > 1) {
      setFormData({
        ...formData,
        emergencyContacts: formData.emergencyContacts.filter((_, i) => i !== index),
      });
    }
  };

  const [gpsLoading, setGpsLoading] = useState(false);
  const [locationName, setLocationName] = useState('');

  const reverseGeocode = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data?.address) {
        const addr = data.address;
        const parts = [];
        if (addr.neighbourhood) parts.push(addr.neighbourhood);
        if (addr.suburb) parts.push(addr.suburb);
        if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
        if (addr.state) parts.push(addr.state);
        if (addr.country) parts.push(addr.country);
        const readable = parts.join(', ');
        setLocationName(readable || data.display_name?.split(',').slice(0, 3).join(', ') || `${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        const detectedCity = addr.city || addr.town || addr.village || '';
        if (detectedCity && !formData.city) {
          setFormData(prev => ({ ...prev, city: detectedCity }));
        }
        return;
      }
    } catch (e) {
      console.error('Reverse geocode error:', e);
    }
    setLocationName(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
  };

  const handleGPS = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsLoading(false);
        Alert.alert(
          'Location Permission Needed',
          'SHIFAA uses your location to find nearby hospitals and emergency services. Please enable location access in Settings.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Go to Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setFormData(prev => ({ ...prev, latitude: loc.coords.latitude, longitude: loc.coords.longitude }));
      await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
    } catch (err) {
      setError('Failed to get location. Please try again.');
    } finally {
      setGpsLoading(false);
    }
  };

  const getDateOfBirth = () => {
    if (formData.dobDay && formData.dobMonth && formData.dobYear) {
      const m = MONTH_MAP[formData.dobMonth];
      const d = formData.dobDay.padStart(2, '0');
      return `${formData.dobYear}-${m}-${d}`;
    }
    return '';
  };

  const validateStep = () => {
    setError('');
    if (currentStep === 1) {
      if (!formData.phoneNumber) { setError('Phone number is required'); return false; }
      if (!formData.dobDay || !formData.dobMonth || !formData.dobYear) { setError('Date of birth is required'); return false; }
      if (!formData.gender) { setError('Gender is required'); return false; }
      if (!formData.city) { setError('City is required'); return false; }
    }
    if (currentStep === 2) {
      if (!formData.weight) { setError('Weight is required'); return false; }
      if (!formData.height) { setError('Height is required'); return false; }
      if (!formData.bloodType) { setError('Blood type is required'); return false; }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      animateStep(Math.min(currentStep + 1, TOTAL_STEPS));
    }
  };

  const prevStep = () => {
    animateStep(Math.max(currentStep - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    setError('');
    try {
      const fullPhoneNumber = `${formData.countryCode} ${formData.phoneNumber}`;
      const payload = {
        phoneNumber: fullPhoneNumber,
        dateOfBirth: getDateOfBirth(),
        gender: formData.gender,
        bloodType: formData.bloodType,
        city: formData.city,
        country: formData.country,
        preferredLanguage: formData.preferredLanguage,
        weight: formData.weight ? parseInt(formData.weight) : null,
        height: formData.height ? parseInt(formData.height) : null,
        isPregnant: formData.isPregnant,
        drugAllergies: formData.drugAllergies,
        chronicDiseases: formData.chronicDiseases,
        smokingStatus: formData.smokingStatus,
        alcoholStatus: formData.alcoholStatus,
        insuranceType: formData.insuranceType,
        medications: formData.medications,
        preferredHospital: formData.preferredHospital,
        latitude: formData.latitude,
        longitude: formData.longitude,
        emergencyContacts: formData.emergencyContacts,
      };

      await profileService.updateProfile(payload);
      await refreshUser();
      router.replace('/(main)/dashboard');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to update profile';
      const missing = err.response?.data?.missingFields;
      setError(missing ? `${errMsg}: ${missing.join(', ')}` : errMsg);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fbf8ff' }}>
        <ActivityIndicator size="large" color="#420093" />
      </SafeAreaView>
    );
  }

  const countryCodes = constants?.geography.COUNTRY_CODES || [];
  const moroccanCities = constants?.geography.MOROCCAN_CITIES || [];
  const genders = constants?.medical.GENDERS || ['Male', 'Female'];
  const bloodTypes = constants?.medical.BLOOD_TYPES || ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const smokingOptions = constants?.medical.LIFESTYLE?.SMOKING || ['Non-smoker', 'Smoker', 'Former smoker'];
  const insuranceOptions = constants?.medical.INSURANCE_MOROCCO || ['AMO', 'CNOPS', 'Private', 'None / Self-Pay'];
  const relationships = constants?.medical.RELATIONSHIPS || ['Father', 'Mother', 'Spouse', 'Brother', 'Sister', 'Son', 'Daughter', 'Friend', 'Other'];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View>
            <View style={styles.stepIntro}>
              <View style={styles.stepIconBox}>
                <User size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.stepIntroTitle}>Welcome to Shifaa</Text>
              <Text style={styles.stepIntroSub}>Let's start with the basics to personalize your health dashboard.</Text>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, focusedField === 'phone' && styles.fieldLabelFocused]}>Phone Number</Text>
                <View style={[styles.phoneRow, focusedField === 'phone' && styles.inputRowFocused]}>
                  <TouchableOpacity
                    style={styles.codePicker}
                    onPress={() => setShowCountryCodePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.codePickerText}>{formData.countryCode}</Text>
                    <ChevronDown size={14} color="#7b7485" />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.phoneInput}
                    value={formData.phoneNumber}
                    onChangeText={v => setFormData(p => ({ ...p, phoneNumber: v }))}
                    placeholder="600-000000"
                    placeholderTextColor="#7b7485"
                    keyboardType="phone-pad"
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Date of Birth</Text>
                <View style={styles.dobRow}>
                  <SmallPicker value={formData.dobDay} onPress={() => setShowDayPicker(true)} placeholder="Day" flex={1} />
                  <SmallPicker value={formData.dobMonth} onPress={() => setShowMonthPicker(true)} placeholder="Month" flex={2} />
                  <SmallPicker value={formData.dobYear} onPress={() => setShowYearPicker(true)} placeholder="Year" flex={1.5} />
                </View>
              </View>

              <PickerField 
                label="Gender" 
                value={formData.gender} 
                onPress={() => setShowGenderPicker(true)} 
                placeholder="Select gender" 
                isFocused={showGenderPicker} 
              />
              {formData.gender === 'Female' && (
                <View style={styles.pregnancyRow}>
                  <Text style={styles.pregnancyLabel}>Are you currently pregnant?</Text>
                  <Switch
                    value={formData.isPregnant}
                    onValueChange={(value) => setFormData(p => ({ ...p, isPregnant: value }))}
                    trackColor={{ false: '#eeecf8', true: '#712ae2' }}
                    thumbColor={'#FFFFFF'}
                  />
                </View>
              )}
              <PickerField label="Country" value={formData.country} onPress={() => {}} />
              {formData.country === 'Morocco' ? (
                <PickerField 
                  label="City" 
                  value={formData.city} 
                  onPress={() => setShowCityPicker(true)} 
                  placeholder="Select city" 
                  isFocused={showCityPicker} 
                />
              ) : (
                <InputField 
                  label="City" 
                  value={formData.city} 
                  onChangeText={v => setFormData(p => ({ ...p, city: v }))} 
                  placeholder="City name" 
                  isFocused={focusedField === 'city'} 
                  onFocus={() => setFocusedField('city')} 
                  onBlur={() => setFocusedField(null)} 
                />
              )}
            </View>
          </View>
        );

      case 2:
        return (
          <View>
            <View style={styles.stepIntro}>
              <View style={[styles.stepIconBox, { backgroundColor: '#712ae2' }]}>
                <Heart size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.stepIntroTitle}>Vitals & Biology</Text>
              <Text style={styles.stepIntroSub}>This data helps our AI provide accurate triage and medical insights.</Text>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <InputField 
                    label="Weight (kg)" 
                    value={formData.weight} 
                    onChangeText={v => setFormData(p => ({ ...p, weight: v }))} 
                    placeholder="70" 
                    keyboardType="numeric" 
                    isFocused={focusedField === 'weight'} 
                    onFocus={() => setFocusedField('weight')} 
                    onBlur={() => setFocusedField(null)} 
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <InputField 
                    label="Height (cm)" 
                    value={formData.height} 
                    onChangeText={v => setFormData(p => ({ ...p, height: v }))} 
                    placeholder="175" 
                    keyboardType="numeric" 
                    isFocused={focusedField === 'height'} 
                    onFocus={() => setFocusedField('height')} 
                    onBlur={() => setFocusedField(null)} 
                  />
                </View>
              </View>

              <PickerField 
                label="Blood Type" 
                value={formData.bloodType} 
                onPress={() => setShowBloodTypePicker(true)} 
                placeholder="Select blood type" 
                isFocused={showBloodTypePicker} 
              />
              <PickerField 
                label="Smoking Status" 
                value={formData.smokingStatus} 
                onPress={() => setShowSmokingPicker(true)} 
                placeholder="Select smoking status" 
                isFocused={showSmokingPicker} 
              />
              <PickerField 
                label="Insurance Type" 
                value={formData.insuranceType} 
                onPress={() => setShowInsurancePicker(true)} 
                placeholder="Select insurance" 
                isFocused={showInsurancePicker} 
              />
            </View>
          </View>
        );

      case 3:
        return (
          <View>
            <View style={styles.stepIntro}>
              <View style={[styles.stepIconBox, { backgroundColor: '#420093' }]}>
                <Droplets size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.stepIntroTitle}>Medical History</Text>
              <Text style={styles.stepIntroSub}>Identify existing conditions to ensure safe emergency response.</Text>
            </View>

            <View style={styles.sectionCard}>
              {constants?.medical.ALLERGIES?.DRUGS && (
                <MultiSelectField label="Drug Allergies" value={formData.drugAllergies} options={constants.medical.ALLERGIES.DRUGS} field="drugAllergies" onMultiSelect={handleMultiSelect} />
              )}
              {constants?.medical.CHRONIC_CONDITIONS && (
                <MultiSelectField label="Chronic Conditions" value={formData.chronicDiseases} options={constants.medical.CHRONIC_CONDITIONS} field="chronicDiseases" onMultiSelect={handleMultiSelect} />
              )}

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Medications</Text>
                <View style={[styles.inputRow, focusedField === 'medication' && styles.inputRowFocused]}>
                  <TextInput
                    style={styles.fieldInput}
                    value={medicationSearch}
                    onChangeText={setMedicationSearch}
                    placeholder="Search medication..."
                    placeholderTextColor="#7b7485"
                    onFocus={() => setFocusedField('medication')}
                    onBlur={() => setFocusedField(null)}
                  />
                  {searchingMed && <ActivityIndicator size="small" color="#420093" style={{ marginRight: 8 }} />}
                </View>
                {medicationResults.map(med => (
                  <TouchableOpacity key={med.id} style={styles.searchResult} onPress={() => addMedication(med)} activeOpacity={0.7}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.searchResultText}>{med.nom}</Text>
                      <Text style={styles.searchResultSub}>{med.forme} - {med.dosage1}</Text>
                    </View>
                    <Text style={styles.addLabel}>+ Add</Text>
                  </TouchableOpacity>
                ))}
                {formData.medications.map(med => (
                  <View key={med.id} style={styles.medItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.medName}>{med.nom}</Text>
                      <Text style={styles.medDosage}>{med.dosage1}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeMedication(med.id)}>
                      <Text style={styles.removeText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {formData.medications.length === 0 && !medicationSearch && (
                  <Text style={styles.emptyHint}>No medications added yet.</Text>
                )}
              </View>

              {/* Encryption Notice */}
              <View style={styles.encryptionCard}>
                <Shield size={18} color="#005438" />
                <Text style={styles.encryptionText}>
                  Your medical data is encrypted with AES-256 and only shared with emergency responders during an active SOS event.
                </Text>
              </View>
            </View>
          </View>
        );

      case 4:
        return (
          <View>
            <View style={styles.stepIntro}>
              <View style={[styles.stepIconBox, { backgroundColor: '#005438' }]}>
                <MapPin size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.stepIntroTitle}>Safety Shield</Text>
              <Text style={styles.stepIntroSub}>Configure your immediate circle and smart safety features.</Text>
            </View>

            <View style={styles.sectionCard}>
              {/* Location Card */}
              <View style={[styles.locationCard, formData.latitude && styles.locationCardActive]}>
                <View style={styles.locationHeader}>
                  <MapPin size={20} color={formData.latitude ? '#420093' : '#7b7485'} />
                  <Text style={[styles.locationTitle, formData.latitude && { color: '#420093' }]}>
                    {formData.latitude ? 'Location Saved' : 'Your Location'}
                  </Text>
                </View>
                {formData.latitude ? (
                  <View style={styles.locationDetails}>
                    <Text style={styles.locationName}>{locationName}</Text>
                    <TouchableOpacity onPress={handleGPS} style={styles.relocateBtn}>
                      <Text style={styles.relocateBtnText}>Update</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.locationHint}>
                    Save your location to find nearby hospitals
                  </Text>
                )}
              </View>

              <TouchableOpacity style={styles.gpsButton} onPress={handleGPS} activeOpacity={0.8} disabled={gpsLoading}>
                {gpsLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <MapPin size={18} color="#FFFFFF" />
                )}
                <Text style={styles.gpsButtonText}>
                  {gpsLoading ? 'Getting location...' : 'Save My Current Location'}
                </Text>
              </TouchableOpacity>

              {/* Hospital Search */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Preferred Hospital</Text>
                <View style={[styles.inputRow, focusedField === 'hospital' && styles.inputRowFocused]}>
                  <TextInput
                    style={styles.fieldInput}
                    value={hospitalSearch}
                    onChangeText={setHospitalSearch}
                    placeholder={formData.city ? `Search hospital in ${formData.city}...` : 'Search hospital...'}
                    placeholderTextColor="#7b7485"
                    onFocus={() => setFocusedField('hospital')}
                    onBlur={() => setFocusedField(null)}
                  />
                  {searchingHospitals && <ActivityIndicator size="small" color="#420093" style={{ marginRight: 8 }} />}
                </View>
                {!hospitalSearch && formData.city && (
                  <TouchableOpacity style={styles.nearbyBtn} onPress={fetchNearbyHospitals} activeOpacity={0.7}>
                    <MapPin size={14} color="#420093" />
                    <Text style={styles.nearbyBtnText}>Show hospitals near {formData.city}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {formData.preferredHospital && (
                <View style={styles.selectedHospital}>
                  <Text style={styles.selectedHospitalLabel}>Selected</Text>
                  <Text style={styles.selectedHospitalName}>{formData.preferredHospital}</Text>
                  <TouchableOpacity onPress={() => setFormData(p => ({ ...p, preferredHospital: '' }))}>
                    <Text style={styles.changeText}>Change</Text>
                  </TouchableOpacity>
                </View>
              )}

              {hospitalResults.map(h => (
                <TouchableOpacity
                  key={h.id}
                  style={[styles.hospitalResult, formData.preferredHospital === h.name && styles.hospitalResultActive]}
                  onPress={() => { setFormData(p => ({ ...p, preferredHospital: h.name })); setHospitalSearch(''); setHospitalResults([]); }}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.hospitalName}>{h.name}</Text>
                    <Text style={styles.hospitalAddress}>{h.address}</Text>
                  </View>
                  {formData.preferredHospital === h.name && (
                    <View style={styles.modalCheckCircle}><Text style={styles.modalCheckMark}>✓</Text></View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.fieldLabel}>Emergency Contacts</Text>
                <TouchableOpacity onPress={addContact}>
                  <View style={styles.addContactBtn}>
                    <Plus size={14} color="#420093" />
                    <Text style={styles.addContactBtnText}>Add</Text>
                  </View>
                </TouchableOpacity>
              </View>
              {formData.emergencyContacts.map((contact, index) => (
                <View key={index} style={styles.contactCard}>
                  <View style={styles.contactCardHeader}>
                    <View style={styles.contactIndex}>
                      <Text style={styles.contactIndexText}>{index + 1}</Text>
                    </View>
                    {formData.emergencyContacts.length > 1 && (
                      <TouchableOpacity onPress={() => removeContact(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Trash2 size={16} color="#ba1a1a" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={styles.contactInput}
                    value={contact.name}
                    onChangeText={v => handleContactChange(index, 'name', v)}
                    placeholder="Full name"
                    placeholderTextColor="#7b7485"
                  />
                  <TouchableOpacity
                    style={styles.contactPickerBtn}
                    onPress={() => setShowRelationshipPicker(index)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.contactPickerText, !contact.relationship && { color: '#7b7485' }]}>
                      {contact.relationship || 'Relationship'}
                    </Text>
                    <ChevronDown size={14} color="#7b7485" />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.contactInput}
                    value={contact.phone}
                    onChangeText={v => handleContactChange(index, 'phone', v)}
                    placeholder="Phone number"
                    placeholderTextColor="#7b7485"
                    keyboardType="phone-pad"
                  />
                </View>
              ))}
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
        {/* Decorative Atmospheric Glows */}
        <View style={styles.glowTopLeft} />
        <View style={styles.glowBottomRight} />

        {/* Custom Header Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Text style={styles.brandName}>SHIFAA</Text>
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity style={styles.languageBtn}>
              <Globe size={14} color="#420093" />
              <Text style={styles.languageText}>AR/EN</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Step Indicator Progress */}
        <StepIndicator currentStep={currentStep} />

        {/* Main Form content scrollview */}
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <View style={styles.errorBox}>
              <ShieldAlert size={18} color="#ba1a1a" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <Animated.View style={{ opacity: fadeAnim }}>
            {renderStepContent()}
          </Animated.View>
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Navigation Action Footer */}
        <View style={styles.bottomBar}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.backBtn} onPress={prevStep} activeOpacity={0.7}>
              <ChevronLeft size={18} color="#4a4453" />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          {currentStep < TOTAL_STEPS ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={nextStep} activeOpacity={0.8}>
              <Text style={styles.primaryBtnText}>Next Step</Text>
              <ChevronRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]} 
              onPress={handleSubmit} 
              disabled={submitting} 
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Save size={18} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Complete Setup</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      <PickerModal visible={showGenderPicker} options={genders} selected={formData.gender} onSelect={v => setFormData(p => ({ ...p, gender: v }))} onClose={() => setShowGenderPicker(false)} title="Select Gender" />
      <PickerModal visible={showBloodTypePicker} options={bloodTypes} selected={formData.bloodType} onSelect={v => setFormData(p => ({ ...p, bloodType: v }))} onClose={() => setShowBloodTypePicker(false)} title="Select Blood Type" />
      <PickerModal visible={showSmokingPicker} options={smokingOptions} selected={formData.smokingStatus} onSelect={v => setFormData(p => ({ ...p, smokingStatus: v }))} onClose={() => setShowSmokingPicker(false)} title="Select Smoking Status" />
      <PickerModal visible={showInsurancePicker} options={insuranceOptions} selected={formData.insuranceType} onSelect={v => setFormData(p => ({ ...p, insuranceType: v }))} onClose={() => setShowInsurancePicker(false)} title="Select Insurance Type" />
      <PickerModal visible={showCityPicker} options={moroccanCities} selected={formData.city} onSelect={v => setFormData(p => ({ ...p, city: v }))} onClose={() => setShowCityPicker(false)} title="Select City" />
      <PickerModal visible={showDayPicker} options={days} selected={formData.dobDay} onSelect={v => setFormData(p => ({ ...p, dobDay: v }))} onClose={() => setShowDayPicker(false)} title="Select Day" />
      <PickerModal visible={showMonthPicker} options={MONTHS} selected={formData.dobMonth} onSelect={v => setFormData(p => ({ ...p, dobMonth: v }))} onClose={() => setShowMonthPicker(false)} title="Select Month" />
      <PickerModal visible={showYearPicker} options={YEARS} selected={formData.dobYear} onSelect={v => setFormData(p => ({ ...p, dobYear: v }))} onClose={() => setShowYearPicker(false)} title="Select Year" />

      <Modal visible={showCountryCodePicker} transparent animationType="slide" onRequestClose={() => setShowCountryCodePicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCountryCodePicker(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Country Code</Text>
              <TouchableOpacity onPress={() => setShowCountryCodePicker(false)}>
                <X size={20} color="#7b7485" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={countryCodes}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalOption, formData.countryCode === item.code && styles.modalOptionActive]}
                  onPress={() => { setFormData(p => ({ ...p, countryCode: item.code })); setShowCountryCodePicker(false); }}
                >
                  <Text style={[styles.modalOptionText, formData.countryCode === item.code && styles.modalOptionTextActive]}>
                    {item.country} ({item.code})
                  </Text>
                  {formData.countryCode === item.code && (
                    <View style={styles.modalCheckCircle}><Text style={styles.modalCheckMark}>✓</Text></View>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {showRelationshipPicker !== null && (
        <PickerModal
          visible={showRelationshipPicker !== null}
          options={relationships}
          selected={formData.emergencyContacts[showRelationshipPicker]?.relationship}
          onSelect={v => handleContactChange(showRelationshipPicker, 'relationship', v)}
          onClose={() => setShowRelationshipPicker(null)}
          title="Select Relationship"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fbf8ff',
    position: 'relative',
  },
  glowTopLeft: {
    position: 'absolute',
    top: -120,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(66, 0, 147, 0.04)',
    zIndex: 0,
  },
  glowBottomRight: {
    position: 'absolute',
    bottom: -120,
    right: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(113, 42, 226, 0.04)',
    zIndex: 0,
  },
  topBar: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 24, 
    paddingVertical: 16, 
    backgroundColor: '#ffffff',
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(204, 195, 214, 0.2)',
    zIndex: 10,
  },
  topBarLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10 
  },
  brandName: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#420093',
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif-condensed',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eeecf8',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(123, 116, 133, 0.12)',
  },
  languageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#420093',
  },
  stepsContainer: {
    flexDirection: 'row', 
    paddingHorizontal: 24, 
    paddingVertical: 18,
    backgroundColor: '#ffffff', 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(204, 195, 214, 0.2)',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    zIndex: 10,
  },
  progressLineBg: {
    position: 'absolute',
    top: 31,
    left: 40,
    right: 40,
    height: 3,
    backgroundColor: '#eeecf8',
    borderRadius: 99,
  },
  progressLineActive: {
    position: 'absolute',
    top: 31,
    left: 40,
    height: 3,
    backgroundColor: '#420093',
    borderRadius: 99,
  },
  stepWrapper: { 
    alignItems: 'center', 
    width: 60,
    position: 'relative',
    zIndex: 15,
  },
  stepCircle: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    backgroundColor: '#eeecf8', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  stepCircleActive: { 
    backgroundColor: '#420093',
    borderColor: '#ffffff',
    shadowColor: '#420093',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  stepCircleCompleted: {
    backgroundColor: '#4edea3',
  },
  stepCircleText: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#7b7485' 
  },
  stepCircleTextActive: { 
    color: '#ffffff' 
  },
  stepCircleCompletedText: {
    color: '#005438',
    fontWeight: '800',
    fontSize: 12,
  },
  stepLabel: { 
    fontSize: 10, 
    fontWeight: '600', 
    color: '#7b7485', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },
  stepLabelActive: { 
    color: '#420093',
    fontWeight: '700',
  },
  stepLabelCompleted: {
    color: '#005438',
  },
  content: { 
    flex: 1, 
    padding: 20,
    zIndex: 10,
  },
  stepIntro: { 
    alignItems: 'center', 
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  stepIconBox: { 
    width: 52, 
    height: 52, 
    borderRadius: 16, 
    backgroundColor: '#420093', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 12, 
    shadowColor: '#420093', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 8, 
    elevation: 4 
  },
  stepIntroTitle: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#420093', 
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif-condensed',
  },
  stepIntroSub: { 
    fontSize: 14, 
    color: '#4a4453', 
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionCard: { 
    backgroundColor: '#ffffff', 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(204, 195, 214, 0.2)', 
    shadowColor: 'rgba(91, 33, 182, 0.04)', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.8, 
    shadowRadius: 16, 
    elevation: 2 
  },
  fieldGroup: { 
    marginBottom: 20 
  },
  fieldLabel: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: '#4a4453', 
    textTransform: 'uppercase', 
    letterSpacing: 1, 
    marginBottom: 8 
  },
  fieldLabelFocused: {
    color: '#420093',
  },
  inputRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ffffff', 
    borderWidth: 1, 
    borderColor: '#ccc3d6', 
    borderRadius: 16,
    height: 54,
  },
  inputRowFocused: {
    borderColor: '#420093',
    borderWidth: 1.5,
  },
  fieldInput: { 
    flex: 1, 
    paddingHorizontal: 16, 
    fontSize: 15, 
    color: '#1a1b23', 
    fontWeight: '500',
    height: '100%',
  },
  pickerButton: { 
    backgroundColor: '#ffffff', 
    borderWidth: 1, 
    borderColor: '#ccc3d6', 
    borderRadius: 16, 
    paddingHorizontal: 16, 
    height: 54,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  pickerButtonFocused: {
    borderColor: '#420093',
    borderWidth: 1.5,
  },
  pickerText: { 
    fontSize: 15, 
    color: '#1a1b23', 
    fontWeight: '500' 
  },
  pickerPlaceholder: { 
    color: '#7b7485', 
    fontWeight: '400' 
  },
  pregnancyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 4,
  },
  pregnancyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a4453',
  },
  phoneRow: { 
    flexDirection: 'row', 
    gap: 8,
    borderWidth: 0,
  },
  codePicker: { 
    backgroundColor: '#ffffff', 
    borderWidth: 1, 
    borderColor: '#ccc3d6', 
    borderRadius: 16, 
    paddingHorizontal: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4,
    height: 54,
  },
  codePickerText: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#1a1b23' 
  },
  phoneInput: { 
    flex: 1, 
    backgroundColor: '#ffffff', 
    borderWidth: 1, 
    borderColor: '#ccc3d6', 
    borderRadius: 16, 
    paddingHorizontal: 16, 
    height: 54,
    fontSize: 15, 
    color: '#1a1b23', 
    fontWeight: '500' 
  },
  dobRow: { 
    flexDirection: 'row', 
    gap: 8 
  },
  smallPicker: { 
    backgroundColor: '#ffffff', 
    borderWidth: 1, 
    borderColor: '#ccc3d6', 
    borderRadius: 16, 
    paddingHorizontal: 10, 
    height: 54,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    gap: 4 
  },
  smallPickerText: { 
    fontSize: 14, 
    color: '#1a1b23', 
    fontWeight: '500' 
  },
  row: { 
    flexDirection: 'row' 
  },
  chipRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8 
  },
  chip: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 999, 
    borderWidth: 1, 
    borderColor: '#ccc3d6', 
    backgroundColor: '#ffffff' 
  },
  chipActive: { 
    backgroundColor: '#420093', 
    borderColor: '#420093' 
  },
  chipText: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#4a4453' 
  },
  chipTextActive: { 
    color: '#ffffff' 
  },
  searchResult: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#ffffff', 
    padding: 12, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(204, 195, 214, 0.4)', 
    marginTop: 6 
  },
  searchResultText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#1a1b23' 
  },
  searchResultSub: { 
    fontSize: 12, 
    color: '#4a4453', 
    marginTop: 2 
  },
  addLabel: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#420093' 
  },
  medItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#eeecf8', 
    padding: 12, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(204, 195, 214, 0.2)', 
    marginTop: 6 
  },
  medName: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#1a1b23' 
  },
  medDosage: { 
    fontSize: 12, 
    color: '#4a4453' 
  },
  removeText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#ba1a1a' 
  },
  emptyHint: { 
    fontSize: 13, 
    color: '#7b7485', 
    fontStyle: 'italic', 
    marginTop: 8 
  },
  encryptionCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(78, 222, 163, 0.1)',
    borderWidth: 1,
    borderColor: '#4edea3',
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    alignItems: 'center',
  },
  encryptionText: {
    flex: 1,
    color: '#005438',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  gpsButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    backgroundColor: '#420093', 
    height: 54, 
    borderRadius: 16, 
    marginTop: 4,
    shadowColor: '#420093',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  gpsButtonText: { 
    color: '#FFFFFF', 
    fontSize: 14, 
    fontWeight: '700' 
  },
  locationCard: { 
    backgroundColor: '#ffffff', 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#ccc3d6', 
    padding: 16, 
    marginBottom: 16 
  },
  locationCardActive: { 
    borderColor: '#420093', 
    backgroundColor: 'rgba(66, 0, 147, 0.02)' 
  },
  locationHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 8 
  },
  locationTitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#4a4453' 
  },
  locationDetails: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    paddingLeft: 28 
  },
  locationName: { 
    fontSize: 14, 
    color: '#420093', 
    fontWeight: '600', 
    flex: 1 
  },
  locationHint: { 
    fontSize: 13, 
    color: '#7b7485', 
    paddingLeft: 28 
  },
  relocateBtn: { 
    backgroundColor: '#ffffff', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#ccc3d6' 
  },
  relocateBtnText: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#420093' 
  },
  nearbyBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    marginTop: 8, 
    paddingVertical: 6 
  },
  nearbyBtnText: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#420093' 
  },
  selectedHospital: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    backgroundColor: 'rgba(66, 0, 147, 0.05)', 
    padding: 12, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(66, 0, 147, 0.15)', 
    marginBottom: 8 
  },
  selectedHospitalLabel: { 
    fontSize: 10, 
    fontWeight: '800', 
    color: '#420093', 
    textTransform: 'uppercase', 
    letterSpacing: 1 
  },
  selectedHospitalName: { 
    flex: 1, 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#1a1b23' 
  },
  changeText: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#ba1a1a' 
  },
  hospitalResult: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ffffff', 
    padding: 14, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#ccc3d6', 
    marginBottom: 6, 
    gap: 8 
  },
  hospitalResultActive: { 
    borderColor: '#420093', 
    backgroundColor: 'rgba(66, 0, 147, 0.02)' 
  },
  hospitalName: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#1a1b23' 
  },
  hospitalAddress: { 
    fontSize: 12, 
    color: '#7b7485', 
    marginTop: 2 
  },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  addContactBtn: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(66, 0, 147, 0.05)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 10 
  },
  addContactBtnText: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#420093' 
  },
  contactCard: { 
    backgroundColor: '#eeecf8', 
    borderWidth: 1, 
    borderColor: 'rgba(204, 195, 214, 0.2)', 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 12, 
    gap: 10 
  },
  contactCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactIndex: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    backgroundColor: '#ffffff', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc3d6',
  },
  contactIndexText: { 
    fontSize: 12, 
    fontWeight: '800', 
    color: '#420093' 
  },
  contactInput: { 
    backgroundColor: '#ffffff', 
    borderWidth: 1, 
    borderColor: '#ccc3d6', 
    borderRadius: 12, 
    paddingHorizontal: 14, 
    height: 48, 
    fontSize: 14, 
    color: '#1a1b23' 
  },
  contactPickerBtn: { 
    backgroundColor: '#ffffff', 
    borderWidth: 1, 
    borderColor: '#ccc3d6', 
    borderRadius: 12, 
    paddingHorizontal: 14, 
    height: 48, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  contactPickerText: { 
    fontSize: 14, 
    color: '#1a1b23' 
  },
  errorBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    backgroundColor: '#ffdad6', 
    padding: 14, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#ba1a1a', 
    marginBottom: 16 
  },
  errorText: { 
    color: '#ba1a1a', 
    fontSize: 14, 
    fontWeight: '600', 
    flex: 1 
  },
  bottomBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#ffffff', 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(204, 195, 214, 0.2)',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    zIndex: 10,
  },
  backBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingVertical: 12, 
    paddingHorizontal: 18, 
    borderRadius: 16, 
    backgroundColor: '#eeecf8' 
  },
  backBtnText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#4a4453' 
  },
  primaryBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: '#420093', 
    paddingVertical: 13, 
    paddingHorizontal: 24, 
    borderRadius: 16, 
    shadowColor: '#420093', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 8, 
    elevation: 4 
  },
  primaryBtnText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#ffffff' 
  },
  submitBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    backgroundColor: '#005438', 
    paddingVertical: 13, 
    paddingHorizontal: 24, 
    borderRadius: 16, 
    shadowColor: '#005438', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 8, 
    elevation: 4 
  },
  // Modal
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: '#ffffff', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    maxHeight: '60%', 
    paddingBottom: Platform.OS === 'ios' ? 34 : 20 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eeecf8' 
  },
  modalTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#420093' 
  },
  modalOption: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#fbf8ff' 
  },
  modalOptionActive: { 
    backgroundColor: 'rgba(66, 0, 147, 0.05)' 
  },
  modalOptionText: { 
    fontSize: 16, 
    color: '#1a1b23', 
    fontWeight: '500' 
  },
  modalOptionTextActive: { 
    color: '#420093', 
    fontWeight: '700' 
  },
  modalCheckCircle: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    backgroundColor: '#420093', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalCheckMark: { 
    color: '#ffffff', 
    fontSize: 14, 
    fontWeight: '700' 
  },
});
