import { useState, useCallback, useRef, useEffect } from 'react';

const LANG_MAP = {
  French: 'fr-FR',
  English: 'en-US',
  Arabic: 'ar-MA',
  'Moroccan Darija': 'ar-MA',
  Tamazight: 'ar-MA',
};

export function useSpeechRecognition({ onResult, lang = 'fr-FR' } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SR);
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = LANG_MAP[lang] || lang;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join('');
      if (onResult) onResult(transcript, event.results[event.results.length - 1].isFinal);
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [lang, onResult]);

  useEffect(() => () => stop(), [stop]);

  return { isListening, isSupported, start, stop };
}
