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
  Linking,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Send, Sparkles, Pill, Paperclip, X, CheckCircle, AlertTriangle, AlertCircle, Phone } from 'lucide-react-native';
import pregnancyService from '../../src/features/pregnancy/services/pregnancyService';
import { pickChatImage } from '../../src/features/chat/utils/chatMedia';
import EmergencyModal from '../../src/features/chat/components/EmergencyModal';
import conversationService from '../../src/features/chat/services/conversationService';
import { scheduleLocalFollowup } from '../../src/features/chat/services/localFollowupService';
import { useChatFollowup } from '../../src/features/chat/hooks/useChatFollowup';

const TRIMESTERS = [
  { value: '1', label: 'T1', full: '1er trimestre' },
  { value: '2', label: 'T2', full: '2e trimestre' },
  { value: '3', label: 'T3', full: '3e trimestre' },
];

const STATUS_COLORS = {
  normal: { bg: '#ecfdf5', text: '#065f46', border: '#d1fae5', icon: CheckCircle, label: 'Normal' },
  warning: { bg: '#fffbeb', text: '#92400e', border: '#fef3c7', icon: AlertTriangle, label: 'Attention' },
  danger: { bg: '#fef2f2', text: '#991b1b', border: '#fee2e2', icon: AlertCircle, label: 'Danger' },
};

const RISK_LABELS = { low: 'Risque faible', medium: 'Risque modéré', high: 'Risque élevé' };

const QUICK_ACTIONS = [
  { label: 'Nausées', emoji: '🤢' },
  { label: 'Douleur', emoji: '💊' },
  { label: 'Alimentation', emoji: '🍎' },
  { label: 'Fatigue', emoji: '😴' },
  { label: 'Urgence', emoji: '🚨', isDanger: true },
];

function formatAssistantReply(result) {
  const status = STATUS_COLORS[result.status] || STATUS_COLORS.warning;
  const lines = [
    `📋 ${status.label} · ${RISK_LABELS[result.risk] || result.risk}`,
    '',
    ...(result.advice || []).map((a, i) => `${i + 1}. ${a}`),
    '',
    `👩‍⚕️ ${result.consult || ''}`,
  ];
  if (result.meta?.medicationChecked) {
    lines.push(
      '',
      `💊 Médicament analysé: ${result.meta.medicationChecked}${result.meta.fdaFound ? '' : ' (non trouvé dans la base FDA)'}`
    );
  }
  if (result.meta?.foodChecked) {
    lines.push(
      '',
      `🍏 Aliment analysé: ${result.meta.foodChecked}${result.meta.foodFound ? '' : ' (non trouvé dans Open Food Facts)'}`
    );
  }
  return lines.join('\n');
}

export default function PregnancyScreen() {
  const router = useRouter();
  const flatListRef = useRef(null);
  const [trimester, setTrimester] = useState('2');
  const [medication, setMedication] = useState('');
  const [messages, setMessages] = useState([
    {
      id: '0',
      role: 'assistant',
      text: "Bonjour. Je suis votre assistante SHIFAA. Comment puis-je vous aider aujourd'hui ? Vous pouvez me poser des questions sur vos symptômes, l'alimentation ou vérifier un médicament.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastStatus, setLastStatus] = useState(null);
  const [symptomHistory, setSymptomHistory] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [emergencyInfo, setEmergencyInfo] = useState(null);
  useChatFollowup('pregnancy', setMessages);

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    conversationService.getHistory('pregnancy').then((history) => {
      if (history.length) setMessages(history.map((item) => ({ ...item.metadata, id: item.id, role: item.role, text: item.content, timestamp: item.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })));
    }).catch(() => {});
  }, []);

  const handlePickImage = async () => {
    const image = await pickChatImage();
    if (image) setSelectedImage(image);
  };

  const handleQuickAction = (action) => {
    if (action.isDanger) {
      setEmergencyInfo({ number: '15' });
    } else {
      setInput((prev) => prev + (prev ? ', ' : '') + action.label);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if ((!text && !selectedImage) || loading) return;

    const base64Image = selectedImage ? selectedImage.split(',')[1] : null;
    const userMsg = { 
      id: Date.now().toString(), 
      role: 'user', 
      text, 
      imageUri: selectedImage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const assistantId = (Date.now() + 1).toString();
    const newSymptoms = [...symptomHistory, text];

    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', text: '', isTyping: true }]);
    setSymptomHistory(newSymptoms);
    setInput('');
    setSelectedImage(null);
    setLoading(true);

    try {
      const result = await pregnancyService.check({
        trimester,
        symptoms: newSymptoms,
        medication,
        message: text,
        imageBase64: base64Image,
      });

      if (result.requires_followup && result.followup_message) {
        await scheduleLocalFollowup('pregnancy', 'Suivi grossesse SHIFAA', result.followup_message, text, result.followup_time_minutes);
      }

      setLastStatus(result.status);
      const reply = formatAssistantReply(result);
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { 
          ...m, 
          text: reply, 
          isTyping: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          result,
          isEmergency: result.isEmergency,
          emergencyNumber: result.emergencyNumber 
        } : m))
      );
    } catch (err) {
      const errMsg =
        err.response?.data?.message || err.message || 'Erreur de connexion. Réessayez.';
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, isTyping: false, text: `Désolé: ${errMsg}` } : m))
      );
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    conversationService.clearHistory('pregnancy').catch(() => {});
    setSymptomHistory([]);
    setMedication('');
    setLastStatus(null);
    setMessages([
      {
        id: '0',
        role: 'assistant',
        text: "Bonjour. Je suis votre assistante SHIFAA. Comment puis-je vous aider aujourd'hui ? Vous pouvez me poser des questions sur vos symptômes, l'alimentation ou vérifier un médicament.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const renderMessage = ({ item }) => {
    if (item.isTyping) {
      return (
        <View style={[styles.msgRow, styles.msgRowAssistant]}>
          <View style={styles.assistantAvatar}>
            <Sparkles size={18} color="#ffffff" />
          </View>
          <View style={[styles.msgBubble, styles.msgBubbleAssistant, { paddingVertical: 16 }]}>
            <ActivityIndicator size="small" color="#880e4f" />
          </View>
        </View>
      );
    }

    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
        {!isUser && (
          <View style={styles.assistantAvatar}>
            <Sparkles size={18} color="#ffffff" />
          </View>
        )}
        <View style={isUser ? styles.userMessageContainer : styles.assistantMessageContainer}>
          <View style={[styles.msgBubble, isUser ? styles.msgBubbleUser : styles.msgBubbleAssistant]}>
            {item.imageUri && (
              <Image source={{ uri: item.imageUri }} style={styles.messageImage} />
            )}
            {!!item.text && (
              <Text style={[styles.msgText, isUser && styles.msgTextUser]}>{item.text}</Text>
            )}
            {item.isEmergency && item.emergencyNumber && (
              <TouchableOpacity 
                style={styles.emergencyButton} 
                onPress={() => setEmergencyInfo({ number: item.emergencyNumber })}
              >
                <Phone size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.emergencyButtonText}>Appeler les Urgences ({item.emergencyNumber})</Text>
              </TouchableOpacity>
            )}
          </View>
          {item.timestamp && (
            <Text style={[styles.msgTimestamp, isUser && styles.msgTimestampUser]}>{item.timestamp}</Text>
          )}
        </View>
        {isUser && (
          <View style={styles.userAvatar}>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAU6PNq3I5pbxGu1Erptki2LQyC28LyaAXGSiR20dH7vZF9a7TJ9z193FB0RV1l8VVDsHjMdRKW0EzA6wJ4qK4bU0Waawqa9vY3fn80WzP-XLhtFD8YjaMLOagn2FMIzd5uSxpD0dhlTtwPo-Ip3ts2JEgHQNDZGHdLMU9NcBXWQmNGyn6AhzFVrOaHibzK1g4zuJKhKva2evyr2EH2AqcdPaTUkNUNw-6J7FZE9huZucCMGtEgFKQ6-rysRzT4SH_kjXZvuXiPTrg' }}
              style={styles.avatarImage}
            />
          </View>
        )}
      </View>
    );
  };

  const statusStyle = lastStatus ? STATUS_COLORS[lastStatus] : null;
  const StatusIcon = statusStyle?.icon;

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#880e4f" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Femmes enceintes</Text>
            <Text style={styles.headerSub}>Sécurité grossesse</Text>
          </View>
        </View>
        <TouchableOpacity onPress={resetChat} style={styles.newBtn}>
          <Text style={styles.resetText}>New</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {/* 2. Status Banner */}
        {statusStyle && lastStatus !== 'normal' && (
          <View style={styles.statusBannerContainer}>
            <View style={[styles.statusBanner, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
              <View style={styles.statusBannerLeft}>
                <View style={[styles.statusIconBox, { backgroundColor: statusStyle.text }]}>
                  <StatusIcon size={16} color="#ffffff" />
                </View>
                <Text style={[styles.statusBannerText, { color: statusStyle.text }]}>
                  {statusStyle.label} · {RISK_LABELS[lastStatus === 'danger' ? 'high' : 'medium']}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 3. Trimester Selector */}
        <View style={styles.trimesterSection}>
          <Text style={styles.trimesterLabel}>Trimestre</Text>
          <View style={styles.trimesterChips}>
            {TRIMESTERS.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.trimesterChip, trimester === t.value && styles.trimesterChipActive]}
                onPress={() => setTrimester(t.value)}
              >
                <Text
                  style={[
                    styles.trimesterChipText,
                    trimester === t.value && styles.trimesterChipTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 4. Medication Quick-Input */}
        <View style={styles.medSection}>
          <View style={styles.medInputWrapper}>
            <View style={styles.medIconBox}>
              <Pill size={20} color="#880e4f" />
            </View>
            <TextInput
              style={styles.medInput}
              value={medication}
              onChangeText={setMedication}
              placeholder="Médicament à vérifier (optionnel)"
              placeholderTextColor="rgba(67, 70, 85, 0.4)"
            />
          </View>
        </View>

        {/* 5. Quick Action Chips */}
        <View style={styles.quickActionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsScroll}>
            {QUICK_ACTIONS.map((action, index) => (
              <TouchableOpacity 
                key={index} 
                style={[styles.quickActionChip, action.isDanger && styles.quickActionDanger]}
                onPress={() => handleQuickAction(action)}
              >
                <Text style={[styles.quickActionText, action.isDanger && styles.quickActionTextDanger]}>
                  {action.label} <Text style={{ fontSize: 16 }}>{action.emoji}</Text>
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 6. Chat Message List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      </View>

      {/* 7. Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputAreaWrapper}>
          {selectedImage && (
            <View style={styles.selectedImagePreview}>
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
              <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.removeImageBtn}>
                <X size={16} color="#880e4f" />
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.inputBar}>
            <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage}>
              <Paperclip size={24} color="#880e4f" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Symptômes, médicament ou aliment..."
              placeholderTextColor="rgba(25, 28, 30, 0.4)"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, ((!input.trim() && !selectedImage) || loading) && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={(!input.trim() && !selectedImage) || loading}
            >
              <Send size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      <EmergencyModal visible={Boolean(emergencyInfo)} emergencyNumber={emergencyInfo?.number} onClose={() => setEmergencyInfo(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    zIndex: 50,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { 
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { flexDirection: 'column' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#191C1E', lineHeight: 22 },
  headerSub: { fontSize: 12, color: 'rgba(67, 70, 85, 0.8)' },
  newBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resetText: { fontSize: 13, fontWeight: '700', color: '#880e4f' },
  
  statusBannerContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  statusBanner: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBannerText: { fontSize: 13, fontWeight: '600' },
  
  trimesterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 24,
  },
  trimesterLabel: { fontSize: 16, fontWeight: '600', color: '#880e4f' },
  trimesterChips: { 
    flexDirection: 'row', 
    backgroundColor: '#ffffff',
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: '#fce4ec',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  trimesterChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
  },
  trimesterChipActive: { backgroundColor: '#880e4f', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  trimesterChipText: { fontSize: 13, fontWeight: '600', color: '#565e74' },
  trimesterChipTextActive: { color: '#ffffff' },
  
  medSection: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  medInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(252, 228, 236, 0.5)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medIconBox: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(136, 14, 79, 0.1)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medInput: { flex: 1, fontSize: 16, color: '#191C1E', paddingVertical: 0 },
  
  quickActionsContainer: {
    marginTop: 24,
    marginBottom: 8,
  },
  quickActionsScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fce4ec',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  quickActionDanger: {
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#191c1e',
  },
  quickActionTextDanger: {
    color: '#dc2626',
    fontWeight: '700',
  },

  msgList: { paddingHorizontal: 20, paddingBottom: 120, gap: 24 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', maxWidth: '85%' },
  msgRowUser: { alignSelf: 'flex-end' },
  msgRowAssistant: { alignSelf: 'flex-start' },
  
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#880e4f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarImage: { width: '100%', height: '100%' },
  
  assistantMessageContainer: { flex: 1 },
  userMessageContainer: { flex: 1, alignItems: 'flex-end' },
  
  msgBubble: { padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  msgBubbleUser: { backgroundColor: '#880e4f', borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 4 },
  msgBubbleAssistant: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomRightRadius: 18, borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#fce4ec',
  },
  msgText: { fontSize: 16, lineHeight: 24, color: '#191c1e' },
  msgTextUser: { color: '#ffffff' },
  msgTimestamp: { fontSize: 10, color: 'rgba(67, 70, 85, 0.6)', marginTop: 8 },
  msgTimestampUser: { textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)' },
  
  messageImage: { width: 200, height: 200, borderRadius: 12, marginBottom: 8 },
  emergencyButton: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  emergencyButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  
  inputAreaWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(252, 228, 236, 0.8)',
    borderRadius: 24,
    padding: 8,
    shadowColor: '#880e4f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  selectedImagePreview: { padding: 8, backgroundColor: '#fdf2f8', flexDirection: 'row', alignItems: 'center', borderRadius: 16, marginBottom: 8 },
  previewImage: { width: 60, height: 60, borderRadius: 8 },
  removeImageBtn: { marginLeft: 12, backgroundColor: '#fce4ec', padding: 8, borderRadius: 20 },
  
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachBtn: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(252, 228, 236, 0.5)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 16,
    color: '#191C1E',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#880e4f',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sendBtnDisabled: { opacity: 0.4 },
});
