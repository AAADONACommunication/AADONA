import { useState, useRef, useEffect, useCallback } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const STORAGE_KEY_USER = 'aadona_chat_user';
const STORAGE_KEY_HISTORY = (phone) => `aadona_chat_history_${phone}`;
const MAX_HISTORY = 40; // messages to keep in localStorage

const QUICK_REPLY_MAP = {
  default: ['Products', 'Support', 'Partner Info', 'About AADONA', 'Contact Us'],
  products: ['Wireless', 'Surveillance', 'Network Switches', 'Servers & Workstations', 'NAS Storage', 'Industrial Switches'],
  support: ['Warranty Check', 'Tech Squad', 'Request DOA', 'Product Registration', 'Product Support'],
  partner: ['Become a Partner', 'Project Locking', 'Request a Demo', 'Request Training'],
  contact: ['Call Us', 'Email Us', 'Office Address', 'Working Hours'],
};

function getQuickReplies(text) {
  const t = text.toLowerCase();
  if (t.includes('product') || t.includes('wireless') || t.includes('switch') || t.includes('nas') || t.includes('server') || t.includes('surveillance')) return QUICK_REPLY_MAP.products;
  if (t.includes('support') || t.includes('warranty') || t.includes('doa') || t.includes('tech squad') || t.includes('repair')) return QUICK_REPLY_MAP.support;
  if (t.includes('partner') || t.includes('reseller') || t.includes('distributor') || t.includes('demo') || t.includes('training')) return QUICK_REPLY_MAP.partner;
  if (t.includes('contact') || t.includes('address') || t.includes('phone') || t.includes('email') || t.includes('call')) return QUICK_REPLY_MAP.contact;
  return QUICK_REPLY_MAP.default;
}

function getTime() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-end gap-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl rounded-tl-sm shadow-sm w-fit max-w-[80px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
        />
      ))}
    </div>
  );
}

function BotMessage({ content, time }) {
  return (
    <div className="flex items-end gap-2 animate-fadeIn">
      {/* Bot avatar */}
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 mb-1 shadow">
        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
        </svg>
      </div>
      <div className="flex flex-col gap-0.5 max-w-[78%]">
        <div className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl rounded-tl-sm shadow-sm text-slate-700 text-[13px] leading-relaxed">
          {content.split('\n').map((line, i) => (
            <span key={i}>
              {line.split(/(\*\*.*?\*\*)/g).map((part, j) =>
                part.startsWith('**') && part.endsWith('**')
                  ? <strong key={j} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>
                  : part
              )}
              {i < content.split('\n').length - 1 && <br />}
            </span>
          ))}
        </div>
        {time && <span className="text-[10px] text-slate-400 pl-1">{time}</span>}
      </div>
    </div>
  );
}

function UserMessage({ content, time }) {
  return (
    <div className="flex items-end justify-end gap-2 animate-fadeIn">
      <div className="flex flex-col items-end gap-0.5 max-w-[78%]">
        <div className="px-3.5 py-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl rounded-br-sm shadow-sm text-white text-[13px] leading-relaxed">
          {content}
        </div>
        {time && <span className="text-[10px] text-slate-400 pr-1">{time}</span>}
      </div>
    </div>
  );
}

function QuickReplies({ options, onSelect }) {
  if (!options?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-3 pb-2 pt-1">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className="text-[11.5px] px-3 py-1.5 rounded-full border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all duration-150 font-medium"
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── Registration Form ────────────────────────────────────────────────────────
function RegistrationForm({ onStart }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!/^\d{10}$/.test(phone)) { setError('Please enter a valid 10-digit mobile number.'); return; }
    setLoading(true);
    // Small delay for UX polish
    await new Promise(r => setTimeout(r, 400));
    setLoading(false);
    onStart(name.trim(), phone.trim());
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top brand bar */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-white font-bold text-base tracking-wide">AADONA Assistant</h2>
            <p className="text-emerald-100 text-xs">Powered by AI · Always Online</p>
          </div>
        </div>
        <p className="text-white/80 text-xs leading-relaxed">
          Get instant answers about products, support, partnerships & more.
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-5 py-5 flex flex-col gap-4 bg-slate-50">
        <div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-3">
            Quick intro before we chat
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Your Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder:text-slate-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mobile Number *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">+91</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="9876543210"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder:text-slate-400 transition"
                />
              </div>
            </div>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
              <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {error}
            </p>
          )}
        </div>

        {/* Trust signals */}
        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <p className="text-xs text-slate-500 mb-2 font-medium">What I can help you with:</p>
          <div className="grid grid-cols-2 gap-1.5">
            {['📡 Products & Specs', '🛡️ Warranty & Support', '🤝 Become a Partner', '📞 Contact & Location'].map(item => (
              <div key={item} className="text-[11px] text-slate-600 flex items-center gap-1">
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Starting chat...
            </>
          ) : (
            <>
              Start Chat
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </>
          )}
        </button>

        <p className="text-center text-[10.5px] text-slate-400">
          🔒 Your details are safe with us · AADONA Communication Pvt Ltd
        </p>
      </div>
    </div>
  );
}

// ─── Main Chatbot Component ───────────────────────────────────────────────────
export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [user, setUser] = useState(null); // { name, phone }
  const [messages, setMessages] = useState([]); // [{ role: 'bot'|'user', content, time }]
  const [apiHistory, setApiHistory] = useState([]); // [{ role: 'user'|'assistant', content }] for Claude API
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState(QUICK_REPLY_MAP.default);
  const [hasUnread, setHasUnread] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when chat opens after registration
  useEffect(() => {
    if (isOpen && isRegistered) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isRegistered]);

  // On mount: check if user already registered
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.name && parsed?.phone) {
          setUser(parsed);
          setIsRegistered(true);
          loadHistory(parsed.phone);
        }
      } catch { /* ignore */ }
    }
  }, []);

  const loadHistory = (phone) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY(phone));
      if (!raw) return;
      const hist = JSON.parse(raw);
      if (Array.isArray(hist) && hist.length) {
        // Restore messages for display
        const displayMsgs = hist.map(m => ({
          role: m.role === 'assistant' ? 'bot' : 'user',
          content: m.content,
          time: m.time || '',
        }));
        setMessages(displayMsgs);
        // Restore API history (last 10 for context)
        const apiHist = hist.slice(-10).map(m => ({
          role: m.role,
          content: m.content,
        }));
        setApiHistory(apiHist);
        setQuickReplies(QUICK_REPLY_MAP.default);
      }
    } catch { /* ignore */ }
  };

  const saveHistory = useCallback((phone, allMessages) => {
    try {
      const toSave = allMessages.slice(-MAX_HISTORY).map(m => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.content,
        time: m.time,
      }));
      localStorage.setItem(STORAGE_KEY_HISTORY(phone), JSON.stringify(toSave));
    } catch { /* ignore */ }
  }, []);

  const handleStart = async (name, phone) => {
    const userData = { name, phone, joinedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userData));

    fetch(`${API_BASE}/chat/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    }).catch(() => {});
    setUser(userData);
    setIsRegistered(true);

    // Check if returning user
    const existingHistory = localStorage.getItem(STORAGE_KEY_HISTORY(phone));
    const isReturning = !!existingHistory;

    if (isReturning) {
      loadHistory(phone);
      const welcomeBack = {
        role: 'bot',
        content: `Welcome back, **${name}**! 👋 Great to see you again. How can I help you today?`,
        time: getTime(),
      };
      setMessages(prev => {
        const updated = [...prev, welcomeBack];
        saveHistory(phone, updated);
        return updated;
      });
    } else {
      const greeting = {
        role: 'bot',
        content: `Namaste **${name} ji**! 🙏 Welcome to **AADONA** — India's premium networking brand!\n\nI can help you with products, support, partnerships, and everything about us. What would you like to know?`,
        time: getTime(),
      };
      setMessages([greeting]);
      saveHistory(phone, [greeting]);
    }

    setQuickReplies(QUICK_REPLY_MAP.default);
  };

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || isLoading) return;
    setInput('');
    setQuickReplies([]);

    const userMsg = { role: 'user', content: trimmed, time: getTime() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    const newApiHistory = [...apiHistory, { role: 'user', content: trimmed }];
    setApiHistory(newApiHistory);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newApiHistory,
          userName: user?.name || 'Guest',
          userPhone: user?.phone || '',
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Server error');

      const reply = data.reply || 'Sorry, I could not get a response. Please try again.';
      const botMsg = { role: 'bot', content: reply, time: getTime() };

      const updatedMessages = [...newMessages, botMsg];
      setMessages(updatedMessages);
      setApiHistory(prev => [...prev, { role: 'assistant', content: reply }]);
      setQuickReplies(getQuickReplies(trimmed));
      saveHistory(user?.phone, updatedMessages);

    } catch (err) {
      console.error('Chat error:', err);
      const errMsg = {
        role: 'bot',
        content: 'Oops! Something went wrong. Please check your connection and try again.\n\nFor urgent help, call us at **1800-202-6599** (Toll Free).',
        time: getTime(),
      };
      const updatedMessages = [...newMessages, errMsg];
      setMessages(updatedMessages);
      setQuickReplies(QUICK_REPLY_MAP.default);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, apiHistory, isLoading, user, saveHistory]);

  const handleOpen = () => {
    setIsOpen(true);
    setHasUnread(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClearHistory = () => {
    if (!user?.phone) return;
    localStorage.removeItem(STORAGE_KEY_HISTORY(user.phone));
    setMessages([]);
    setApiHistory([]);
    const greeting = {
      role: 'bot',
      content: `Chat cleared! How can I help you, **${user.name}**? 😊`,
      time: getTime(),
    };
    setMessages([greeting]);
    setQuickReplies(QUICK_REPLY_MAP.default);
  };

  return (
    <>
      {/* ── Keyframes injected via style tag ── */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.22s ease forwards; }

        @keyframes slideUp {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .chat-window-enter { animation: slideUp 0.28s cubic-bezier(0.34,1.26,0.64,1) forwards; }

        @keyframes wiggle {
          0%,100% { transform: rotate(0deg); }
          20%     { transform: rotate(-10deg); }
          40%     { transform: rotate(12deg); }
          60%     { transform: rotate(-8deg); }
          80%     { transform: rotate(6deg); }
        }
        .animate-wiggle { animation: wiggle 0.5s ease; }
      `}</style>

      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
        {/* ── Chat Window ── */}
        {isOpen && (
          <div className="chat-window-enter w-[360px] bg-white rounded-2xl shadow-2xl shadow-slate-300/60 border border-slate-200 flex flex-col overflow-hidden"
            style={{ height: isRegistered ? '540px' : '480px' }}>

            {isRegistered ? (
              <>
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 flex items-center gap-3 flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4.5 h-4.5 text-white w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-sm truncate">AADONA Assistant</h3>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse flex-shrink-0"></span>
                      <span className="text-emerald-100 text-xs truncate">
                        Chatting as {user?.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Clear history */}
                    <button
                      onClick={handleClearHistory}
                      title="Clear chat history"
                      className="p-1.5 rounded-lg hover:bg-white/20 transition text-white/70 hover:text-white"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                    {/* Close */}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded-lg hover:bg-white/20 transition text-white/70 hover:text-white"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 bg-slate-50/80 scroll-smooth">
                  {messages.map((msg, i) =>
                    msg.role === 'bot'
                      ? <BotMessage key={i} content={msg.content} time={msg.time} />
                      : <UserMessage key={i} content={msg.content} time={msg.time} />
                  )}
                  {isLoading && <TypingDots />}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Replies */}
                {!isLoading && quickReplies.length > 0 && (
                  <QuickReplies options={quickReplies} onSelect={(opt) => { setQuickReplies([]); sendMessage(opt); }} />
                )}

                {/* Input */}
                <div className="flex items-end gap-2 px-3 py-3 bg-white border-t border-slate-100 flex-shrink-0">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => {
                      setInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 90) + 'px';
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about AADONA..."
                    rows={1}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder:text-slate-400 transition leading-snug"
                    style={{ minHeight: '40px', maxHeight: '90px', overflow: 'hidden' }}
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isLoading}
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
                  >
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </button>
                </div>

                {/* Footer */}
                <div className="text-center py-1.5 bg-white border-t border-slate-100">
                  <span className="text-[9.5px] text-slate-400 tracking-wide">
                    AADONA Communication · 1800-202-6599 · contact@aadona.com
                  </span>
                </div>
              </>
            ) : (
              <RegistrationForm onStart={handleStart} />
            )}
          </div>
        )}

        {/* ── Toggle Button ── */}
        {isOpen ? (
          // Minimise pill (visible when open)
          <button
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-3 rounded-full shadow-lg shadow-emerald-300/50 hover:shadow-emerald-400/60 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 font-semibold text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
            </svg>
            Minimise
          </button>
        ) : (
          <button
            onClick={handleOpen}
            className="relative flex items-center gap-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-3.5 rounded-full shadow-lg shadow-emerald-300/50 hover:shadow-emerald-400/60 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 font-semibold text-sm group"
          >
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] text-white font-bold animate-pulse border-2 border-white">
                1
              </span>
            )}
            <svg className="w-5 h-5 group-hover:animate-wiggle" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
            Chat with Us
          </button>
        )}
      </div>
    </>
  );
}