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
  Image,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { scheduleCheckIn } from '../../src/features/chat/services/localFollowupService';
import {
  ChevronLeft,
  Send,
  Bot,
  Sparkles,
  Baby,
  Flower2,
  Pill,
  MapPin,
  Brain,
  ShieldAlert,
  LayoutDashboard,
  FileText,
  Settings,
  Activity,
} from 'lucide-react-native';
import apiClient from '../../src/api/apiClient';
import conversationService from '../../src/features/chat/services/conversationService';

const AGENT_META = {
  triage: { icon: Bot, color: '#004ac6', label: 'Triage' },
  pregnancy: { icon: Sparkles, color: '#9d174d', label: 'Grossesse' },
  pediatric: { icon: Baby, color: '#0891b2', label: 'Pédiatrie' },
  pharmacy: { icon: Pill, color: '#8b5cf6', label: 'Pharmacie' },
  allergy: { icon: Flower2, color: '#b45309', label: 'Allergie' },
  locator: { icon: MapPin, color: '#059669', label: 'Localisation' },
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
    backgroundColor: '#7c3aed',
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
  return <Animated.Text style={{ opacity, color: '#191c1e', fontSize: 16 }}>|</Animated.Text>;
}

export default function OrchestratorScreen() {
  const router = useRouter();
  const flatListRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      id: '0',
      role: 'assistant',
      text: 'Salam! 👋 I am the SHIFAA Orchestrator.\n\nDescribe your health concern and I will activate the right medical specialists to help you. I can handle symptoms, medications, pregnancy, children, allergies, and more.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeAgents, setActiveAgents] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamedText, setStreamedText] = useState('');

  useEffect(() => {
    conversationService.getHistory('orchestrator').then((history) => {
      if (history.length) {
        setMessages(history.map((item) => ({
          id: item.id,
          role: item.role,
          text: item.content,
          agentsUsed: item.metadata?.agentsUsed,
          domain: item.metadata?.domain,
        })));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const sendMessage = async (overrideText = null) => {
    const text = typeof overrideText === 'string' ? overrideText.trim() : input.trim();
    if (!text || loading) return;

    const userMsg = { id: Date.now().toString(), role: 'user', text };
    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, userMsg, { id: assistantId, role: 'assistant', text: '' }]);
    setInput('');
    setLoading(true);
    setIsProcessing(true);
    setActiveAgents([]);

    try {
      const response = await apiClient.post('/orchestrator/chat', { message: text });
      const responseData = response.data || {};
      const isEmergency = responseData.isEmergency || false;
      const emergencyNumber = responseData.emergencyNumber || '112';
      
      let replyText = responseData.reply;
      if (!replyText && isEmergency) {
        const adviceStr = (responseData.advice || []).join(' ');
        replyText = `🚨 URGENCE MÉDICALE DÉTECTÉE par l'IA Gemma 4 E2B.\n\n${adviceStr}\n\nAppelez immédiatement les secours au ${emergencyNumber}.`;
      }

      console.log('[Orchestrator] API Response Followup Data:', { followupTimeMinutes: responseData.followupTimeMinutes, followupMessage: responseData.followupMessage, options: responseData.options });

      if (responseData.followupTimeMinutes && responseData.followupMessage) {
        scheduleCheckIn(responseData.followupTimeMinutes, responseData.followupMessage, text);
      }

      setActiveAgents(responseData.agentsUsed || []);
      setMessages(prev => prev.map(m => m.id === assistantId ? {
        ...m,
        text: replyText || "Je suis là pour vous accompagner. Comment puis-je vous aider davantage ?",
        agentsUsed: responseData.agentsUsed || [],
        domain: responseData.domain,
        isEmergency,
        emergencyNumber,
        options: responseData.options,
      } : m));
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Connection error. Please try again.';
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, text: `Error: ${errMsg}` } : m));
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  const resetChat = async () => {
    try {
      await apiClient.post('/orchestrator/reset');
      await conversationService.clearHistory('orchestrator');
    } catch (e) { /* ignore */ }
    setMessages([{
      id: '0',
      role: 'assistant',
      text: 'Salam! 👋 I am the SHIFAA Orchestrator.\n\nDescribe your health concern and I will activate the right medical specialists to help you.',
    }]);
    setActiveAgents([]);
  };

  const renderMessage = ({ item, index }) => {
    const isUser = item.role === 'user';
    const isStreaming = item.id === (messages[messages.length - 1]?.id) && loading && !item.text;
    const isLastMessage = index === messages.length - 1;
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
        {!isUser && (
          <View style={styles.assistantAvatar}>
            <Brain size={18} color="#ffffff" />
          </View>
        )}
        <View style={styles.bubbleCol}>
          <View style={[styles.msgBubble, isUser ? styles.msgBubbleUser : styles.msgBubbleAssistant]}>
            {isStreaming ? (
              <View>
                <ThinkingDots />
                {activeAgents.length > 0 && (
                  <View style={styles.agentStrip}>
                    {activeAgents.map((agent) => {
                      const meta = AGENT_META[agent] || { icon: Bot, color: '#64748b', label: agent };
                      const Icon = meta.icon;
                      return (
                        <View key={agent} style={[styles.agentChip, { backgroundColor: meta.color + '20', borderColor: meta.color + '40' }]}>
                          <Icon size={12} color={meta.color} />
                          <Text style={[styles.agentChipText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : (
              <>
                <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextAssistant]}>
                  {item.text}
                  {isStreaming && <Cursor />}
                </Text>
                {item.agentsUsed && item.agentsUsed.length > 0 && !isUser && (
                  <View style={styles.agentStrip}>
                    {item.agentsUsed.map((agent) => {
                      const meta = AGENT_META[agent] || { icon: Bot, color: '#64748b', label: agent };
                      const Icon = meta.icon;
                      return (
                        <View key={agent} style={[styles.agentChip, { backgroundColor: meta.color + '20', borderColor: meta.color + '40' }]}>
                          <Icon size={12} color={meta.color} />
                          <Text style={[styles.agentChipText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
                {item.isEmergency && (
                  <TouchableOpacity style={styles.emergencyButton} onPress={() => Linking.openURL(`tel:${item.emergencyNumber || '112'}`)}>
                    <Text style={styles.emergencyButtonText}>🚨 Emergency Detected — Call {item.emergencyNumber || '112'}</Text>
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

  const handleComingSoon = (feature) => {
    Alert.alert("Coming Soon", `${feature} is currently under development.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(main)/dashboard');
              }
            }} 
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color="#191c1e" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>AI Orchestrator</Text>
            <Text style={styles.headerSub}>Multi-Agent · All Specialties</Text>
          </View>
        </View>
        <TouchableOpacity onPress={resetChat} style={styles.resetBtn}>
          <Text style={styles.resetText}>New</Text>
        </TouchableOpacity>
      </View>

      {isProcessing && activeAgents.length > 0 && (
        <View style={styles.agentBanner}>
          <Brain size={16} color="#7c3aed" />
          <Text style={styles.agentBannerText}>
            Activating: {activeAgents.map(a => AGENT_META[a]?.label || a).join(', ')}
          </Text>
        </View>
      )}

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
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Describe your symptoms or health concern..."
              placeholderTextColor="rgba(67, 70, 85, 0.4)"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!input.trim() || loading}
            >
              <Send size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/(main)/dashboard')}>
          <LayoutDashboard size={20} color="#565e74" />
          <Text style={styles.navText}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItemActive} onPress={() => {}}>
          <Brain size={20} color="#ffffff" />
          <Text style={styles.navTextActive}>Orchestrator</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/(main)/triage-hub')}>
          <Activity size={20} color="#565e74" />
          <Text style={styles.navText}>Triage</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(main)/settings')}>
          <Settings size={20} color="#565e74" />
          <Text style={styles.navText}>Settings</Text>
        </TouchableOpacity>
      </View>
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#191c1e' },
  headerSub: { fontSize: 12, color: '#565e74', fontWeight: '500', marginTop: 1 },
  resetBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  resetText: { fontSize: 14, fontWeight: '700', color: '#7c3aed' },
  agentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#f5f3ff',
    borderBottomWidth: 1,
    borderBottomColor: '#ede9fe',
  },
  agentBannerText: { color: '#6d28d9', fontSize: 12, fontWeight: '600', flex: 1 },
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
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
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
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  msgBubble: { padding: 14, borderRadius: 16 },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  optionBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  optionBtnText: {
    color: '#7c3aed',
    fontSize: 14,
    fontWeight: '600',
  },
  msgBubbleUser: {
    backgroundColor: '#7c3aed',
    borderBottomRightRadius: 0,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  msgBubbleAssistant: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eceef0',
    borderBottomLeftRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  msgText: { fontSize: 15, lineHeight: 22 },
  msgTextUser: { color: '#ffffff' },
  msgTextAssistant: { color: '#191c1e' },
  agentStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  agentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  agentChipText: { fontSize: 11, fontWeight: '700' },
  inputContainer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 88 : 72,
    paddingTop: 8,
    backgroundColor: 'transparent',
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
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: '#191c1e',
    maxHeight: 80,
  },
  sendBtn: {
    backgroundColor: '#7c3aed',
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  emergencyButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  emergencyButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
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
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  navItemActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
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
  navTextActive: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  navText: { color: '#565e74', fontSize: 10, fontWeight: '600', marginTop: 4 },
});
