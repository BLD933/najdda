import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Modal,
  Linking,
  Alert,
  Share,
  Keyboard,
  Image,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import chatService from '../../src/features/chat/services/chatService';
import { useAuth } from '../../src/features/auth/context/AuthContext';
import { pickChatImage } from '../../src/features/chat/utils/chatMedia';
import conversationService from '../../src/features/chat/services/conversationService';
import { scheduleLocalFollowup } from '../../src/features/chat/services/localFollowupService';
import { useChatFollowup } from '../../src/features/chat/hooks/useChatFollowup';
import { 
  ChevronLeft, 
  Send, 
  ShieldAlert, 
  Phone, 
  MapPin, 
  Activity, 
  Bot,
  Flame,
  Plus,
  LayoutDashboard,
  FileText,
  Settings,
  Paperclip,
} from 'lucide-react-native';

function ThinkingDots() {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const dot = (anim, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
        { delay }
      );

    dot(anim1, 0).start();
    dot(anim2, 200).start();
    dot(anim3, 400).start();

    return () => {
      anim1.setValue(0);
      anim2.setValue(0);
      anim3.setValue(0);
    };
  }, []);

  const dotStyle = (anim) => ({
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#004ac6',
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}>
      <Animated.View style={dotStyle(anim1)} />
      <Animated.View style={dotStyle(anim2)} />
      <Animated.View style={dotStyle(anim3)} />
    </View>
  );
}

function Cursor() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    blink.start();
    return () => opacity.setValue(1);
  }, []);

  return <Animated.Text style={{ opacity, color: '#ffffff', fontSize: 16 }}>|</Animated.Text>;
}

export default function TriageScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const flatListRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      id: '0',
      role: 'assistant',
      text: 'Salam! 👋 I am your Triage Nurse at SHIFAA Hospital. How are you feeling today? Please describe your symptoms or health concern, and I will guide you to the right care.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [severity, setSeverity] = useState(null);
  const [streamId, setStreamId] = useState(null);
  const [emergencyVisible, setEmergencyVisible] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [emergencyNumber, setEmergencyNumber] = useState(
    user?.profile?.country === 'Morocco' ? '150' : '112'
  );
  useChatFollowup('triage', setMessages);

  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  useEffect(() => {
    conversationService.getHistory('triage').then((history) => {
      if (history.length) setMessages(history.map((item) => ({ ...item.metadata, id: item.id, role: item.role, text: item.content })));
    }).catch(() => {});
  }, []);

  const callEmergency = () => {
    Linking.openURL(`tel:${emergencyNumber}`);
  };

  const shareLocation = async () => {
    setSharingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission was denied. Please enable it in Settings to share your location.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = `${location.coords.latitude},${location.coords.longitude}`;
      const mapUrl = `https://maps.google.com/?q=${coords}`;
      await Share.share({
        message: `📍 My location: ${mapUrl}\nThis is my current location. I need emergency medical assistance.`,
        title: 'My Location - Emergency',
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to get your location. Please try again or call 911.');
    } finally {
      setSharingLocation(false);
    }
  };

  const dismissEmergency = () => {
    setEmergencyVisible(false);
  };

  const handlePickImage = async () => {
    const image = await pickChatImage();
    if (image) setSelectedImage(image);
  };

  const sendMessage = async (overrideText = null) => {
    const text = typeof overrideText === 'string' ? overrideText.trim() : input.trim();
    if ((!text && !selectedImage) || loading) return;

    const userMsg = { 
      id: Date.now().toString(), 
      role: 'user', 
      text,
      imageUri: selectedImage
    };
    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, userMsg, { id: assistantId, role: 'assistant', text: '' }]);
    setInput('');
    
    const base64Image = selectedImage ? selectedImage.split(',')[1] : null;
    setSelectedImage(null);
    setLoading(true);
    setStreamId(assistantId);

    try {
      if (base64Image) {
        const res = await chatService.sendVisionImage(base64Image, text || "Que voyez-vous sur cette image concernant ma santé ?");
        const cleanReply = (res.reply || "").replace(/\[SEVERITY:\s*\w+\]/g, '').replace(/\[REQUIRES_FOLLOWUP:\s*\w+\]/g, '').replace(/\[FOLLOWUP_MSG:\s*.+?\]/g, '').trim();
        
        setMessages(prev => prev.map(m => m.id === assistantId ? {
          ...m,
          text: cleanReply,
          isEmergency: res.isEmergency,
          emergencyNumber: res.emergencyNumber,
        } : m));
        if (res.requires_followup && res.followup_message) {
          await scheduleLocalFollowup('triage', 'Suivi médical SHIFAA', res.followup_message, text, res.followup_time_minutes);
        }
        
      } else {
        let accumulated = '';
        await chatService.sendMessageStream(
          text,
          (token) => {
            accumulated += token;
            setMessages(prev =>
              prev.map(m => m.id === assistantId ? { ...m, text: accumulated } : m)
            );
          },
          (doneEvent) => {
            const sev = typeof doneEvent === 'string' ? doneEvent : doneEvent.severity;
            const meta = typeof doneEvent === 'object' ? doneEvent : {};
            
            const clean = accumulated.replace(/\[SEVERITY:\s*\w+\]/g, '').replace(/\[REQUIRES_FOLLOWUP:\s*\w+\]/g, '').replace(/\[FOLLOWUP_MSG:\s*.+?\]/g, '').replace(/\[FOLLOWUP_TIME_MINUTES:\s*[\d.]+\]/g, '').replace(/\[OPTIONS:\s*.+?\]/g, '').trim();
            setMessages(prev =>
              prev.map(m => m.id === assistantId ? { ...m, text: clean } : m)
            );
            setSeverity(sev);
            if (meta.isEmergency) {
              setMessages(prev => prev.map(m => m.id === assistantId ? {
                ...m,
                isEmergency: true,
                emergencyNumber: meta.emergencyNumber,
                options: meta.options,
              } : m));
              setEmergencyNumber(meta.emergencyNumber || emergencyNumber);
              setEmergencyVisible(true);
            } else {
              setMessages(prev => prev.map(m => m.id === assistantId ? {
                ...m,
                options: meta.options,
              } : m));
            }
            if (meta.requires_followup && meta.followup_message) {
              scheduleLocalFollowup('triage', 'Suivi médical SHIFAA', meta.followup_message, text, meta.followup_time_minutes).catch(() => {});
            }
          },
          (errMsg) => {
            setMessages(prev =>
              prev.map(m => m.id === assistantId ? { ...m, text: `Sorry, an error occurred: ${errMsg}` } : m)
            );
          },
          (emergencyData) => {
            setMessages(prev => 
              prev.map(m => m.id === assistantId ? { 
                ...m, 
                isEmergency: true, 
                emergencyNumber: emergencyData.emergencyNumber, 
                text: "🚨 Une urgence absolue a été détectée." 
              } : m)
            );
            setSeverity('CRITICAL');
            setEmergencyNumber(emergencyData.emergencyNumber || emergencyNumber);
            setEmergencyVisible(true);
          }
        );
      }
    } catch (err) {
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, text: 'Sorry, connection error. Please try again.' } : m)
      );
    } finally {
      setLoading(false);
      setStreamId(null);
    }
  };

  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const resetChat = async () => {
    try {
      await chatService.resetChat();
      await conversationService.clearHistory('triage');
    } catch (e) { /* ignore */ }
    setMessages([{
      id: '0',
      role: 'assistant',
      text: 'Salam! 👋 I am your Triage Nurse at SHIFAA Hospital. How are you feeling today?',
    }]);
    setSeverity(null);
    setEmergencyVisible(false);
  };

  const handleComingSoon = (feature) => {
    Alert.alert("Coming Soon", `${feature} is currently under development.`);
  };

  const handleChipPress = (chipText) => {
    setInput(chipText);
  };

  const severityColors = {
    CRITICAL: '#ba1a1a',
    HIGH: '#F59E0B',
    MEDIUM: '#3B82F6',
    LOW: '#22C55E',
  };

  const severityConfig = severity
    ? {
        color: severityColors[severity] || '#64748B',
        label: severity === 'CRITICAL' ? '⚠ Emergency Detected' : `Severity: ${severity}`,
      }
    : null;

  const renderMessage = ({ item, index }) => {
    const isUser = item.role === 'user';
    const isStreaming = item.id === streamId;
    const isLastMessage = index === messages.length - 1;
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
        {!isUser && (
          <View style={styles.assistantAvatar}>
            <Bot size={16} color="#ffffff" />
          </View>
        )}
        <View style={styles.bubbleCol}>
          <View style={[styles.msgBubble, isUser ? styles.msgBubbleUser : styles.msgBubbleAssistant]}>
            {isStreaming && !item.text ? (
              <ThinkingDots />
            ) : (
              <>
                <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextAssistant]}>
                  {item.text}
                  {isStreaming && <Cursor />}
                </Text>
                {item.imageUri && (
                  <Image 
                    source={{ uri: item.imageUri }} 
                    style={styles.attachedImage} 
                  />
                )}
                {item.isEmergency && (
                  <TouchableOpacity 
                    style={styles.emergencyButton} 
                    onPress={() => {
                      setEmergencyNumber(item.emergencyNumber || emergencyNumber);
                      setEmergencyVisible(true);
                    }}
                  >
                    <Text style={styles.emergencyButtonText}>Appeler les Urgences ({item.emergencyNumber})</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
          {item.options && isLastMessage && !isStreaming && (
            <View style={styles.optionsContainer}>
              {item.options.map((opt, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={styles.optionBtn} 
                  onPress={() => { 
                    sendMessage(opt); 
                    setMessages(prev => prev.map(m => m.id === item.id ? { ...m, options: null } : m)); 
                  }}
                >
                  <Text style={styles.optionBtnText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        {isUser && (
          <View style={styles.userAvatar}>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBe7bvwDbBGtNELuKybo_MPcr_3rEp_MRxL4co41BfWJZEGbDfhqOWLIma_yvizVDpRIaaMXYahg_ATK2O4uUlvssw0Qhn6FK_ncJQUzemFMZwLTnYTuEPOCiV6cETeq5acfd3mfcRzHFv7K7UkYkrdhtfQR0oL8es1HJzkqPA1wN6L_0APNeaJXKBUUoVnFZF0Yf1Fpj3Nln_nqQ7UJM0vpKSOS_la_wmLsg3Iv8dO7VmGLcuwahpMYB65dJPXcZzt4czwG7KFzdU' }}
              style={styles.avatarImage}
            />
          </View>
        )}
      </View>
    );
  };

  const triageChips = [
    { label: 'Headache', icon: Activity, text: 'I am experiencing a severe headache.' },
    { label: 'Fever', icon: Flame, text: 'I have a high fever.' },
    { label: 'Chest Pain', icon: ShieldAlert, text: 'I am feeling severe chest pain.' },
    { label: 'Other', icon: Plus, text: 'I want to report other symptoms: ' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={severity === 'CRITICAL' ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, severity === 'CRITICAL' && styles.headerEmergency]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={severity === 'CRITICAL' ? '#FFFFFF' : '#191c1e'} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, severity === 'CRITICAL' && { color: '#FFFFFF' }]}>Symptom Triage</Text>
            <Text style={[styles.headerSub, severity === 'CRITICAL' && { color: '#FECACA' }]}>General · Triage Nurse</Text>
          </View>
        </View>
        <TouchableOpacity onPress={resetChat} style={styles.resetBtn}>
          <Text style={[styles.resetText, severity === 'CRITICAL' && { color: '#FECACA' }]}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Severity Banner */}
      {severityConfig && (
        <View style={[styles.severityBanner, { backgroundColor: severityConfig.color }]}>
          {severity === 'CRITICAL' && <ShieldAlert size={18} color="#FFFFFF" />}
          <Text style={styles.severityBannerText}>{severityConfig.label}</Text>
        </View>
      )}

      {/* Messages */}
      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 25}
      >
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            style={styles.msgList}
            contentContainerStyle={styles.msgListContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View style={styles.emergencyBannerRow}>
                <TouchableOpacity 
                  style={styles.emergencyTriggerBtn}
                  onPress={() => setEmergencyVisible(true)}
                >
                  <ShieldAlert size={16} color="#ba1a1a" fill="#ba1a1a" style={styles.emergencyIconPulse} />
                  <Text style={styles.emergencyTriggerText}>Emergency Mode</Text>
                  <ChevronLeft size={16} color="#ba1a1a" style={{ transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>
              </View>
            }
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          {loading && !streamId && (
            <View style={styles.typingRow}>
              <View style={styles.typingAvatar}>
                <Bot size={16} color="#004ac6" />
              </View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color="#004ac6" style={{ marginRight: 6 }} />
                <Text style={styles.typingText}>Nurse is reviewing...</Text>
              </View>
            </View>
          )}
        </View>

        <View style={[styles.controlsArea, !isKeyboardVisible && { paddingBottom: Platform.OS === 'ios' ? 88 : 72 }]}>
          <View style={styles.chipsScrollViewWrapper}>
            <FlatList
              horizontal
              data={triageChips}
              keyExtractor={item => item.label}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContainer}
              renderItem={({ item }) => {
                const ChipIcon = item.icon;
                return (
                  <TouchableOpacity 
                    style={styles.chipButton}
                    onPress={() => handleChipPress(item.text)}
                  >
                    <ChipIcon size={14} color="#565e74" />
                    <Text style={styles.chipText}>{item.label}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          <View style={styles.inputContainer}>
            {selectedImage && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setSelectedImage(null)}>
                  <Plus size={16} color="#fff" style={{ transform: [{ rotate: '45deg' }] }} />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputBar}>
              <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage}>
                <Paperclip size={20} color="#565e74" />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Describe how you feel..."
                placeholderTextColor="rgba(67, 70, 85, 0.4)"
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!input.trim() && !selectedImage || loading) && styles.sendBtnDisabled]}
                onPress={() => sendMessage()}
                disabled={(!input.trim() && !selectedImage) || loading}
              >
                <Send size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {!isKeyboardVisible && (
        <View style={styles.bottomNav}>
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => router.replace('/(main)/dashboard')}
          >
            <LayoutDashboard size={20} color="#565e74" />
            <Text style={styles.navText}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/(main)/triage-hub')}>
            <Activity size={20} color="#565e74" />
            <Text style={styles.navText}>Triage</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => handleComingSoon("Reports")}
          >
            <FileText size={20} color="#565e74" />
            <Text style={styles.navText}>Reports</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => router.push('/(main)/settings')}
          >
            <Settings size={20} color="#565e74" />
            <Text style={styles.navText}>Settings</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Emergency Overlay */}
      <Modal
        visible={emergencyVisible}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={dismissEmergency}
      >
        <View style={styles.emergencyOverlay}>
          <View style={styles.emergencyCard}>
            <View style={styles.emergencyHeader}>
              <ShieldAlert size={48} color="#ba1a1a" />
              <Text style={styles.emergencyTitle}>EMERGENCY</Text>
              <Text style={styles.emergencySub}>Critical Condition Detected</Text>
            </View>

            <View style={styles.emergencyBody}>
              <Text style={styles.emergencyText}>
                Our triage nurse has detected a potentially life-threatening condition. Please follow these steps immediately:
              </Text>

              <View style={styles.emergencyStep}>
                <Text style={styles.emergencyStepNum}>1</Text>
              <Text style={styles.emergencyStepText}>Call emergency services ({emergencyNumber}) right now</Text>
              </View>
              <View style={styles.emergencyStep}>
                <Text style={styles.emergencyStepNum}>2</Text>
                <Text style={styles.emergencyStepText}>Stay calm and follow the nurse's first-aid instructions</Text>
              </View>
              <View style={styles.emergencyStep}>
                <Text style={styles.emergencyStepNum}>3</Text>
                <Text style={styles.emergencyStepText}>Share your location so help can find you</Text>
              </View>
            </View>

            <View style={styles.emergencyActions}>
              <TouchableOpacity style={styles.emergencyCallBtn} onPress={callEmergency}>
                <Phone size={20} color="#FFFFFF" />
                <Text style={styles.emergencyCallText}>Call {emergencyNumber}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.emergencyLocBtn}
                onPress={shareLocation}
                disabled={sharingLocation}
              >
                <MapPin size={20} color="#ba1a1a" />
                <Text style={styles.emergencyLocText}>
                  {sharingLocation ? 'Getting location...' : 'Share My Location'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.emergencyDismiss} onPress={dismissEmergency}>
              <Text style={styles.emergencyDismissText}>I Understand, Continue Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f9fb' },
  header: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    backgroundColor: '#ffffff',
    borderBottomWidth: 1, 
    borderBottomColor: '#eceef0',
  },
  headerEmergency: {
    backgroundColor: '#ba1a1a',
    borderBottomColor: '#93000a',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#191c1e' },
  headerSub: { fontSize: 12, color: '#565e74', fontWeight: '500', marginTop: 1 },
  resetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resetText: { fontSize: 14, fontWeight: '700', color: '#004ac6' },
  severityBanner: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  severityBannerText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', flex: 1 },
  msgList: { flex: 1 },
  msgListContent: { padding: 20, paddingBottom: 20 },
  msgRow: { flexDirection: 'row', marginBottom: 20, gap: 10 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAssistant: { justifyContent: 'flex-start' },
  bubbleCol: { maxWidth: '78%' },
  assistantAvatar: { 
    width: 32, 
    height: 32, 
    borderRadius: 8, 
    backgroundColor: '#004ac6', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 4,
    shadowColor: '#004ac6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userAvatar: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    borderWidth: 1,
    borderColor: '#eceef0',
    overflow: 'hidden',
    marginTop: 4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  msgBubble: { 
    padding: 14, 
    borderRadius: 16,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  optionBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#004ac6',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  optionBtnText: {
    color: '#004ac6',
    fontSize: 14,
    fontWeight: '600',
  },
  msgBubbleUser: { 
    backgroundColor: '#ffffff', 
    borderWidth: 1,
    borderColor: '#eceef0',
    borderBottomRightRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  msgBubbleAssistant: { 
    backgroundColor: '#004ac6', 
    borderBottomLeftRadius: 0, 
    shadowColor: '#004ac6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  msgText: { fontSize: 15, lineHeight: 22 },
  msgTextUser: { color: '#191c1e' },
  msgTextAssistant: { color: '#ffffff' },
  
  emergencyBannerRow: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  emergencyTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffdad6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: 'rgba(186, 26, 26, 0.15)',
    gap: 8,
    shadowColor: '#ba1a1a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  emergencyIconPulse: {
    marginRight: 2,
  },
  emergencyTriggerText: {
    color: '#ba1a1a',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  typingRow: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  typingAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 74, 198, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  typingBubble: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ffffff', 
    paddingHorizontal: 14,
    paddingVertical: 10, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#eceef0',
  },
  typingText: { fontSize: 13, color: '#565e74', fontWeight: '500' },

  controlsArea: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  chipsScrollViewWrapper: {
    marginBottom: 8,
  },
  chipsContainer: {
    gap: 8,
    paddingRight: 20,
  },
  chipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eceef0',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  chipText: {
    color: '#191c1e',
    fontSize: 13,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ffffff',
    borderWidth: 1, 
    borderColor: '#eceef0',
    borderRadius: 20,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  attachBtn: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1, 
    backgroundColor: 'transparent', 
    paddingHorizontal: 10, 
    paddingVertical: 8,
    fontSize: 15, 
    color: '#191c1e', 
    maxHeight: 80,
  },
  sendBtn: { 
    backgroundColor: '#004ac6', 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  inputContainer: { gap: 8 },
  imagePreviewContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    marginLeft: 10,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eceef0',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachedImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginTop: 8,
    resizeMode: 'cover',
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    borderWidth: 1,
    borderColor: '#eceef0',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  navItemActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#004ac6',
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
  },
  navTextActive: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  navText: {
    color: '#565e74',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },

  // Emergency Overlay
  emergencyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emergencyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  emergencyHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  emergencyTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ba1a1a',
    marginTop: 12,
    letterSpacing: 4,
  },
  emergencySub: {
    fontSize: 14,
    color: '#565e74',
    fontWeight: '600',
    marginTop: 4,
  },
  emergencyBody: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  emergencyText: {
    fontSize: 14,
    color: '#434655',
    lineHeight: 22,
    marginBottom: 16,
  },
  emergencyStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  emergencyStepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ba1a1a',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 24,
    overflow: 'hidden',
  },
  emergencyStepText: {
    flex: 1,
    fontSize: 14,
    color: '#191c1e',
    lineHeight: 22,
    fontWeight: '500',
  },
  emergencyActions: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 10,
  },
  emergencyCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ba1a1a',
    padding: 16,
    borderRadius: 14,
  },
  emergencyCallText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  emergencyLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffdad6',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  emergencyLocText: {
    color: '#ba1a1a',
    fontSize: 15,
    fontWeight: '700',
  },
  emergencyDismiss: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eceef0',
  },
  emergencyDismissText: {
    color: '#565e74',
    fontSize: 14,
    fontWeight: '600',
  },
  emergencyButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 15,
    alignItems: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  emergencyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
