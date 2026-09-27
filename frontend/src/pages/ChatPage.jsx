import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, ShieldAlert, RotateCcw, Phone, Activity, Mic, MicOff } from 'lucide-react';
import apiClient from '../api/apiClient';
import { useAuth } from '../features/auth/context/AuthContext';
import ThemeToggle from '../features/theme/components/ThemeToggle';
import LanguageSwitcher from '../features/i18n/LanguageSwitcher';
import { useTranslation } from '../features/i18n/I18nContext';
import { useSpeechRecognition } from '../features/voice/hooks/useSpeechRecognition';
import { speak, stop as stopSpeech } from '../features/voice/services/speechService';

const EMERGENCY_BY_COUNTRY = {
  Morocco: '150', Algeria: '14', Tunisia: '190', France: '15', USA: '911', Canada: '911', UK: '999', Spain: '112',
};

export default function ChatPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [emergency, setEmergency] = useState(null);
  const [country, setCountry] = useState('Morocco');
  const bottomRef = useRef(null);

  const preferredLang = user?.profile?.preferredLanguage || 'Arabic';
  const { isListening, isSupported, start: startListening, stop: stopListening } = useSpeechRecognition({
    lang: preferredLang,
    onResult: (transcript, isFinal) => {
      if (isFinal) {
        setInput(transcript);
        setTimeout(() => {
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }, 100);
      } else {
        setInput(transcript);
      }
    },
  });

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      stopSpeech();
      startListening();
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    apiClient.get('/auth/me')
      .then((r) => setCountry(r.data?.profile?.country || 'Morocco'))
      .catch(() => {});
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data } = await apiClient.get('/orchestrator/history');
      const rows = (data.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
        isEmergency: m.metadata?.isEmergency || false,
        agentsUsed: m.metadata?.agentsUsed || [],
      }));
      setMessages(rows);
    } catch {
      /* history is a nice-to-have; a failure must not block the chat */
    }
  };

  const send = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    stopSpeech();
    setInput('');
    setSending(true);
    setMessages((m) => [...m, { role: 'user', content: text }]);

    try {
      const { data } = await apiClient.post('/orchestrator/chat', { message: text });
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: data.reply,
          isEmergency: data.isEmergency,
          agentsUsed: data.agentsUsed || [],
          followupMessage: data.followupMessage,
        },
      ]);
      if (data.isEmergency) {
        setEmergency({ number: data.emergencyNumber || EMERGENCY_BY_COUNTRY[country] || '112' });
      }
      if (data.reply && localStorage.getItem('najdda-tts-enabled') === 'true') {
        const replyLang = user?.profile?.preferredLanguage || 'Arabic';
        speak(data.reply, replyLang);
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: t('app.error.network'), error: true },
      ]);
    } finally {
      setSending(false);
    }
  };

  const reset = async () => {
    try {
      await apiClient.post('/orchestrator/reset');
    } catch { /* ignore */ }
    setMessages([]);
    setEmergency(null);
  };

  const emergencyNumber = EMERGENCY_BY_COUNTRY[country] || '112';
  const examples = [
    t('chat.empty.ex1'),
    t('chat.empty.ex2'),
    t('chat.empty.ex3'),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="z-sticky flex items-center gap-4 border-b border-line bg-surface px-6 py-4">
        <button onClick={() => navigate('/dashboard')} className="rounded-ui-sm p-1 text-ink-muted transition-colors hover:text-ink" aria-label={t('chat.backToDashboard')}>
          <ArrowLeft size={24} aria-hidden="true" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-black tracking-tight">{t('chat.title')}</h1>
          <p className="text-xs font-medium text-ink-muted">{t('chat.subtitle')}</p>
        </div>
        <button
          onClick={() => { if (window.confirm(t('chat.confirmClear'))) reset(); }}
          disabled={messages.length === 0}
          className="rounded-ui-sm p-1 text-ink-muted transition-colors hover:text-ink disabled:opacity-40"
          aria-label={t('chat.clear')}
          title={t('chat.clear')}
        >
          <RotateCcw size={20} aria-hidden="true" />
        </button>
        <LanguageSwitcher />
        <ThemeToggle />
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 && !sending && (
            <div className="mx-auto max-w-md py-10 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-ui-md bg-primary-subtle text-primary">
                <Activity size={30} aria-hidden="true" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">{t('chat.empty.title')}</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-ink-muted">
                {t('chat.empty.body')}
              </p>
              <ul className="mt-8 grid gap-3 text-left">
                {examples.map((ex) => (
                  <li key={ex}>
                    <button
                      type="button"
                      onClick={() => setInput(ex)}
                      className="w-full rounded-ui-md border border-line bg-surface px-4 py-3 text-left text-sm text-ink-subtle transition-colors hover:border-primary hover:text-ink"
                    >
                      « {ex} »
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-xs font-bold uppercase tracking-widest text-ink-subtle">
                {t('chat.empty.notEmergency')}
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                {t('chat.empty.emergencyText')}{' '}
                <a href={`tel:${emergencyNumber}`} className="font-bold text-emergency underline">
                  {t('chat.empty.callNow', { number: emergencyNumber })}
                </a>
                .
              </p>
            </div>
          )}

          <div role="log" aria-live="polite" aria-label={t('chat.log')} className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-ui-lg px-5 py-3 ${
                  m.role === 'user'
                    ? 'rounded-br-ui-sm bg-primary text-on-primary'
                    : `rounded-bl-ui-sm border-2 border-line bg-surface ${m.error ? 'border-emergency text-on-emergency-subtle' : ''}`
                }`}>
                  {m.isEmergency && (
                    <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-on-emergency-subtle">
                      <ShieldAlert size={16} aria-hidden="true" /> {t('chat.emergencyDetected')}
                    </div>
                  )}
                  {/* The agent's own reply is passed through untouched: the
                      backend already answers in the language the patient wrote
                      in (AR / Darija / FR / EN). Translating it here would
                      overwrite the agent's answer with a UI locale. */}
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  {m.agentsUsed?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.agentsUsed.map((a) => (
                        <span key={a} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-ui-lg rounded-bl-ui-sm border-2 border-line bg-surface px-5 py-3 text-ink-muted">
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" /> {t('chat.consulting')}
                </div>
              </div>
            )}
          </div>

          {emergency && (
            <div className="mt-4 rounded-ui-xl bg-emergency p-6 text-on-emergency shadow-card-hover">
              <h2 className="mb-2 text-xl font-black">{t('chat.emergencyTitle')}</h2>
              <p className="mb-4 text-on-emergency/90">{t('chat.emergencyBody')}</p>
              <a
                href={`tel:${emergency.number}`}
                className="inline-flex items-center gap-2 rounded-ui-md bg-surface px-6 py-3 font-black text-emergency transition-colors hover:bg-emergency-subtle"
              >
                <Phone size={20} aria-hidden="true" /> {t('chat.call', { number: emergency.number })}
              </a>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      <form onSubmit={send} className="z-sticky border-t border-line bg-surface px-4 py-4">
        <div className="mx-auto flex max-w-3xl gap-3">
          <label htmlFor="chat-input" className="sr-only">{t('chat.inputLabel')}</label>
          <input
            id="chat-input"
            value={input}
            onChange={(e) => { stopSpeech(); setInput(e.target.value); }}
            placeholder={t('chat.inputPlaceholder')}
            disabled={sending}
            className="flex-1 rounded-full border-2 border-line-strong bg-canvas px-5 py-3 text-ink transition-colors placeholder:text-ink-subtle focus:border-primary focus-visible:outline-none disabled:opacity-50"
          />
          {isSupported && (
            <button
              type="button"
              onClick={handleMicToggle}
              disabled={sending}
              className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-40 ${
                isListening
                  ? 'animate-pulse border-emergency bg-emergency text-on-emergency'
                  : 'border-line-strong bg-surface text-ink hover:border-primary'
              }`}
              aria-label={isListening ? t('chat.mic.stop') : t('chat.mic.start')}
            >
              {isListening ? <MicOff size={20} aria-hidden="true" /> : <Mic size={20} aria-hidden="true" />}
            </button>
          )}
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-40"
            aria-label={t('chat.send')}
          >
            {sending ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Send size={20} aria-hidden="true" />}
          </button>
        </div>
      </form>
    </div>
  );
}
