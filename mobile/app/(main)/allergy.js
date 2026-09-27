import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Send, Sparkles, Wind, Droplets, ThermometerSun, Paperclip, X } from 'lucide-react-native';
import allergyService from '../../src/features/allergy/services/allergyService';
import { useAuth } from '../../src/features/auth/context/AuthContext';
import { pickChatImage } from '../../src/features/chat/utils/chatMedia';
import EmergencyModal from '../../src/features/chat/components/EmergencyModal';
import conversationService from '../../src/features/chat/services/conversationService';
import { scheduleLocalFollowup } from '../../src/features/chat/services/localFollowupService';
import { useChatFollowup } from '../../src/features/chat/hooks/useChatFollowup';

export default function AllergyChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const scrollViewRef = useRef();

  const [messages, setMessages] = useState([
    {
      id: '0',
      role: 'assistant',
      text: 'Bonjour ! 👋 Je suis votre assistant Allergies. Quels sont vos symptômes aujourd\'hui ?',
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastStatus, setLastStatus] = useState(null);
  const [symptomHistory, setSymptomHistory] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [emergencyInfo, setEmergencyInfo] = useState(null);
  useChatFollowup('allergy', setMessages);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  useEffect(() => {
    conversationService.getHistory('allergy').then((history) => {
      if (history.length) setMessages(history.map((item) => ({ ...item.metadata, id: item.id, role: item.role, text: item.content })));
    }).catch(() => {});
  }, []);

  const extractSymptoms = (text) => {
    // Simple mock extraction for now. Groq handles the rest.
    return [text.substring(0, 50)];
  };

  const handlePickImage = async () => {
    const image = await pickChatImage();
    if (image) setSelectedImage(image);
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;

    const text = input.trim();
    setInput('');
    const base64Image = selectedImage ? selectedImage.split(',')[1] : null;
    
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', text, imageUri: selectedImage }]);
    setSelectedImage(null);
    setLoading(true);

    try {
      const newSymptoms = [...symptomHistory, ...extractSymptoms(text)];
      setSymptomHistory(newSymptoms);

      const chatHistory = messages.map(m => ({ role: m.role, text: m.text }));

      // Ideally get city from user.profile, but fallback to 'Fes'
      const city = user?.profile?.city?.trim() || 'Casablanca';

      const result = await allergyService.check({
        symptoms: newSymptoms,
        history: chatHistory,
        message: text,
        city,
        imageBase64: base64Image
      });

      if (result.requires_followup && result.followup_message) {
        await scheduleLocalFollowup('allergy', 'Suivi allergie SHIFAA', result.followup_message, text, result.followup_time_minutes);
      }

      setLastStatus({
        status: result.status,
        risk: result.allergy_risk,
        cause: result.likely_cause,
        meta: result.meta,
      });

      let lines = [];
      if (result.message) {
        lines.push(result.message);
      }
      
      if (result.advice && result.advice.length > 0) {
        lines.push('', '💡 Conseils :');
        result.advice.forEach(a => lines.push(`• ${a}`));
      }

      if (result.when_to_act) {
        lines.push('', `⚠️ ${result.when_to_act}`);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: lines.join('\\n'),
          isEmergency: result.isEmergency,
          emergencyNumber: result.emergencyNumber,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: 'Désolé, je rencontre un problème de connexion. Veuillez réessayer.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBanner = () => {
    if (!lastStatus) return null;

    const statusColors = {
      normal: { bg: '#ecfdf5', border: '#10b981', text: '#065f46' },
      warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
      danger: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
    };
    const c = statusColors[lastStatus.status] || statusColors.normal;

    return (
      <View style={[styles.statusBanner, { backgroundColor: c.bg, borderColor: c.border }]}>
        <View style={styles.statusRow}>
          <Text style={[styles.statusTitle, { color: c.text }]}>
            Risque : {lastStatus.risk.toUpperCase()}
          </Text>
          <Text style={[styles.statusSub, { color: c.text }]}>
            Cause prob. : {lastStatus.cause}
          </Text>
        </View>
        
        {lastStatus.meta?.airQuality && (
          <View style={styles.metaRow}>
            <Wind size={14} color={c.text} />
            <Text style={[styles.metaText, { color: c.text }]}>
              AQI: {lastStatus.meta.airQuality.aqi} ({lastStatus.meta.airQuality.level})
            </Text>
            <Sparkles size={14} color={c.text} style={{marginLeft: 10}} />
            <Text style={[styles.metaText, { color: c.text }]}>
              Pollen: {lastStatus.meta.airQuality.pollenLevel}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#191c1e" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Allergies</Text>
          <Text style={styles.headerSub}>Analyse pollen & pollution</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {renderStatusBanner()}

      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <View
              key={msg.id}
              style={[
                styles.bubbleWrap,
                isUser ? styles.bubbleWrapUser : styles.bubbleWrapBot,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  isUser ? styles.bubbleUser : styles.bubbleBot,
                ]}
              >
                {msg.imageUri && (
                  <Image source={{ uri: msg.imageUri }} style={{ width: 200, height: 200, borderRadius: 12, marginBottom: 8 }} />
                )}
                {!!msg.text && (
                  <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
                    {msg.text}
                  </Text>
                )}
                {msg.isEmergency && msg.emergencyNumber && (
                  <TouchableOpacity 
                    style={styles.emergencyButton} 
                    onPress={() => setEmergencyInfo({ number: msg.emergencyNumber })}
                  >
                    <Text style={styles.emergencyButtonText}>Appeler les Urgences ({msg.emergencyNumber})</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
        {loading && (
          <View style={[styles.bubbleWrap, styles.bubbleWrapBot]}>
            <View style={[styles.bubble, styles.bubbleBot, { padding: 16 }]}>
              <ActivityIndicator size="small" color="#b45309" />
              <Text style={styles.loadingText}>Analyse de l'air en cours...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView
        style={{ flex: 1, maxHeight: selectedImage ? 160 : 80 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {selectedImage && (
          <View style={{ padding: 12, backgroundColor: '#f8fafc', flexDirection: 'row', alignItems: 'center' }}>
            <Image source={{ uri: selectedImage }} style={{ width: 60, height: 60, borderRadius: 8 }} />
            <TouchableOpacity onPress={() => setSelectedImage(null)} style={{ marginLeft: 12, backgroundColor: '#f1f5f9', padding: 8, borderRadius: 20 }}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputArea}>
          <TouchableOpacity style={{ marginRight: 12, padding: 8, backgroundColor: '#f1f5f9', borderRadius: 20 }} onPress={handlePickImage}>
            <Paperclip size={24} color="#64748b" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Décrivez vos symptômes..."
            placeholderTextColor="#94a3b8"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() && !selectedImage) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={(!input.trim() && !selectedImage) || loading}
          >
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <EmergencyModal visible={Boolean(emergencyInfo)} emergencyNumber={emergencyInfo?.number} onClose={() => setEmergencyInfo(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#b45309', textAlign: 'center' },
  headerSub: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 2 },
  statusBanner: {
    margin: 16,
    marginBottom: 0,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statusTitle: { fontWeight: '700', fontSize: 14 },
  statusSub: { fontWeight: '600', fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  metaText: { fontSize: 12, marginLeft: 4, fontWeight: '500' },
  chatArea: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 32 },
  bubbleWrap: { marginBottom: 16, flexDirection: 'row' },
  bubbleWrapUser: { justifyContent: 'flex-end' },
  bubbleWrapBot: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  bubbleUser: {
    backgroundColor: '#b45309',
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  bubbleText: { fontSize: 15, lineHeight: 22, color: '#334155' },
  bubbleTextUser: { color: '#fff' },
  loadingText: { color: '#64748b', fontSize: 13, marginTop: 8, fontStyle: 'italic' },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    maxHeight: 100,
    minHeight: 44,
    fontSize: 15,
    color: '#0f172a',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#b45309',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sendBtnDisabled: {
    backgroundColor: '#cbd5e1',
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
