import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, ShieldAlert, RotateCcw, Phone, Baby, Smile, Flower2, Pill } from 'lucide-react';
import DirIcon from '../components/ui/dir-icon';
import apiClient from '../api/apiClient';
import { useAuth } from '../features/auth/context/AuthContext';
import ThemeToggle from '../features/theme/components/ThemeToggle';
import LanguageSwitcher from '../features/i18n/LanguageSwitcher';
import { useTranslation } from '../features/i18n/I18nContext';
import { getEmergencyNumber } from '../utils/emergency';

/* Specialized consultations ported from the mobile app (pregnancy, children,
   allergy, medications). One generic page driven by DOMAIN config — same glass
   system as ChatPage, same emergency handling, backend POST /{x}/check. */


const DOMAINS = {
  pregnancy: { endpoint: '/pregnancy/check', chatType: 'pregnancy', Icon: Baby },
  children: { endpoint: '/children/check', chatType: 'children', Icon: Smile },
  allergy: { endpoint: '/allergy/check', chatType: 'allergy', Icon: Flower2 },
  medications: { endpoint: '/medications/check', chatType: 'medications', Icon: Pill },
};

// The LLM may return any string for status/risk; only these are translated.
const STATUS_KEYS = new Set(['normal', 'warning', 'danger']);
const RISK_KEYS = new Set(['low', 'medium', 'high', 'unknown']);

const STATUS_STYLE = {
  normal: 'bg-success-subtle text-on-success-subtle',
  warning: 'bg-warning-subtle text-on-warning-subtle',
  danger: 'bg-emergency-subtle text-on-emergency-subtle',
};

const ResultCard = ({ result, t }) => (
  <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${STATUS_STYLE[result.status] || STATUS_STYLE.warning}`}>
        {t(`domain.status.${STATUS_KEYS.has(result.status) ? result.status : 'warning'}`)}
      </span>
      {(result.risk || result.allergy_risk) && (
        <span className="rounded-full bg-surface-2 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          {/* Unknown falls back explicitly: the agent can return any string, and
              a raw `domain.risk.<x>` key must never reach a patient. */}
          {t(`domain.risk.${RISK_KEYS.has(result.risk || result.allergy_risk) ? (result.risk || result.allergy_risk) : 'unknown'}`)}
        </span>
      )}
    </div>
    {[result.message, result.likely_cause, result.dosage_guidance, result.when_to_act]
      .filter(Boolean)
      .map((p, i) => (
        <p key={i} className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{p}</p>
      ))}
    {Array.isArray(result.advice) && result.advice.length > 0 && (
      <ol className="list-decimal space-y-1 ps-5 text-sm leading-relaxed text-ink">
        {result.advice.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ol>
    )}
    {result.consult && (
      <p className="rounded-ui-sm bg-surface-2 px-3 py-2 text-xs font-medium text-ink-muted">👩‍⚕️ {result.consult}</p>
    )}
  </div>
);

export default function DomainPage({ domain }) {
  const cfg = DOMAINS[domain];
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [emergency, setEmergency] = useState(null);
  const [trimester, setTrimester] = useState('');
  const [childAge, setChildAge] = useState('');
  const [childWeight, setChildWeight] = useState('');
  const bottomRef = useRef(null);
  const country = user?.profile?.country || 'Morocco';
  const emergencyNumber = getEmergencyNumber(country);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    if (el.getBoundingClientRect().top - window.innerHeight < 300) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    apiClient
      .get(`/conversations/${cfg.chatType}`, { signal: controller.signal })
      .then((r) => {
        if (cancelled) return;
        setMessages((r.data.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
        isEmergency: m.metadata?.isEmergency || false,
      })));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain]);

  const buildPayload = (text) => {
    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content || '' }));
    if (domain === 'pregnancy') {
      // `history` was the one domain missing it, so the pregnancy agent
      // answered each message with no conversational context.
      return { pregnant: true, trimester: String(trimester), symptoms: text, message: text, history };
    }
    if (domain === 'children') {
      const toNum = (v) => {
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? n : undefined;
      };
      return {
        message: text,
        history,
        childProfile: { age_months: toNum(childAge), weight_kg: toNum(childWeight) },
      };
    }
    if (domain === 'allergy') {
      return { symptoms: [text], message: text, history, city: user?.profile?.city || 'Casablanca' };
    }
    const meds = Array.isArray(user?.profile?.medications)
      ? user.profile.medications.map((m) => m?.nom || m).filter(Boolean)
      : [];
    return { message: text, history, medications: meds };
  };

  const canSend = (text) => {
    if (!text.trim() || sending) return false;
    if (domain === 'pregnancy' && !trimester) return false;
    return true;
  };

  const send = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!canSend(text)) return;
    setInput('');
    setSending(true);
    setMessages((m) => [...m, { role: 'user', content: text }]);
    try {
      const { data } = await apiClient.post(cfg.endpoint, buildPayload(text));
      setMessages((m) => [...m, { role: 'assistant', result: data, isEmergency: data.isEmergency }]);
      if (data.isEmergency) {
        setEmergency({ number: data.emergencyNumber || emergencyNumber });
      } else {
        setEmergency(null);
      }
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: t('app.error.network'), error: true }]);
    } finally {
      setSending(false);
    }
  };

  const reset = async () => {
    try {
      await apiClient.delete(`/conversations/${cfg.chatType}`);
    } catch { /* ignore */ }
    setMessages([]);
    setEmergency(null);
  };

  const Icon = cfg.Icon;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div aria-hidden="true" className="aurora" />
      <header className="glass-nav z-sticky flex items-center gap-4 px-6 py-4">
        <button onClick={() => navigate('/dashboard')} className="rounded-ui-sm p-1 text-ink-muted transition-colors hover:text-ink" aria-label={t('chat.backToDashboard')}>
          <DirIcon name={ArrowLeft} size={24} aria-hidden="true" />
        </button>
        <div className="flex flex-1 items-center gap-3">
          <div aria-hidden="true" className="brand-gradient flex h-10 w-10 items-center justify-center rounded-ui-sm text-white shadow-card">
            <Icon size={20} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight">{t(`domain.${domain}.title`)}</h1>
            <p className="text-xs font-medium text-ink-muted">{t(`domain.${domain}.description`)}</p>
          </div>
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
          {domain === 'pregnancy' && (
            <div className="glass flex flex-wrap items-center gap-3 rounded-ui-md px-4 py-3">
              <label htmlFor="trimester" className="text-sm font-bold text-ink-muted">{t('domain.pregnancy.trimester')}</label>
              <select
                id="trimester"
                value={trimester}
                onChange={(e) => setTrimester(e.target.value)}
                className="rounded-ui-sm border border-line-strong bg-surface/70 px-3 py-2 text-sm text-ink backdrop-blur-xl focus:border-primary focus-visible:outline-none"
              >
                <option value="">{t('domain.pregnancy.selectTrimester')}</option>
                <option value="1">{t('domain.pregnancy.t1')}</option>
                <option value="2">{t('domain.pregnancy.t2')}</option>
                <option value="3">{t('domain.pregnancy.t3')}</option>
              </select>
            </div>
          )}

          {domain === 'children' && (
            <div className="glass grid grid-cols-2 gap-3 rounded-ui-md px-4 py-3">
              <div>
                <label htmlFor="child-age" className="mb-1 block text-xs font-bold text-ink-muted">{t('domain.children.ageMonths')}</label>
                <input id="child-age" type="number" min="0" value={childAge} onChange={(e) => setChildAge(e.target.value)} className="w-full rounded-ui-sm border border-line-strong bg-surface/70 px-3 py-2 text-sm text-ink backdrop-blur-xl focus:border-primary focus-visible:outline-none" />
              </div>
              <div>
                <label htmlFor="child-weight" className="mb-1 block text-xs font-bold text-ink-muted">{t('domain.children.weightKg')}</label>
                <input id="child-weight" type="number" min="0" step="0.1" value={childWeight} onChange={(e) => setChildWeight(e.target.value)} className="w-full rounded-ui-sm border border-line-strong bg-surface/70 px-3 py-2 text-sm text-ink backdrop-blur-xl focus:border-primary focus-visible:outline-none" />
              </div>
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
                  {m.result ? (
                    <ResultCard result={m.result} t={t} />
                  ) : (
                    <p className={`whitespace-pre-wrap leading-relaxed ${m.error ? 'text-on-emergency-subtle' : ''}`}>{m.content}</p>
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

      <form onSubmit={send} className="glass-nav z-sticky px-4 py-4">
        <div className="mx-auto flex max-w-3xl gap-3">
          <label htmlFor="domain-input" className="sr-only">{t(`domain.${domain}.placeholder`)}</label>
          <input
            id="domain-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t(`domain.${domain}.placeholder`)}
            disabled={sending}
            className="flex-1 rounded-full border border-line-strong bg-surface/70 px-5 py-3 text-ink backdrop-blur-xl transition-all placeholder:text-ink-subtle focus:border-primary focus-visible:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!canSend(input)}
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
