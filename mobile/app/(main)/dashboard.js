import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  Platform,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/features/auth/context/AuthContext';
import { isFallDetectionRunning } from '../../src/features/safety/services/fallDetectionService';
import {
  Settings,
  ShieldAlert,
  ShieldCheck,
  MapPin,
  Phone,
  Bot,
  HeartPulse,
  Egg,
  LayoutDashboard,
  FileText,
  Stethoscope,
  Activity,
  Brain,
  Globe,
  Plus,
  ArrowRight,
  Shield,
  Bell,
  Heart,
  Scale,
  LogOut,
} from 'lucide-react-native';

export default function DashboardScreen() {
  const { user, logout, isProfileComplete } = useAuth();
  const router = useRouter();
  const [fallActive, setFallActive] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setFallActive(isFallDetectionRunning());
    }, [])
  );

  useEffect(() => {
    if (!isProfileComplete) {
      router.replace('/(onboarding)/complete-profile');
    }
  }, []);

  const getBMI = () => {
    if (user?.profile?.weight && user?.profile?.height) {
      return (user.profile.weight / Math.pow(user.profile.height/100, 2)).toFixed(1);
    }
    return '--';
  };

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out of Shifaa?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          style: "destructive", 
          onPress: () => {
            logout();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  const renderChronicBadge = (condition, index) => {
    const cleanCond = condition.trim();
    if (!cleanCond || cleanCond.toLowerCase().includes('none')) return null;
    
    const isAllergy = cleanCond.toLowerCase().includes('allergy') || cleanCond.toLowerCase().includes('egg') || cleanCond.toLowerCase().includes('nut') || cleanCond.toLowerCase().includes('penicillin');
    const isHypertension = cleanCond.toLowerCase().includes('hyper') || cleanCond.toLowerCase().includes('blood') || cleanCond.toLowerCase().includes('heart') || cleanCond.toLowerCase().includes('diabetes');
    
    let bgColor = 'rgba(113, 42, 226, 0.08)'; // secondary background
    let textColor = '#712ae2'; 
    let IconComponent = Stethoscope;

    if (isAllergy) {
      bgColor = 'rgba(0, 84, 56, 0.08)'; // tertiary background
      textColor = '#005438';
      IconComponent = Egg;
    } else if (isHypertension) {
      bgColor = 'rgba(66, 0, 147, 0.08)'; // primary background
      textColor = '#420093';
      IconComponent = HeartPulse;
    }

    return (
      <View key={index} style={[styles.badge, { backgroundColor: bgColor }]}>
        <IconComponent size={14} color={textColor} style={styles.badgeIcon} />
        <Text style={[styles.badgeText, { color: textColor }]}>{cleanCond}</Text>
      </View>
    );
  };

  // Up to 2 medications from user profile or fallbacks
  const getMedicationReminders = () => {
    const profileMeds = user?.profile?.medications || [];
    if (profileMeds.length > 0) {
      return profileMeds.slice(0, 2).map((m, idx) => ({
        id: m.id || idx,
        name: m.nom,
        sub: `10:30 AM • ${m.dosage1 || '1 Capsule'}`
      }));
    }
    return [
      { id: 1, name: 'Vitamin D Complex', sub: '10:30 AM • 1 Capsule' },
      { id: 2, name: 'Annual Checkup', sub: 'Tomorrow • 09:00 AM' }
    ];
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Decorative atmospheric glows */}
      <View style={styles.glowTopLeft} />
      <View style={styles.glowBottomRight} />

      {/* TopAppBar */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <TouchableOpacity style={styles.avatarBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBq2UDPGL_HpD7gf_Gvr3cgdeZYvaydkO4FTKWAbWpCH4jLxynH_awhbodB_N_qtcP28xelo5OzK0YN5kzuT4nNfK-68AB3AItshbApyry2Vv2L8IkkPWs_cq87VmBC0kUtc0he4XDFLJUTsRq6FzxmrNTaPDVK-t0LE1ll0lva4lrXNz0lGPuRi5_cpjkhA270-4bwx86EuarCYF7Xmai4n9_QC8Ooed_LCZf34aOuQ6_jsXHVBWgdDw465lEr_vJBWz8C4ZDkkA' }}
              style={styles.avatarImage}
            />
          </TouchableOpacity>
          <View style={styles.brandContainer}>
            <Text style={styles.brandName}>SHIFAA</Text>
            <Text style={styles.greetingText}>Hello, {user?.fullName?.split(' ')[0] || 'Sami'} 👋</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.languageBtn}>
            <Globe size={14} color="#420093" />
            <Text style={styles.languageText}>AR/EN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/(main)/settings')}>
            <Settings size={20} color="#4a4453" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Dashboard Canvas */}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Emergency SOS Bar */}
        <TouchableOpacity 
          style={styles.sosBanner} 
          onPress={() => router.push('/(main)/emergency')}
          activeOpacity={0.9}
        >
          <View style={styles.sosLeft}>
            <View style={styles.sosIconCircle}>
              <ShieldAlert size={24} color="#ffffff" />
            </View>
            <View style={styles.sosTextWrapper}>
              <Text style={styles.sosTitle}>Press for Instant Emergency Assist</Text>
              <Text style={styles.sosSubtitle}>First responders notified in 3.4 seconds</Text>
            </View>
          </View>
          <ArrowRight size={20} color="#ffffff" />
        </TouchableOpacity>

        {/* Bento Style Hero Cards */}
        <View style={styles.bentoContainer}>
          {/* Fall Detection Bento Card */}
          <TouchableOpacity
            style={styles.fallBento}
            onPress={() => router.push('/(main)/fall-detection')}
            activeOpacity={0.95}
          >
            <View style={styles.fallBentoHeader}>
              <View style={styles.fallIconContainer}>
                <Shield size={24} color="#ffffff" />
              </View>
              <View style={styles.activePill}>
                <View style={[styles.activeDot, fallActive && styles.activeDotPulse]} />
                <Text style={styles.activePillText}>{fallActive ? 'ACTIVE' : 'INACTIVE'}</Text>
              </View>
            </View>
            
            <View style={styles.fallBentoContent}>
              <Text style={styles.bentoTitle}>Fall Detection</Text>
              <Text style={styles.bentoDescription}>Continuous 20Hz Safeguard monitoring your biomechanics in real-time.</Text>
            </View>

            <View style={styles.fallStatusRow}>
              <View style={styles.statusMiniBox}>
                <Text style={styles.miniLabel}>Stability</Text>
                <Text style={styles.miniVal}>{fallActive ? '98.2%' : '--'}</Text>
              </View>
              <View style={styles.statusMiniBox}>
                <Text style={styles.miniLabel}>Sync</Text>
                <Text style={styles.miniVal}>{fallActive ? '12ms' : '--'}</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* AI Triage Bento Card */}
          <TouchableOpacity 
            style={styles.triageBento} 
            onPress={() => router.replace('/(main)/triage-hub')}
            activeOpacity={0.9}
          >
            <View style={styles.triageBentoHeader}>
              <View style={styles.triageIconContainer}>
                <Bot size={26} color="#ffffff" />
              </View>
              <Text style={styles.triageLabel}>AI Medical Triage</Text>
            </View>

            <View style={styles.triageBentoContent}>
              <Text style={styles.triageBentoTitle}>Feeling Unwell?</Text>
              <Text style={styles.triageBentoSub}>Talk to Dr. SHIFAA for instant clinical check and health routing.</Text>
            </View>

            <View style={styles.consultLinkRow}>
              <Text style={styles.consultText}>Start Consultation</Text>
              <ArrowRight size={16} color="#420093" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Biometric Vitals Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Biometric Vitals</Text>
          <TouchableOpacity onPress={() => router.push('/(main)/settings')}>
            <Text style={styles.sectionLink}>View History</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.vitalsContainer}>
          {/* Heart Rate Card */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalCardHeader}>
              <Heart size={20} color="#ba1a1a" fill="#ba1a1a" />
              <Text style={styles.vitalTime}>Just now</Text>
            </View>
            <Text style={styles.vitalName}>Heart Rate</Text>
            <View style={styles.vitalValRow}>
              <Text style={styles.vitalLargeText}>72</Text>
              <Text style={styles.vitalUnitText}>BPM</Text>
            </View>
            {/* Waveform graphic */}
            <View style={styles.waveformContainer}>
              <View style={[styles.waveBar, { height: '35%' }]} />
              <View style={[styles.waveBar, { height: '50%' }]} />
              <View style={[styles.waveBar, { height: '80%' }]} />
              <View style={[styles.waveBar, { height: '40%' }]} />
              <View style={[styles.waveBar, { height: '60%' }]} />
              <View style={[styles.waveBar, { height: '75%' }]} />
              <View style={[styles.waveBar, { height: '45%' }]} />
              <View style={[styles.waveBar, { height: '65%' }]} />
              <View style={[styles.waveBar, { height: '30%' }]} />
            </View>
          </View>

          {/* BMI Card */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalCardHeader}>
              <Scale size={20} color="#712ae2" />
              <Text style={styles.vitalTime}>Weekly Sync</Text>
            </View>
            <Text style={styles.vitalName}>BMI Index</Text>
            <View style={styles.vitalValRow}>
              <Text style={styles.vitalLargeText}>{getBMI() !== '--' ? getBMI() : '24.2'}</Text>
              <View style={styles.optimalBadge}>
                <Text style={styles.optimalText}>Optimal</Text>
              </View>
            </View>
            <View style={styles.bmiGoalContainer}>
              <Text style={styles.bmiGoalText}>Target: 22.5 • Stable</Text>
            </View>
          </View>

          {/* Reminders Card */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalCardHeader}>
              <Bell size={20} color="#420093" />
              <View style={styles.upcomingBadge}>
                <Text style={styles.upcomingText}>2 Active</Text>
              </View>
            </View>
            <Text style={styles.vitalName}>Reminders</Text>
            
            <View style={styles.remindersList}>
              {getMedicationReminders().map((reminder) => (
                <View key={reminder.id} style={styles.reminderItem}>
                  <View style={styles.reminderDot} />
                  <View style={styles.reminderTextContainer}>
                    <Text style={styles.reminderName} numberOfLines={1}>{reminder.name}</Text>
                    <Text style={styles.reminderTime}>{reminder.sub}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Chronic badges, if any */}
        {(user?.profile?.chronicDiseases && !user.profile.chronicDiseases.includes('None')) && (
          <View style={styles.chronicSection}>
            <Text style={styles.sectionHeaderTitle}>Active Registries</Text>
            <View style={styles.tagsContainer}>
              {user.profile.chronicDiseases.split(',').map((d, i) => renderChronicBadge(d, i))}
            </View>
          </View>
        )}

        {/* Specialized Ecosystems */}
        <Text style={styles.sectionTitleEcosystem}>Specialized Ecosystems</Text>
        <View style={styles.ecosystemGrid}>
          {/* Pregnancy Tracking */}
          <TouchableOpacity 
            style={styles.ecoCard}
            onPress={() => router.push('/(main)/pregnancy')}
            activeOpacity={0.9}
          >
            <ImageBackground 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDPhxnXYK4rscJBMxc1suR9UqRN1mrF0Zg-SMyKqVnNNQJFpLolMoN8VJSECW7nlNS354acYJsWRltcjOfxcLqq2dfPnNgsBhuG8YUqcYqDogtoYsukHkQVR2nNflUzcQwKBzpUis8mzLcu9NrsK1zlYDWfrfLrZEw-QGWPLqfI74jUg5ENKmzPZP7KfJHVk_jAThae5q5CFHV5fWZagyCS4niPZ5lkWcUybMKR85GvYlXBWb8OIwG6YCx8_qcA80L2QUetjsEbaQ' }}
              style={styles.ecoBg}
              imageStyle={{ borderRadius: 20 }}
            >
              <View style={styles.ecoOverlay}>
                <View style={styles.ecoIconCircle}>
                  <Text style={styles.ecoIconText}>🤰</Text>
                </View>
                <View>
                  <Text style={styles.ecoName}>Pregnancy</Text>
                  <Text style={styles.ecoDesc}>Cycle & Fetal Tracking</Text>
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>

          {/* Children Tracking */}
          <TouchableOpacity 
            style={styles.ecoCard}
            onPress={() => router.push('/(main)/children')}
            activeOpacity={0.9}
          >
            <ImageBackground 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCKb5sH6Xz6XzZlsTaGC0wwCkuT53rwbnXQ4QZs4--QSrUwQTSMt2bPhz0Ly0_SBMJL7_hyKWg-gGAIegHxbtZvisX8r5KEpRl3egTfYdJRHmgk7_wfSlNKEWPC20-r1F4PQ5AlQshqcn6KTLcfxMH69E5dnZwQZDzTCpf7GNUWsvg4I_e5gM6VqdkLxN6fvNPYZalPjuCyjckCectqvQPXgfg5_aJ6bDE4USD59DA7S19c5V6p67AnNYmRF9gK0rFHjxkezM-jvA' }}
              style={styles.ecoBg}
              imageStyle={{ borderRadius: 20 }}
            >
              <View style={styles.ecoOverlay}>
                <View style={styles.ecoIconCircle}>
                  <Text style={styles.ecoIconText}>👶</Text>
                </View>
                <View>
                  <Text style={styles.ecoName}>Children</Text>
                  <Text style={styles.ecoDesc}>Growth & Immunizations</Text>
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>

          {/* Allergy Passport */}
          <TouchableOpacity 
            style={styles.ecoCard}
            onPress={() => router.push('/(main)/settings')} // Allergy passport lives in settings/vault
            activeOpacity={0.9}
          >
            <ImageBackground 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqj1Va5-QYRumA9RVzFGkBslccJjJvgdme_nab9Jmu1QhlRLDS3KuWxQxjAnb2VZ48SqKjPifHrqK-HwpoBtEr2wFw-wVg32iwPEUlnnZK5rhS6kZzN97i987LzW7uzaptCiy3MTEA1ewPJ9RyyJw6wjhJxzHGpwXL2ECYyL33-xHkypc63UXgMuh8F4BvQHls_kAL-xVAfKI_zLQe6_RE_HLBYjo3xWddfW0frLZ8gCa3aIe9MRUH6b36icXoyICpN-RYeQqmpA' }}
              style={styles.ecoBg}
              imageStyle={{ borderRadius: 20 }}
            >
              <View style={styles.ecoOverlay}>
                <View style={styles.ecoIconCircle}>
                  <Text style={styles.ecoIconText}>🪪</Text>
                </View>
                <View>
                  <Text style={styles.ecoName}>Allergy Passport</Text>
                  <Text style={styles.ecoDesc}>Verified Safety Profile</Text>
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        </View>

        {/* Primary Care Hospital */}
        <Text style={styles.sectionTitleEcosystem}>Primary Care Center</Text>
        <View style={styles.hospitalCard}>
          <Image 
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB0FOmg2Ms3COTCEMlyoZAqvcRKi6u_A9QQfJoP4dtWqDchr1D6JSKDWpB7s41x3Q4dBk8u3-soBLE3xZQhorI83y9OrvkJtov7zcWn6CwDg1ufXdTaHTIGWsq_rfH8YgFviWgfo7LeG4nA_LHWDsLdGq8V5GTWBVBQj49eVZJlKOm42pZhlPU2OE2OJWwllDE8btNMdsTMYrGwdztMShInt4MgS0BI52p2Ygk48qBQ39x4TcoYWnw5vJ4LGgSFjnAWwjJUJSpfrrY' }}
            style={styles.hospitalMap}
          />
          <View style={styles.hospitalInfoRow}>
            <View style={styles.hospitalPinBox}>
              <MapPin size={18} color="#420093" />
            </View>
            <View style={styles.hospitalDetails}>
              <Text style={styles.hospitalName}>
                {user?.profile?.preferredHospital || 'CHU Hassan II, Fès'}
              </Text>
              <Text style={styles.hospitalAddress}>
                {user?.profile?.city ? `${user.profile.city}, Morocco` : 'Route de Sidi Hrazem, Fès 30000'}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Premium Bottom Navigation Tab Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItemActive} onPress={() => {}}>
          <LayoutDashboard size={20} color="#ffffff" />
          <Text style={styles.navTextActive}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.replace('/(main)/orchestrator')}
        >
          <Brain size={20} color="#7b7485" />
          <Text style={styles.navText}>Orchestrator</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.replace('/(main)/triage-hub')}
        >
          <Activity size={20} color="#7b7485" />
          <Text style={styles.navText}>Triage</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/(main)/settings')}
        >
          <Settings size={20} color="#7b7485" />
          <Text style={styles.navText}>Settings</Text>
        </TouchableOpacity>
      </View>
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
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(66, 0, 147, 0.03)',
    zIndex: 0,
  },
  glowBottomRight: {
    position: 'absolute',
    bottom: -120,
    right: -120,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(113, 42, 226, 0.03)',
    zIndex: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(204, 195, 214, 0.2)',
    zIndex: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandContainer: {
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#420093',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif-condensed',
  },
  greetingText: {
    fontSize: 12,
    color: '#4a4453',
    fontWeight: '600',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eeecf8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(123, 116, 133, 0.08)',
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#420093',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  scrollView: {
    flex: 1,
    zIndex: 10,
  },
  contentContainer: {
    padding: 20,
  },
  sosBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ba1a1a',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#ba1a1a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  sosLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sosIconCircle: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosTextWrapper: {
    marginLeft: 14,
    flex: 1,
  },
  sosTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  sosSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  bentoContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  fallBento: {
    flex: 1.1,
    backgroundColor: '#420093',
    borderRadius: 24,
    padding: 18,
    justifyContent: 'space-between',
    shadowColor: '#420093',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  fallBentoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  fallIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(78, 222, 163, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4edea3',
  },
  activeDotPulse: {
    backgroundColor: '#4edea3',
    // In React Native, simple flash works via colors
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4edea3',
    letterSpacing: 0.5,
  },
  fallBentoContent: {
    marginTop: 20,
    marginBottom: 16,
  },
  bentoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif-condensed',
  },
  bentoDescription: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 4,
    lineHeight: 15,
  },
  fallStatusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusMiniBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  miniLabel: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
  },
  miniVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  triageBento: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(204, 195, 214, 0.2)',
    shadowColor: 'rgba(91, 33, 182, 0.04)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 2,
  },
  triageBentoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  triageIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#420093',
    justifyContent: 'center',
    alignItems: 'center',
  },
  triageLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7b7485',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  triageBentoContent: {
    marginTop: 20,
    marginBottom: 12,
  },
  triageBentoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#420093',
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif-condensed',
  },
  triageBentoSub: {
    fontSize: 11,
    color: '#4a4453',
    marginTop: 4,
    lineHeight: 15,
  },
  consultLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  consultText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#420093',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#420093',
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif-condensed',
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#712ae2',
  },
  vitalsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  vitalCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(204, 195, 214, 0.2)',
    shadowColor: 'rgba(91, 33, 182, 0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 2,
    justifyContent: 'space-between',
    minHeight: 155,
  },
  vitalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  vitalTime: {
    fontSize: 9,
    color: '#7b7485',
    fontWeight: '500',
  },
  vitalName: {
    fontSize: 11,
    color: '#4a4453',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vitalValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 6,
  },
  vitalLargeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1b23',
  },
  vitalUnitText: {
    fontSize: 11,
    color: '#4a4453',
    fontWeight: '600',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'end',
    justifyContent: 'space-between',
    height: 24,
    width: '100%',
    marginTop: 10,
  },
  waveBar: {
    width: 3.5,
    backgroundColor: '#ba1a1a',
    borderRadius: 2,
    opacity: 0.8,
  },
  optimalBadge: {
    backgroundColor: 'rgba(78, 222, 163, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  optimalText: {
    fontSize: 9,
    color: '#005438',
    fontWeight: '700',
  },
  bmiGoalContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eeecf8',
    paddingTop: 8,
  },
  bmiGoalText: {
    fontSize: 9,
    color: '#7b7485',
    fontWeight: '500',
  },
  upcomingBadge: {
    backgroundColor: 'rgba(66, 0, 147, 0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  upcomingText: {
    fontSize: 9,
    color: '#420093',
    fontWeight: '700',
  },
  remindersList: {
    marginTop: 8,
    gap: 6,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reminderDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#712ae2',
  },
  reminderTextContainer: {
    flex: 1,
  },
  reminderName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1a1b23',
  },
  reminderTime: {
    fontSize: 8,
    color: '#7b7485',
    marginTop: 1,
  },
  chronicSection: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#420093',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeIcon: {
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitleEcosystem: {
    fontSize: 18,
    fontWeight: '700',
    color: '#420093',
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif-condensed',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  ecosystemGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  ecoCard: {
    flex: 1,
    height: 140,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: 'rgba(91, 33, 182, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 2,
  },
  ecoBg: {
    width: '100%',
    height: '100%',
  },
  ecoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(66, 0, 147, 0.45)', // Premium violet overlay
    padding: 12,
    justifyContent: 'space-between',
  },
  ecoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ecoIconText: {
    fontSize: 14,
  },
  ecoName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  ecoDesc: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    fontWeight: '500',
  },
  hospitalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(204, 195, 214, 0.2)',
    shadowColor: 'rgba(91, 33, 182, 0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 2,
  },
  hospitalMap: {
    height: 110,
    width: '100%',
    resizeMode: 'cover',
  },
  hospitalInfoRow: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  hospitalPinBox: {
    width: 36,
    height: 36,
    backgroundColor: '#eeecf8',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(66, 0, 147, 0.08)',
  },
  hospitalDetails: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1b23',
  },
  hospitalAddress: {
    fontSize: 12,
    color: '#7b7485',
    marginTop: 2,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 88 : 72,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(204, 195, 214, 0.2)',
    shadowColor: 'rgba(91, 33, 182, 0.06)',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 100,
  },
  navItemActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#420093',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  navItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    width: 70,
  },
  navTextActive: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  navText: {
    color: '#7b7485',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
});
