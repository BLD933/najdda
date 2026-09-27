import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-audio';
import * as Speech from 'expo-speech';
import apiClient from '../../../api/apiClient';

const LANG_MAP = {
  French: 'fr-FR',
  English: 'en-US',
  Arabic: 'ar-MA',
  'Moroccan Darija': 'ar-MA',
  Tamazight: 'ar-MA',
};

export function useVoiceMode({ onTranscribed, preferredLanguage = 'Arabic' }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recorderRef = useRef(null);

  const stopSpeaking = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback((text, lang) => {
    const clean = (text || '')
      .replace(/\[SEVERITY:.*?\]/g, '')
      .replace(/\[FOLLOWUP.*?\]/g, '')
      .replace(/\[OPTIONS:.*?\]/g, '')
      .trim();
    if (!clean) return;

    setIsSpeaking(true);
    Speech.speak(clean, {
      language: LANG_MAP[lang] || LANG_MAP[preferredLanguage] || 'ar-MA',
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [preferredLanguage]);

  const startRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestRecordingPermissionsAsync();
      if (status !== 'granted') return;

      const recorder = new Audio.Recorder({
        webm: {
          mimeType: 'audio/webm',
          bitrate: 128000,
        },
      });
      await recorder.prepareToRecordAsync();
      recorderRef.current = recorder;
      await recorder.startAsync();
      setIsRecording(true);
    } catch (err) {
      console.error('Voice recording error:', err.message);
      setIsRecording(false);
    }
  }, []);

  const stopRecordingAndTranscribe = useCallback(async () => {
    if (!recorderRef.current) return;
    setIsRecording(false);

    try {
      await recorderRef.current.stopAndUnloadAsync();
      const uri = recorderRef.current.getURI();
      recorderRef.current = null;
      if (!uri) return;

      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result?.split(',')[1]);
        reader.readAsDataURL(blob);
      });
      if (!base64) return;

      const result = await apiClient.post('/voice/transcribe', {
        audioBase64: base64,
        mimeType: 'audio/webm',
      });

      if (result.data?.text && onTranscribed) {
        onTranscribed(result.data.text);
      }
    } catch (err) {
      console.error('Voice transcription error:', err.message);
    }
  }, [onTranscribed]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecordingAndTranscribe();
    } else {
      Speech.stop();
      startRecording();
    }
  }, [isRecording, stopRecordingAndTranscribe, startRecording]);

  return { isRecording, isSpeaking, speak, stopSpeaking, toggleRecording };
}
