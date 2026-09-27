import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Linking,
  Alert,
  Share,
  Platform,
  Animated,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import {
  Phone,
  MapPin,
  ShieldAlert,
  Heart,
  Droplets,
  TriangleAlert,
  Hand,
  Activity,
  ChevronLeft,
  LifeBuoy,
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.75;
const CARD_MARGIN = 12;

export default function EmergencyScreen() {
  const router = useRouter();
  const [sharingLocation, setSharingLocation] = useState(false);
  const [isLocationShared, setIsLocationShared] = useState(true);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.7)).current;
  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // SOS button outer pulse loop
    Animated.loop(
      Animated.parallel([
        Animated.timing(pulseAnim, {
          toValue: 1.45,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Active indicator blink loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const callEmergency = () => {
    Linking.openURL('tel:911');
  };

  const triggerSOSAlert = async () => {
    try {
      Alert.alert(
        "Signal Emergency",
        "This will broadcast a high-priority SOS alert with your location and dial 911. Do you want to proceed?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Proceed", 
            style: "destructive", 
            onPress: async () => {
              if (isLocationShared) {
                await shareLocation();
              }
              callEmergency();
            }
          }
        ]
      );
    } catch {
      callEmergency();
    }
  };

  const shareLocation = async () => {
    setSharingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is needed to share your location.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = `${location.coords.latitude},${location.coords.longitude}`;
      const mapsUrl = Platform.OS === 'ios'
        ? `https://maps.apple.com/?q=${coords}`
        : `https://maps.google.com/?q=${coords}`;
      await Share.share({
        message: `🚨 EMERGENCY — My location: ${mapsUrl}\nI need immediate medical assistance.`,
        title: 'My Emergency Location',
      });
    } catch (err) {
      Alert.alert('Error', 'Could not get your location. Please call 911.');
    } finally {
      setSharingLocation(false);
    }
  };

  const handleCancelEmergency = () => {
    Alert.alert(
      "End Emergency Mode?",
      "This will stop sharing your location and notify contacts that you are safe.",
      [
        { text: "Back to Alert", style: "cancel" },
        { 
          text: "Confirm End", 
          style: "destructive", 
          onPress: () => {
            router.back();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Status Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ShieldAlert size={20} color="#ffffff" fill="#ffffff" />
          <Text style={styles.brandText}>SHIFAA</Text>
        </View>
        <View style={styles.activeBadge}>
          <Animated.View style={[styles.pulseDot, { opacity: blinkAnim }]} />
          <Text style={styles.activeText}>EMERGENCY ACTIVE</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* SOS Button Section */}
        <View style={styles.sosSection}>
          <View style={styles.buttonWrapper}>
            {/* Concentric Pulsing rings */}
            <Animated.View style={[
              styles.pulseRing, 
              { 
                transform: [{ scale: pulseAnim }], 
                opacity: pulseOpacity 
              }
            ]} />
            <TouchableOpacity 
              style={styles.sosButton}
              onPress={triggerSOSAlert}
              activeOpacity={0.8}
            >
              <View style={styles.buttonImageBg}>
                <Image 
                  source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOaffcqTDGfzSm_0_hpjMWH4WrAc7ywmVqiNPKQK9M6zQTlbQoMNE13_ohRfgM4vdODCYf5g0LLgmA2WgG7hcqqGJmnLd0S3tCBRt26HXriitY0omvF33I6TFFfZchQxbRF_04Xcupnjrf2rCSm0o7rRjpYEO6-vAdKB-Tw-yxmJMjnyjzsSC5lBwQreD1Zk0n6U_SkmwIU00Xg_R0PrpJcSJv8r4v2mPlNnFRTM83JAdT-9nJpkxkwh97eHnsXd0o2ulPkV_GL-E' }}
                  style={styles.cardiacWaves}
                />
              </View>
              <View style={styles.sosLabelContainer}>
                <Text style={styles.sosText}>SOS</Text>
                <Text style={styles.sosSubtext}>Tap to Signal</Text>
              </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.sosWarning}>
            Authorities and emergency contacts are being notified of your location.
          </Text>
        </View>

        {/* Controls Bento Grid */}
        <View style={styles.bentoGrid}>
          {/* Location Toggle */}
          <View style={styles.glassCard}>
            <View style={styles.cardRow}>
              <View style={styles.iconBox}>
                <MapPin size={20} color="#ffffff" fill="#ffffff" />
              </View>
              <View style={styles.cardDetails}>
                <Text style={styles.cardLabel}>Location Sharing</Text>
                <Text style={styles.cardValue}>{isLocationShared ? 'Active' : 'Disabled'}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.toggleBtn, isLocationShared ? styles.toggleBtnActive : styles.toggleBtnInactive]}
              onPress={() => setIsLocationShared(!isLocationShared)}
              activeOpacity={0.8}
            >
              <View style={[styles.toggleThumb, isLocationShared ? styles.thumbActive : styles.thumbInactive]} />
            </TouchableOpacity>
          </View>

          {/* Emergency Contacts status */}
          <View style={styles.glassCard}>
            <Text style={styles.contactsLabel}>Emergency Contacts</Text>
            <View style={styles.contactItem}>
              <View style={styles.contactAvatar}>
                <Text style={styles.avatarText}>MK</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>Mariam K. (Sister)</Text>
                <Text style={styles.contactStatusPulse}>Notifying...</Text>
              </View>
            </View>
            <View style={styles.contactItem}>
              <View style={styles.contactAvatar}>
                <Text style={styles.avatarText}>JD</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>Dr. James D.</Text>
                <Text style={styles.contactStatus}>Delivered</Text>
              </View>
            </View>
          </View>
        </View>

        {/* First Aid Snap Carousel */}
        <View style={styles.carouselSection}>
          <Text style={styles.sectionHeader}>
            <LifeBuoy size={18} color="#ffffff" style={{ marginRight: 6 }} /> Immediate First Aid
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
            snapToAlignment="center"
            decelerationRate="fast"
            contentContainerStyle={styles.carouselContainer}
          >
            {/* Step 1 */}
            <View style={styles.firstAidCard}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>STEP 1</Text>
              </View>
              <Text style={styles.stepTitle}>Check Airways</Text>
              <Text style={styles.stepDesc}>Ensure the patient is breathing and their airway is clear of any obstructions.</Text>
            </View>

            {/* Step 2 */}
            <View style={styles.firstAidCard}>
              <View style={[styles.stepBadge, styles.stepBadgeInactive]}>
                <Text style={styles.stepBadgeTextInactive}>STEP 2</Text>
              </View>
              <Text style={styles.stepTitle}>Apply Pressure</Text>
              <Text style={styles.stepDesc}>If there is heavy bleeding, apply firm, continuous pressure with a clean cloth.</Text>
            </View>

            {/* Step 3 */}
            <View style={styles.firstAidCard}>
              <View style={[styles.stepBadge, styles.stepBadgeInactive]}>
                <Text style={styles.stepBadgeTextInactive}>STEP 3</Text>
              </View>
              <Text style={styles.stepTitle}>Keep Warm</Text>
              <Text style={styles.stepDesc}>Cover the patient to prevent shock. Stay calm and wait for medical professionals.</Text>
            </View>
          </ScrollView>
        </View>

        <View style={{ height: 160 }} />
      </ScrollView>

      {/* Fixed bottom Cancel Action */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEmergency}>
          <Text style={styles.cancelText}>Cancel Emergency</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ba1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffdad6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ba1a1a',
    marginRight: 6,
  },
  activeText: {
    color: '#ba1a1a',
    fontSize: 10,
    fontWeight: '800',
  },
  content: {
    flex: 1,
  },
  sosSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  buttonWrapper: {
    width: 260,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 24,
  },
  pulseRing: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  sosButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  buttonImageBg: {
    position: 'absolute',
    inset: 0,
    opacity: 0.12,
  },
  cardiacWaves: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  sosLabelContainer: {
    alignItems: 'center',
  },
  sosText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#ba1a1a',
    letterSpacing: -1,
  },
  sosSubtext: {
    fontSize: 11,
    color: '#ba1a1a',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 2,
  },
  sosWarning: {
    color: '#ffffff',
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
    opacity: 0.9,
  },
  bentoGrid: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDetails: {
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '700',
    marginTop: 2,
  },
  toggleBtn: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  toggleBtnInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  thumbActive: {
    alignSelf: 'flex-end',
  },
  thumbInactive: {
    alignSelf: 'flex-start',
  },
  contactsLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    width: '100%',
    marginBottom: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  contactAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  contactInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  contactStatusPulse: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  contactStatus: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  carouselSection: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  carouselContainer: {
    gap: CARD_MARGIN * 2,
    paddingRight: 40,
  },
  firstAidCard: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffffff',
  },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 12,
  },
  stepBadgeInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepBadgeText: {
    color: '#ba1a1a',
    fontSize: 9,
    fontWeight: '800',
  },
  stepBadgeTextInactive: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  stepTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepDesc: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cancelText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
