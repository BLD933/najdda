import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, ShieldAlert, RotateCcw, Phone } from 'lucide-react';
import apiClient from '../api/apiClient';

const EMERGENCY_BY_COUNTRY = {
  Morocco: '150', Algeria: '14', Tunisia: '190', France: '15', USA: '911', Canada: '911', UK: '999', Spain: '112',
};

export default function ChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [emergency, setEmergency] = useState(null);
  const [country, setCountry] = useState('Morocco');
  const bottomRef = useRef(null);

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
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'I could not reach the medical service. If this is urgent, call the emergency number now.', error: true },
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b-2 border-slate-100 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-slate-900 transition-colors" aria-label="Back to dashboard">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-black tracking-tight">Symptom Triage</h1>
          <p className="text-xs text-slate-400 font-medium">Multi-agent consultation · AR · Darija · FR · EN</p>
        </div>
        <button onClick={reset} className="text-slate-400 hover:text-slate-900 transition-colors" aria-label="Clear conversation" title="Clear conversation">
          <RotateCcw size={20} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <p className="font-medium">Describe what you are feeling, in any language.</p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-5 py-3 rounded-[1.5rem] ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : `bg-white border-2 border-slate-100 rounded-bl-md ${m.error ? 'border-red-300 text-red-700' : ''}`
              }`}>
                {m.isEmergency && (
                  <div className="mb-2 flex items-center gap-2 text-red-600 font-black text-xs uppercase tracking-widest">
                    <ShieldAlert size={16} /> Emergency detected
                  </div>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                {m.agentsUsed?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.agentsUsed.map((a) => (
                      <span key={a} className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
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
              <div className="bg-white border-2 border-slate-100 rounded-[1.5rem] rounded-bl-md px-5 py-3 flex items-center gap-2 text-slate-400">
                <Loader2 size={16} className="animate-spin" /> Consulting agents…
              </div>
            </div>
          )}

          {emergency && (
            <div className="bg-red-600 text-white rounded-[2rem] p-6 mt-4">
              <h2 className="font-black text-xl mb-2">Emergency detected</h2>
              <p className="mb-4 text-red-50">Do not wait for a chat reply. Call now.</p>
              <a href={`tel:${emergency.number}`} className="inline-flex items-center gap-2 bg-white text-red-700 font-black px-6 py-3 rounded-2xl">
                <Phone size={20} /> Call {emergency.number}
              </a>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      <form onSubmit={send} className="bg-white border-t-2 border-slate-100 px-4 py-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your symptoms…"
            disabled={sending}
            className="flex-1 px-5 py-3 rounded-full border-2 border-slate-100 focus:border-blue-600 outline-none transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center disabled:opacity-40 transition-colors"
            aria-label="Send"
          >
            {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
      </form>
    </div>
  );
}
