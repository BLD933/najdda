import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, ShieldAlert, RotateCcw, Phone, Activity, Mic, MicOff } from 'lucide-react';
import DirIcon from '../components/ui/dir-icon';
import apiClient from '../api/apiClient';
import { useAuth } from '../features/auth/context/AuthContext';
import ThemeToggle from '../features/theme/components/ThemeToggle';
import LanguageSwitcher from '../features/i18n/LanguageSwitcher';
import { useTranslation } from '../features/i18n/I18nContext';
import { useSpeechRecognition } from '../features/voice/hooks/useSpeechRecognition';
import { speak, stop as stopSpeech } from '../features/voice/services/speechService';
import { getEmergencyNumber } from '../utils/emergency';
import { readStore } from '../utils/storage';



export default function ChatPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [emergency, setEmergency] = useState(null);
  const [failedText, setFailedText] = useState(null);
  const [country, setCountry] = useState('Morocco');
  const bottomRef = useRef(null);

  const preferredLang = user?.profile?.preferredLanguage || 'Arabic';
  const sendRef = useRef(null);
  const { isListening, isSupported, start: startListening, stop: stopListening } = useSpeechRecognition({
    lang: preferredLang,
    onResult: (transcript, isFinal) => {
      if (isFinal) {
        setInput(transcript);
        sendRef.current?.(null, transcript);
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
    const el = bottomRef.current;
    if (!el) return;
    const nearBottom = el.getBoundingClientRect().top - window.innerHeight < 300;
    if (nearBottom) el.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setCountry(user?.profile?.country || 'Morocco');
    const controller = new AbortController();
    let cancelled = false;
    apiClient
      .get('/orchestrator/history', { signal: controller.signal })
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
          isEmergency: m.metadata?.isEmergency || false,
          agentsUsed: m.metadata?.agentsUsed || [],
        }));
        // Never clobber a message the patient already sent: the history request
        // is in flight while the first reply is being composed, and it used to
        // land afterwards and wipe the live conversation from the screen.
        setMessages((prev) => (prev.length > 0 ? prev : rows));
      })
      .catch(() => {
        /* history is a nice-to-have; a failure must not block the chat */
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A reply still being read aloud after the patient navigated away is noise
  // on the next screen.
  useEffect(() => () => stopSpeech(), []);

  const send = async (e, overrideText) => {
    e?.preventDefault();
    const text = (typeof overrideText === 'string' ? overrideText : input).trim();
    if (!text || sending) return;

    stopSpeech();
    setInput('');
    setSending(true);
    setMessages((m) => [...m, { role: 'user', content: text }]);

    try {
      const { data } = await apiClient.post('/orchestrator/chat', { message: text });
      // The safety gateway short-circuits before the orchestrator and answers
      // { isEmergency, advice, consult, raison } with NO `reply`. Without this
      // fallback the bubble rendered empty while carrying the emergency badge —
      // the safety instructions the backend wrote were never shown.
      const body = data.reply
        || data.consult
        || (Array.isArray(data.advice) && data.advice.length ? data.advice.join('\n') : null)
        || data.raison
        || t('chat.emergencyBody');
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: body,
          isEmergency: data.isEmergency,
          agentsUsed: data.agentsUsed || [],
          followupMessage: data.followupMessage,
          followupTimeMinutes: data.followupTimeMinutes,
        },
      ]);
      if (data.isEmergency) {
        setEmergency({ number: data.emergencyNumber || getEmergencyNumber(country) });
      } else {
        setEmergency(null);
      }
      if (data.reply && readStore('najdda-tts-enabled') === 'true') {
        const replyLang = user?.profile?.preferredLanguage || 'Arabic';
        speak(data.reply, replyLang);
      }
    } catch (err) {
      // The typed text was cleared optimistically and the request failed, so
      // the patient's own words were gone from the screen with no way to get
      // them back — on a failed send they had to retype the symptom from
      // memory. Restored to the input, and the error bubble offers a retry
      // instead of being a dead end.
      setInput(text);
      setFailedText(text);
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: t('app.error.network'), error: true, retry: text },
      ]);
    } finally {
      setSending(false);
    }
  };

  const retryLast = () => {
    if (!failedText) return;
    setFailedText(null);
    send(null, failedText);
  };

  useEffect(() => {
    sendRef.current = send;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  const reset = async () => {
    try {
      await apiClient.post('/orchestrator/reset');
    } catch { /* ignore */ }
    setMessages([]);
    setEmergency(null);
  };

  const emergencyNumber = getEmergencyNumber(country);
  const examples = [
    t('chat.empty.ex1'),
    t('chat.empty.ex2'),
    t('chat.empty.ex3'),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div aria-hidden="true" className="aurora" />
      <header className="glass-nav z-sticky flex items-center gap-4 px-6 py-4">
        <button onClick={() => navigate('/dashboard')} className="rounded-ui-sm p-1 text-ink-muted transition-colors hover:text-ink" aria-label={t('chat.backToDashboard')}>
          <DirIcon name={ArrowLeft} size={24} aria-hidden="true" />
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
              <div aria-hidden="true" className="brand-gradient mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-ui-md text-white shadow-card-hover">
                <Activity size={30} aria-hidden="true" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">{t('chat.empty.title')}</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-ink-muted">
                {t('chat.empty.body')}
              </p>
              <ul className="mt-8 grid gap-3 text-start">
                {examples.map((ex) => (
                  <li key={ex}>
                    <button
                      type="button"
                      onClick={() => setInput(ex)}
                      className="glass w-full rounded-ui-md px-4 py-3 text-start text-sm text-ink-subtle transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:text-ink hover:shadow-card-hover"
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
                <div className={`max-w-[85%] px-5 py-3 ${
                  m.role === 'user'
                    ? 'brand-gradient rounded-ui-lg rounded-br-ui-sm text-white shadow-card-hover'
                    : `glass rounded-ui-lg rounded-bl-ui-sm ${m.error ? 'border-emergency' : ''}`
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
                  <p className={`whitespace-pre-wrap leading-relaxed ${m.role === 'user' ? '' : 'text-ink'} ${m.error ? 'text-on-emergency-subtle' : ''}`}>{m.content}</p>
                  {m.retry && !sending && (
                    <button
                      type="button"
                      onClick={retryLast}
                      className="mt-3 inline-flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-ink transition-transform hover:scale-105"
                    >
                      <RotateCcw size={13} aria-hidden="true" /> {t('chat.retry')}
                    </button>
                  )}
                  {(m.followupMessage || m.followupTimeMinutes) && (
                    <p className={`mt-2 rounded-ui-sm px-3 py-2 text-xs ${m.role === 'user' ? 'bg-white/20 text-white' : 'bg-surface-2 text-ink-muted'}`}>
                      📅 {m.followupMessage || ''}{m.followupTimeMinutes ? ` (${m.followupTimeMinutes} min)` : ''}
                    </p>
                  )}
                  {m.agentsUsed?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.agentsUsed.map((a) => (
                        <span key={a} className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${m.role === 'user' ? 'bg-white/20 text-white' : 'bg-surface-2 text-ink-muted'}`}>
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
                <div className="glass flex items-center gap-3 rounded-ui-lg rounded-bl-ui-sm px-5 py-3 text-ink-muted">
                  <span aria-hidden="true" className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                  </span>
                  {t('chat.consulting')}
                </div>
              </div>
            )}

            {/* Inside role="log" on purpose: the emergency banner is the single
                most safety-critical thing on this screen, and sitting outside
                the live region it was never announced. */}
            {emergency && (
              <div role="alert" className="mt-4 rounded-ui-xl bg-emergency p-6 text-on-emergency shadow-card-hover">
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
          </div>

          <div ref={bottomRef} />
        </div>
      </main>

      <form onSubmit={send} className="glass-nav z-sticky px-4 py-4">
        <div className="mx-auto flex max-w-3xl gap-3">
          <label htmlFor="chat-input" className="sr-only">{t('chat.inputLabel')}</label>
          <input
            id="chat-input"
            value={input}
            onChange={(e) => { stopSpeech(); setInput(e.target.value); }}
            placeholder={t('chat.inputPlaceholder')}
            disabled={sending}
            className="flex-1 rounded-full border border-line-strong bg-surface/70 px-5 py-3 text-ink backdrop-blur-xl transition-all placeholder:text-ink-subtle focus:border-primary focus-visible:outline-none disabled:opacity-50"
          />
          {isSupported && (
            <button
              type="button"
              onClick={handleMicToggle}
              disabled={sending}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border backdrop-blur-xl transition-all disabled:opacity-40 ${
                isListening
                  ? 'animate-pulse border-emergency bg-emergency text-on-emergency shadow-card-hover'
                  : 'border-line-strong bg-surface/70 text-ink hover:border-primary hover:shadow-card-hover'
              }`}
              aria-label={isListening ? t('chat.mic.stop') : t('chat.mic.start')}
            >
              {isListening ? <MicOff size={20} aria-hidden="true" /> : <Mic size={20} aria-hidden="true" />}
            </button>
          )}
          {!isSupported && (
            // The key existed in all five dictionaries but was never rendered:
            // on a browser without the Web Speech API the mic button just
            // vanished with no explanation.
            <p className="self-center text-xs text-ink-subtle">{t('chat.mic.unsupported')}</p>
          )}
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="brand-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-card-hover transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
            aria-label={t('chat.send')}
          >
            {sending ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Send size={20} aria-hidden="true" />}
          </button>
        </div>
      </form>
    </div>
  );
}
