import { useState, useCallback, useRef, useEffect } from 'react';

const LANG_MAP = {
  French: 'fr-FR',
  English: 'en-US',
  Arabic: 'ar-MA',
  'Moroccan Darija': 'ar-MA',
  Tamazight: 'ar-MA',
  fr: 'fr-FR',
  en: 'en-US',
  ar: 'ar-MA',
  ary: 'ar-MA',
  tzm: 'ar-MA',
};

export function useSpeechRecognition({ onResult, lang = 'fr-FR' } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);

  // `onResult` is a fresh arrow function on every parent render. Holding it in
  // a ref keeps `start` stable, so the unmount-only cleanup below is not
  // re-run mid-dictation — which used to stop recognition one frame after it
  // started (setIsListening re-render → new `start` → old cleanup → stop()).
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  });

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
      if (onResultRef.current) {
        onResultRef.current(transcript, event.results[event.results.length - 1].isFinal);
      }
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
  }, [lang]);

  useEffect(() => () => stop(), [stop]);

  return { isListening, isSupported, start, stop };
}
