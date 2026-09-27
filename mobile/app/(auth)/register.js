import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Image,
  ScrollView,
  StatusBar
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../src/features/auth/context/AuthContext';
import { User, Mail, Lock, Eye, EyeOff, Globe } from 'lucide-react-native';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [focusedField, setFocusedField] = useState(null);

  const { register, loading, error } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    try {
      await register({ fullName, email, password });
      router.replace('/(onboarding)/complete-profile');
    } catch (err) {
      // Error is handled by context
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Decorative atmospheric glows */}
      <View style={styles.glowTopLeft} />
      <View style={styles.glowBottomRight} />

      {/* Language Switcher */}
      <View style={styles.languageContainer}>
        <TouchableOpacity style={styles.languageButton}>
          <Globe size={16} color="#420093" />
          <Text style={styles.languageText}>AR/EN</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoGlow} />
              <Image 
                alt="SHIFAA Logo" 
                style={styles.logo} 
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAwuhOalyEA3vPAcWJ-kpvTy4XDXkErsXcVKbdPCEn915jV4MsPNRUNO_SOVh0un596iMGMUKuJ19pUA4RSYr_70VfcKxr12aIybgQLZufvoYei_LCI6Qz_vGdnd7stBkjnLdbKJlg5Jur0Ot4whELV5e8vTcWgZk5KNawL1HCU5OTG1T8oBomQMyPax3YrXYQ0I571cTIQtxydktzifKG13MyvVIE96bmbFB42QB25CX-2btKs61z8cM6-GXZVQU5cK8bZV-7fHQ' }}
              />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join SHIFAA digital hospital today</Text>
          </View>

          {/* Elevated Auth Card */}
          <View style={styles.card}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Full Name Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, focusedField === 'fullName' && styles.labelFocused]}>
                Full Name
              </Text>
              <View style={[
                styles.inputContainer, 
                focusedField === 'fullName' && styles.inputContainerFocused
              ]}>
                <User size={18} color={focusedField === 'fullName' ? '#420093' : '#7b7485'} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor="#7b7485"
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={() => setFocusedField('fullName')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, focusedField === 'email' && styles.labelFocused]}>
                Email Address
              </Text>
              <View style={[
                styles.inputContainer, 
                focusedField === 'email' && styles.inputContainerFocused
              ]}>
                <Mail size={18} color={focusedField === 'email' ? '#420093' : '#7b7485'} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#7b7485"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, focusedField === 'password' && styles.labelFocused]}>
                Password
              </Text>
              <View style={[
                styles.inputContainer, 
                focusedField === 'password' && styles.inputContainerFocused
              ]}>
                <Lock size={18} color={focusedField === 'password' ? '#420093' : '#7b7485'} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#7b7485"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={secureText}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity 
                  onPress={() => setSecureText(!secureText)}
                  style={styles.visibilityButton}
                >
                  {secureText ? (
                    <Eye size={20} color="#7b7485" />
                  ) : (
                    <EyeOff size={20} color="#420093" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Start Health Journey</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Bottom Navigation Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.registerLink}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Small Footer */}
          <View style={styles.footer}>
            <TouchableOpacity><Text style={styles.footerLink}>Privacy Policy</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.footerLink}>Terms of Service</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.footerLink}>Help Center</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(66, 0, 147, 0.05)',
    zIndex: 0,
  },
  glowBottomRight: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(113, 42, 226, 0.05)',
    zIndex: 0,
  },
  languageContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 24,
    zIndex: 50,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eeecf8',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(123, 116, 133, 0.15)',
  },
  languageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#420093',
  },
  keyboardView: {
    flex: 1,
    zIndex: 10,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoContainer: {
    width: 96,
    height: 96,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(91, 33, 182, 0.15)',
    shadowColor: '#5b21b6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  logo: {
    width: 72,
    height: 72,
    resizeMode: 'contain',
    zIndex: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#420093',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif-condensed',
  },
  subtitle: {
    fontSize: 15,
    color: '#4a4453',
    marginTop: 6,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: 'rgba(91, 33, 182, 0.06)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(204, 195, 214, 0.2)',
  },
  errorContainer: {
    backgroundColor: '#ffdad6',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ba1a1a',
    marginBottom: 16,
  },
  errorText: {
    color: '#ba1a1a',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a4453',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelFocused: {
    color: '#420093',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ccc3d6',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
  },
  inputContainerFocused: {
    borderColor: '#420093',
    borderWidth: 1.5,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1a1b23',
    fontWeight: '500',
    height: '100%',
  },
  visibilityButton: {
    padding: 4,
  },
  button: {
    backgroundColor: '#420093',
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#420093',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    color: '#4a4453',
    fontSize: 14,
    fontWeight: '500',
  },
  registerLink: {
    color: '#420093',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 48,
  },
  footerLink: {
    fontSize: 12,
    color: 'rgba(74, 68, 83, 0.6)',
    fontWeight: '500',
  },
});
