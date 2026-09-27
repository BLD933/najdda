import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bot,
  Baby,
  Flower2,
  Pill,
  Activity,
  LayoutDashboard,
  FileText,
  Settings,
  ChevronRight,
  Sparkles,
  Brain,
  Bell,
  Shield,
} from 'lucide-react-native';

const CHAT_CATEGORIES = [
  {
    id: 'general',
    title: 'General Triage',
    subtitle: 'Symptom check and medical guidance',
    icon: Bot,
    color: '#004ac6',
    bgColor: '#e5edff',
    available: true,
    route: '/(main)/triage',
  },
  {
    id: 'pregnancy',
    title: 'Femmes enceintes',
    subtitle: 'Support dedicated to pregnancy care',
    icon: Sparkles,
    color: '#e11d48',
    bgColor: '#ffe4e6',
    available: true,
    route: '/(main)/pregnancy',
  },
  {
    id: 'allergies',
    title: 'Allergies',
    subtitle: 'Allergy assessment and safety advice',
    icon: Flower2,
    color: '#d97706',
    bgColor: '#fef3c7',
    available: true,
    route: '/(main)/allergy',
  },
  {
    id: 'children',
    title: 'Petits enfants',
    subtitle: 'Pediatric dosage and symptom guide',
    icon: Baby,
    color: '#0891b2',
    bgColor: '#cffafe',
    available: true,
    route: '/(main)/children',
  },
  {
    id: 'medications',
    title: 'Médicaments',
    subtitle: 'Drug interaction verification',
    icon: Pill,
    color: '#8b5cf6',
    bgColor: '#ede9fe',
    available: true,
    route: '/(main)/medications',
  },
  {
    id: 'orchestrator',
    title: 'Orchestrator IA',
    subtitle: 'Multi-agent: all specialties combined',
    icon: Brain,
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    available: true,
    route: '/(main)/orchestrator',
  },
];

export default function TriageHubScreen() {
  const router = useRouter();

  const handleComingSoon = (title) => {
    Alert.alert(
      'En cours de développement',
      `${title} sera disponible prochainement.`,
      [{ text: 'OK' }]
    );
  };

  const handleCategoryPress = (category) => {
    if (category.available && category.route) {
      router.push(category.route);
      return;
    }
    handleComingSoon(category.title);
  };

  const handleComingSoonNav = (feature) => {
    Alert.alert('Coming Soon', `${feature} is currently under development.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>AI Triage</Text>
          <Text style={styles.headerSub}>Choose a consultation type</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.7}>
            <Bell size={24} color="#737686" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida/AP1WRLvzZjSuqUQvvWPxrY4EG5nxfoo_WdbhvOJs8h5svz-68yKkJ3UX1tc5ewkoRzvHW2DakZe1MVKR4top2y5VI_cGyEoPWv5YvWWk8WlPG0IZXczbmwXJVRYFtwAjMJVv9kBwq8T3Gki_IB2Lp1TtXkYDsZwufbhBUhYx_tbdNNDSjswY0Z1Cr9iG52VXLqYflBP-PmHIlMAAyUE1VPe_yK1NDLWgiBaHSMDQvJNFA1Sry1Tz7vs8XZyFlxI' }}
              style={styles.avatar}
            />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Consultation Categories</Text>
          <View style={styles.sectionLine} />
        </View>

        {CHAT_CATEGORIES.map((category) => {
          const Icon = category.icon;
          return (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => handleCategoryPress(category)}
              activeOpacity={0.85}
            >
              <View style={[styles.iconBox, { backgroundColor: category.bgColor }]}>
                <Icon size={28} color={category.color} />
              </View>
              <View style={styles.categoryText}>
                <View style={styles.titleRow}>
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                  {!category.available && (
                    <View style={styles.soonBadge}>
                      <Text style={styles.soonBadgeText}>Soon</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.categorySubtitle}>{category.subtitle}</Text>
              </View>
              <ChevronRight size={24} color="#c3c6d7" />
            </TouchableOpacity>
          );
        })}

        {/* Promotional AI Card */}
        <View style={styles.promoCard}>
          <View style={styles.promoContent}>
            <View style={styles.promoBadge}>
              <Shield size={16} color="#eeefff" />
              <Text style={styles.promoBadgeText}>CERTIFIED ASSISTANT</Text>
            </View>
            <Text style={styles.promoTitle}>Need immediate help?</Text>
            <Text style={styles.promoDesc}>
              Our specialized AI models are available 24/7 to provide clinical insights based on North African medical protocols.
            </Text>
            <TouchableOpacity style={styles.promoButton} activeOpacity={0.9}>
              <Text style={styles.promoButtonText}>Start Quick Assessment</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.promoShape} />
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.replace('/(main)/dashboard')}
        >
          <LayoutDashboard size={24} color="#565e74" />
          <Text style={styles.navText}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/(main)/orchestrator')}>
          <Brain size={24} color="#565e74" />
          <Text style={styles.navText}>Orchestrator</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItemActiveContainer} onPress={() => {}}>
          <View style={styles.navItemActive}>
            <Activity size={24} color="#ffffff" fill="#ffffff" />
            <Text style={styles.navTextActive}>Triage</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/(main)/settings')}
        >
          <Settings size={24} color="#565e74" />
          <Text style={styles.navText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f7f9fb',
    zIndex: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#004ac6',
  },
  headerSub: {
    fontSize: 16,
    color: '#434655',
    marginTop: -2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationBtn: {
    position: 'relative',
    padding: 8,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    backgroundColor: '#ba1a1a',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#f7f9fb',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#b4c5ff',
    overflow: 'hidden',
    backgroundColor: '#e6e8ea',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#737686',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginRight: 8,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#c3c6d7',
    opacity: 0.3,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eceef0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryText: {
    flex: 1,
    marginLeft: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#191c1e',
  },
  categorySubtitle: {
    fontSize: 14,
    color: '#434655',
    marginTop: 2,
  },
  soonBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  soonBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  promoCard: {
    marginTop: 40,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  promoContent: {
    padding: 24,
    position: 'relative',
    zIndex: 10,
  },
  promoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  promoBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#eeefff',
    letterSpacing: 0.5,
  },
  promoTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#eeefff',
    marginBottom: 8,
  },
  promoDesc: {
    fontSize: 14,
    color: '#eeefff',
    opacity: 0.9,
    lineHeight: 20,
    marginBottom: 16,
  },
  promoButton: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  promoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#004ac6',
  },
  promoShape: {
    position: 'absolute',
    bottom: -40,
    right: -40,
    width: 160,
    height: 160,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 80,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 12,
    paddingHorizontal: 16,
    shadowColor: '#004ac6',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  navItemActiveContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemActive: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 6,
    borderRadius: 999,
  },
  navText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#565e74',
    marginTop: 4,
  },
  navTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#eeefff',
    marginTop: 4,
  },
});

