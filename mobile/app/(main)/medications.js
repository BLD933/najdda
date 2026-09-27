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
import { ChevronLeft, Send, Sparkles, Pill, AlertTriangle, Info, Paperclip, X } from 'lucide-react-native';
import { checkInteractions } from '../../src/features/medications/services/drugService';
import { pickChatImage } from '../../src/features/chat/utils/chatMedia';
import EmergencyModal from '../../src/features/chat/components/EmergencyModal';
import conversationService from '../../src/features/chat/services/conversationService';
import { scheduleLocalFollowup } from '../../src/features/chat/services/localFollowupService';
import { useChatFollowup } from '../../src/features/chat/hooks/useChatFollowup';

export default function MedicationsChatScreen() {
  const router = useRouter();
  const scrollViewRef = useRef();

  const [messages, setMessages] = useState([
    {
      id: '0',
      role: 'assistant',
      text: 'Bonjour ! 👋 Je suis là pour vérifier les interactions entre vos médicaments et vous alerter sur les effets secondaires. Vous pouvez lister vos médicaments actuels en haut, puis me poser vos questions.',
    },
  ]);

  const [input, setInput] = useState('');
  const [medicationsList, setMedicationsList] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastStatus, setLastStatus] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [emergencyInfo, setEmergencyInfo] = useState(null);
  useChatFollowup('medications', setMessages);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  useEffect(() => {
    conversationService.getHistory('medications').then((history) => {
      if (history.length) setMessages(history.map((item) => ({ ...item.metadata, id: item.id, role: item.role, text: item.content })));
    }).catch(() => {});
  }, []);

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
      const chatHistory = messages.map(m => ({ role: m.role, text: m.text }));
      
      const medsArray = medicationsList
        .split(',')
        .map(m => m.trim())
        .filter(m => m.length > 0);

      const result = await checkInteractions(text, chatHistory, medsArray, base64Image);

      if (result.requires_followup && result.followup_message) {
        await scheduleLocalFollowup('medications', 'Suivi médicaments SHIFAA', result.followup_message, text, result.followup_time_minutes);
      }

      setLastStatus({
        status: result.status,
        risk: result.risk,
        meta: result.meta,
      });

      let lines = [];
      
      if (result.meta?.interactionsFound > 0) {
        lines.push(`⚠️ **Interactions détectées :** ${result.meta.interactionsFound}\\n`);
      }

      if (result.advice && result.advice.length > 0) {
        lines.push('💡 **Conseils :**');
        result.advice.forEach(a => lines.push(`• ${a}`));
      }

      if (result.consult) {
        lines.push('', `🚨 **Consultation :** ${result.consult}`);
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
          text: 'Désolé, une erreur est survenue lors de l\'analyse. Veuillez réessayer.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status, risk) => {
    if (status === 'danger' || risk === 'high') return '#ef4444'; // red-500
    if (status === 'warning' || risk === 'medium') return '#f59e0b'; // amber-500
    return '#10b981'; // emerald-500
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ChevronLeft size={28} color="#4f46e5" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Interactions Médic.</Text>
          <Text style={styles.headerSubtitle}>Vérificateur de sécurité</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Persistent Medications Profile */}
      <View style={styles.profileContainer}>
        <View style={styles.profileHeader}>
          <Pill size={18} color="#4f46e5" style={{ marginRight: 6 }} />
          <Text style={styles.profileTitle}>Vos médicaments actuels</Text>
        </View>
        <Text style={styles.profileHint}>Séparez-les par une virgule (ex: Ibuprofène, Aspirine)</Text>
        <TextInput
          style={styles.medsInput}
          placeholder="Ex: Paracétamol, Spasfon..."
          value={medicationsList}
          onChangeText={setMedicationsList}
          placeholderTextColor="#9ca3af"
        />
        
        {lastStatus && lastStatus.meta && (
          <View style={[styles.statusBanner, { backgroundColor: getStatusColor(lastStatus.status, lastStatus.risk) + '15', borderColor: getStatusColor(lastStatus.status, lastStatus.risk) }]}>
            {lastStatus.status === 'danger' ? (
              <AlertTriangle size={18} color={getStatusColor(lastStatus.status, lastStatus.risk)} />
            ) : (
              <Info size={18} color={getStatusColor(lastStatus.status, lastStatus.risk)} />
            )}
            <Text style={[styles.statusText, { color: getStatusColor(lastStatus.status, lastStatus.risk) }]}>
              {lastStatus.meta.interactionsFound > 0 
                ? `${lastStatus.meta.interactionsFound} interaction(s) trouvée(s)` 
                : 'Aucune interaction majeure détectée (NIH)'}
            </Text>
          </View>
        )}
      </View>

      {/* Chat Area */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              {msg.role === 'assistant' && (
                <View style={styles.botIconContainer}>
                  <Sparkles size={16} color="#fff" />
                </View>
              )}
              {msg.imageUri && (
                <Image source={{ uri: msg.imageUri }} style={{ width: 180, height: 180, borderRadius: 12, marginBottom: 8, marginRight: msg.role === 'assistant' ? 0 : 0 }} />
              )}
              {!!msg.text && (
                <Text
                  style={[
                    styles.messageText,
                    msg.role === 'user' ? styles.userText : styles.assistantText,
                  ]}
                >
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
          ))}
          {loading && (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <View style={styles.botIconContainer}>
                <Sparkles size={16} color="#fff" />
              </View>
              <ActivityIndicator size="small" color="#4f46e5" style={{ marginHorizontal: 10 }} />
            </View>
          )}
        </ScrollView>

        {selectedImage && (
          <View style={{ padding: 12, backgroundColor: '#f8fafc', flexDirection: 'row', alignItems: 'center' }}>
            <Image source={{ uri: selectedImage }} style={{ width: 60, height: 60, borderRadius: 8 }} />
            <TouchableOpacity onPress={() => setSelectedImage(null)} style={{ marginLeft: 12, backgroundColor: '#f1f5f9', padding: 8, borderRadius: 20 }}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity style={{ marginRight: 12, padding: 8, backgroundColor: '#f1f5f9', borderRadius: 20 }} onPress={handlePickImage}>
            <Paperclip size={24} color="#4f46e5" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Posez votre question (ex: J'ai mal au ventre...)"
            value={input}
            onChangeText={setInput}
            multiline
            placeholderTextColor="#9ca3af"
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() && !selectedImage) && styles.sendButtonDisabled]}
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
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  profileContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  profileTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  profileHint: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
  },
  medsInput: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  keyboardView: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#4f46e5',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  botIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#334155',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 45,
    maxHeight: 100,
    fontSize: 15,
    color: '#1e293b',
  },
  sendButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginBottom: 0,
  },
  sendButtonDisabled: {
    backgroundColor: '#a5b4fc',
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
