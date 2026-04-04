import { useState, useRef, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const STORAGE_KEY_USER = 'aadona_chat_user_v2'; // v2 — city add hone se fresh start
const STORAGE_KEY_HISTORY = (phone) => `aadona_chat_history_${phone}`;
const MAX_HISTORY = 40;
const TOLL_FREE = '18002026599';
const TOLL_FREE_DISPLAY = '1800-202-6599';

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

// ─── Product Card ──────────────────────────────────────────────────────────
function ProductCard({ product }) {
  if (!product) return null;
  const url = product.url || `https://aadona.online/${(product.category || 'products').toLowerCase().replace(/\s+/g, '-')}/${product.slug}`;
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden w-[185px] flex-shrink-0">
      {product.image ? (
        <img src={product.image} alt={product.name} className="w-full h-28 object-contain bg-slate-50 p-2" />
      ) : (
        <div className="w-full h-28 bg-slate-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
        </div>
      )}
      <div className="p-2.5">
        <p className="text-[11px] font-semibold text-slate-800 leading-tight line-clamp-2">{product.name}</p>
        {product.model && <p className="text-[10px] text-slate-400 mt-0.5">{product.model}</p>}
        {product.overview && (
          <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{product.overview}</p>
        )}
        {product.features?.length > 0 && (
          <ul className="mt-1 mb-1.5 flex flex-col gap-0.5">
            {product.features.map((f, i) => (
              <li key={i} className="flex items-start gap-1 text-[10px] text-slate-500">
                <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>
                <span className="line-clamp-1">{f}</span>
              </li>
            ))}
          </ul>
        )}
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="block text-center text-[10.5px] font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-1.5 rounded-lg hover:opacity-90 transition mt-1">
          View Product →
        </a>
      </div>
    </div>
  );
}

// ─── Action Buttons ────────────────────────────────────────────────────────
function ActionButtons({ buttons }) {
  if (!buttons?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {buttons.map((btn, i) => (
        <a key={i} href={btn.url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all duration-150 shadow-sm">
          {btn.label}
        </a>
      ))}
    </div>
  );
}

// ─── Typing Dots ───────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-end gap-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl rounded-tl-sm shadow-sm">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }} />
      ))}
    </div>
  );
}

// ─── Bot Message ───────────────────────────────────────────────────────────
function BotMessage({ content, time, productCards, actionButtons, isStreaming }) {
  return (
    <div className="flex items-end gap-2 animate-fadeIn">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 mb-1 shadow">
        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
      </div>
      <div className="flex flex-col gap-1 max-w-[82%]">
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
          {isStreaming && (
            <span className="inline-block w-1 h-3.5 bg-emerald-400 ml-0.5 animate-pulse rounded-sm" />
          )}
        </div>
        {!isStreaming && productCards?.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5" style={{ scrollbarWidth: 'none' }}>
            {productCards.map((p, i) => <ProductCard key={i} product={p} />)}
          </div>
        )}
        {!isStreaming && <ActionButtons buttons={actionButtons} />}
        {!isStreaming && time && <span className="text-[10px] text-slate-400 pl-1">{time}</span>}
      </div>
    </div>
  );
}

// ─── User Message ──────────────────────────────────────────────────────────
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

// ─── Quick Replies ─────────────────────────────────────────────────────────
function QuickReplies({ options, onSelect }) {
  if (!options?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-3 pb-2 pt-1">
      {options.map((opt) => (
        <button key={opt} onClick={() => onSelect(opt)}
          className="text-[11px] px-3 py-1.5 rounded-full border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all duration-150 font-medium">
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── Registration Form ─────────────────────────────────────────────────────
function RegistrationForm({ onStart }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!/^\d{10}$/.test(phone)) { setError('Please enter a valid 10-digit mobile number.'); return; }
    if (!city.trim()) { setError('Please enter your city.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    setLoading(false);
    onStart(name.trim(), phone.trim(), city.trim());
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-5 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-white font-bold text-base tracking-wide">AADONA Assistant</h2>
            <p className="text-emerald-100 text-xs">Powered by AI · Always Online</p>
          </div>
        </div>
        <p className="text-white/80 text-xs leading-relaxed">Get instant answers about products, support, partnerships &amp; more.</p>
      </div>

      <div className="flex-1 px-5 py-5 flex flex-col gap-4 bg-slate-50 overflow-y-auto">
        <div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-3">Quick intro before we chat</p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Your Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Enter your name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder:text-slate-400 transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mobile Number *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">+91</span>
                <input type="tel" value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="10-digit number"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder:text-slate-400 transition" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">City *</label>
              <input type="text" value={city} onChange={e => setCity(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Enter your city"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder:text-slate-400 transition" />
            </div>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
              <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <p className="text-xs text-slate-500 mb-2 font-medium">What I can help you with:</p>
          <div className="grid grid-cols-2 gap-1.5">
            {['📡 Products & Specs', '🛡️ Warranty & Support', '🤝 Become a Partner', '📞 Contact & Location'].map(item => (
              <div key={item} className="text-[11px] text-slate-600">{item}</div>
            ))}
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Starting chat...
            </>
          ) : (
            <>
              Start Chat
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>

        <p className="text-center text-[10.5px] text-slate-400">🔒 Your details are safe · AADONA Communication Pvt Ltd</p>
      </div>
    </div>
  );
}

// ─── Main Chatbot Component ────────────────────────────────────────────────
export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [apiHistory, setApiHistory] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState(QUICK_REPLY_MAP.default);
  const [hasUnread, setHasUnread] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showCallDrawer, setShowCallDrawer] = useState(false);
  const [showBubble, setShowBubble] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const callDrawerRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && isRegistered) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen, isRegistered]);

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
      } catch { }
    }
  }, []);

  useEffect(() => {
    if (!showCallDrawer) return;
    const handler = (e) => {
      if (callDrawerRef.current && !callDrawerRef.current.contains(e.target)) {
        setShowCallDrawer(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCallDrawer]);

  useEffect(() => {
    const timer = setTimeout(() => setShowBubble(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const loadHistory = (phone) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY(phone));
      if (!raw) return;
      const hist = JSON.parse(raw);
      if (Array.isArray(hist) && hist.length) {
        const displayMsgs = hist.map(m => ({
          role: m.role === 'assistant' ? 'bot' : 'user',
          content: m.content,
          time: m.time || '',
          productCards: m.productCards || null,
          actionButtons: m.actionButtons || null,
        }));
        setMessages(displayMsgs);
        const apiHist = hist.slice(-10).map(m => ({ role: m.role, content: m.content }));
        setApiHistory(apiHist);
        setQuickReplies(QUICK_REPLY_MAP.default);
      }
    } catch { }
  };

  const saveHistory = useCallback((phone, allMessages) => {
    try {
      const toSave = allMessages.slice(-MAX_HISTORY).map(m => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.content,
        time: m.time,
        productCards: m.productCards || null,
        actionButtons: m.actionButtons || null,
      }));
      localStorage.setItem(STORAGE_KEY_HISTORY(phone), JSON.stringify(toSave));
    } catch { }
  }, []);

  const handleStart = async (name, phone, city) => {
    const userData = { name, phone, city, joinedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userData));
    fetch(`${API_BASE}/chat/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, city }),
    }).catch(() => { });
    setUser(userData);
    setIsRegistered(true);

    const existingHistory = localStorage.getItem(STORAGE_KEY_HISTORY(phone));
    if (existingHistory) {
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
        content: `Namaste **${name} ji**! 🙏 Welcome to **AADONA** — India's premium networking brand!\n\nI can help you with products, support, partnerships, and more. What would you like to know?`,
        time: getTime(),
      };
      setMessages([greeting]);
      saveHistory(phone, [greeting]);
    }
    setQuickReplies(QUICK_REPLY_MAP.default);
  };

  // ── Streaming sendMessage ──────────────────────────────────────────────
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

    // Add empty streaming bot message
    const streamingMsg = { role: 'bot', content: '', time: getTime(), isStreaming: true, productCards: null, actionButtons: null };
    setMessages(prev => [...prev, streamingMsg]);
    const botIndex = newMessages.length; // index of the streaming message

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newApiHistory,
          userName: user?.name || 'Guest',
          userPhone: user?.phone || '',
          userCity: user?.city || '',
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Server error');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = '';
      let productCards = null;
      let actionButtons = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          try {
            const json = JSON.parse(line.replace('data: ', ''));

            if (json.token) {
              streamedText += json.token;
              setMessages(prev => {
                const updated = [...prev];
                if (updated[botIndex]) {
                  updated[botIndex] = { ...updated[botIndex], content: streamedText, isStreaming: true };
                }
                return updated;
              });
            }

            if (json.done) {
              productCards = json.productCards || null;
              actionButtons = json.actionButtons || null;
              setMessages(prev => {
                const updated = [...prev];
                if (updated[botIndex]) {
                  updated[botIndex] = {
                    ...updated[botIndex],
                    content: streamedText,
                    isStreaming: false,
                    productCards,
                    actionButtons,
                  };
                }
                return updated;
              });
            }
          } catch { }
        }
      }

      const finalMessages = [...newMessages, {
        role: 'bot', content: streamedText, time: getTime(), productCards, actionButtons, isStreaming: false
      }];
      setApiHistory(prev => [...prev, { role: 'assistant', content: streamedText }]);
      setQuickReplies(getQuickReplies(trimmed));
      saveHistory(user?.phone, finalMessages);

    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => {
        const updated = [...prev];
        if (updated[botIndex]) {
          updated[botIndex] = {
            ...updated[botIndex],
            content: `Oops! Something went wrong. Please try again.\n\nFor urgent help, call us at **${TOLL_FREE_DISPLAY}** (Toll Free).`,
            isStreaming: false,
          };
        }
        return updated;
      });
      setQuickReplies(QUICK_REPLY_MAP.default);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, apiHistory, isLoading, user, saveHistory]);

  const handleClearHistory = () => {
    if (!user?.phone) return;
    localStorage.removeItem(STORAGE_KEY_HISTORY(user.phone));
    const greeting = {
      role: 'bot',
      content: `Chat cleared! How can I help you, **${user.name}**? 😊`,
      time: getTime(),
    };
    setMessages([greeting]);
    setApiHistory([]);
    setQuickReplies(QUICK_REPLY_MAP.default);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setHasUnread(false);
    setShowCallDrawer(false);
  };

  const handleCallDrawerToggle = () => {
    setShowCallDrawer(prev => !prev);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const winHeight = isRegistered ? 580 : 540;
  const winWidth = isMobile ? 'calc(100vw - 24px)' : '368px';

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.22s ease forwards; }

        @keyframes slideUp {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .chat-window-enter { animation: slideUp 0.28s cubic-bezier(0.34,1.18,0.64,1) forwards; }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes notif-ping {
          0%   { transform: scale(1);   opacity: 1; }
          70%  { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes notif-pop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes notif-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
          50%       { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
        }
        @keyframes notif-bubble-in {
          0%   { opacity: 0; transform: translateX(-50%) scale(0.9); }
          100% { opacity: 1; transform: translateX(-50%) scale(1); }
        }
        @keyframes notif-bubble-bounce {
          0%,100% { transform: translateX(-50%) translateY(0); }
          50%     { transform: translateX(-50%) translateY(-3px); }
        }
        @keyframes drawerSlideUp {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .call-drawer-enter { animation: drawerSlideUp 0.2s cubic-bezier(0.34,1.18,0.64,1) forwards; }

        .notif-badge {
          position: absolute; top: -6px; right: -6px;
          width: 20px; height: 20px;
          background: #ef4444; border-radius: 50%;
          border: 2px solid #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 800; color: #fff; z-index: 10;
          animation: notif-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards,
                     notif-glow 1.5s ease-in-out 0.4s infinite;
        }
        .notif-badge::before {
          content: ''; position: absolute; inset: 0; border-radius: 50%;
          background: #ef4444;
          animation: notif-ping 1.5s ease-out infinite; z-index: -1;
        }
        .notif-bubble {
          position: absolute; bottom: calc(100% + 10px); left: 5%;
          transform: translateX(-50%);
          background: #1e293b; color: #f8fafc;
          font-size: 11px; font-weight: 500;
          padding: 7px 12px; border-radius: 10px;
          white-space: nowrap; pointer-events: none;
          animation: notif-bubble-in 0.4s 0.6s ease both,
                     notif-bubble-bounce 2s 1.2s ease-in-out infinite;
          box-shadow: 0 4px 14px rgba(0,0,0,0.18); line-height: 1.4;
        }
        .notif-bubble::after {
          content: ''; position: absolute; top: 100%; left: 50%;
          transform: translateX(-50%);
          border: 6px solid transparent; border-top-color: #1e293b;
        }
        .ac-btn-wrap { position: relative; display: flex; }
        .ac-tooltip {
          position: absolute; right: calc(100% + 10px); top: 50%;
          transform: translateY(-50%) translateX(4px);
          background: #1e293b; color: #f8fafc;
          font-size: 11px; font-weight: 500; padding: 5px 11px;
          border-radius: 8px; white-space: nowrap; pointer-events: none;
          opacity: 0; transition: opacity 0.18s ease, transform 0.18s ease;
          z-index: 99999; line-height: 1.4;
        }
        .ac-tooltip::after {
          content: ''; position: absolute; left: 100%; top: 50%;
          transform: translateY(-50%);
          border: 5px solid transparent; border-left-color: #1e293b;
        }
        .ac-btn-wrap:hover .ac-tooltip { opacity: 1; transform: translateY(-50%) translateX(0); }
        .call-number-row {
          display: flex; align-items: center; justify-content: space-between;
          background: #f1faf7; border-radius: 10px; padding: 10px 12px;
          text-decoration: none; border: 1px solid #a7f3d0;
          transition: background 0.15s, border-color 0.15s;
        }
        .call-number-row:hover { background: #d1fae5; border-color: #6ee7b7; }
      `}</style>

      <div style={{ position: 'fixed', bottom: '20px', right: '16px', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>

        {/* Chat Window */}
        {isOpen && (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setIsOpen(false)} title="Close"
              style={{ position: 'absolute', top: '-11px', right: '-11px', width: '26px', height: '26px', borderRadius: '50%', background: '#ef4444', border: '2.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 20, boxShadow: '0 2px 10px rgba(239,68,68,0.55)', transition: 'transform 0.15s, background 0.15s', outline: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.18)'; e.currentTarget.style.background = '#dc2626'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#ef4444'; }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="chat-window-enter bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
              style={{ width: winWidth, maxHeight: 'calc(100dvh - 110px)', height: `min(${winHeight}px, calc(100dvh - 110px))` }}>

              {isRegistered ? (
                <>
                  {/* Header */}
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 flex items-center gap-3 flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-sm truncate">AADONA Assistant</h3>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse flex-shrink-0" />
                        <span className="text-emerald-100 text-xs truncate">Chatting as {user?.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setShowCallDrawer(prev => !prev); setIsOpen(false); }} title={`Call ${TOLL_FREE_DISPLAY}`}
                        className="p-1.5 rounded-lg hover:bg-white/20 transition text-white/80 hover:text-white">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.21.49 2.53.76 3.88.76a1 1 0 011 1V20a1 1 0 01-1 1C10.18 21 3 13.82 3 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.36.27 2.67.76 3.88a1 1 0 01-.23 1.12l-2.41 1.79z" />
                        </svg>
                      </button>
                      <button onClick={handleClearHistory} title="Clear chat"
                        className="p-1.5 rounded-lg hover:bg-white/20 transition text-white/70 hover:text-white">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <button onClick={() => setIsOpen(false)}
                        className="p-1.5 rounded-lg hover:bg-white/20 transition text-white/70 hover:text-white">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 bg-slate-50/80 no-scrollbar">
                    {messages.map((msg, i) =>
                      msg.role === 'bot'
                        ? <BotMessage key={i} content={msg.content} time={msg.time}
                            productCards={msg.productCards} actionButtons={msg.actionButtons}
                            isStreaming={msg.isStreaming} />
                        : <UserMessage key={i} content={msg.content} time={msg.time} />
                    )}
                    {isLoading && messages[messages.length - 1]?.role !== 'bot' && (
                      <div className="flex items-end gap-2 animate-fadeIn">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 mb-1 shadow">
                          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                          </svg>
                        </div>
                        <TypingDots />
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Quick Replies */}
                  {!isLoading && quickReplies.length > 0 && (
                    <QuickReplies options={quickReplies} onSelect={(opt) => { setQuickReplies([]); sendMessage(opt); }} />
                  )}

                  {/* Input */}
                  <div className="flex items-end gap-2 px-3 py-3 bg-white border-t border-slate-100 flex-shrink-0">
                    <textarea ref={inputRef} value={input}
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
                    <button onClick={() => sendMessage()} disabled={!input.trim() || isLoading}
                      className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    </button>
                  </div>

                  {/* Footer */}
                  <div className="text-center py-1.5 bg-white border-t border-slate-100 flex-shrink-0">
                    <span className="text-[9.5px] text-slate-400 tracking-wide">
                      AADONA Communication · {TOLL_FREE_DISPLAY} · contact@aadona.com
                    </span>
                  </div>
                </>
              ) : (
                <RegistrationForm onStart={handleStart} />
              )}
            </div>
          </div>
        )}

        {/* Launcher */}
        <div ref={callDrawerRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {!isOpen && hasUnread && showBubble && (
            <>
              <div className="notif-bubble">👋 Hi! Got a question?</div>
              <span className="notif-badge">1</span>
            </>
          )}

          {/* Call Drawer */}
          {showCallDrawer && (
            <div className="call-drawer-enter" style={{ position: 'absolute', bottom: 'calc(100% + 12px)', right: 0, width: '240px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.09)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.13)', zIndex: 100 }}>
              <div style={{ background: 'linear-gradient(135deg,#0d9488,#0f766e)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <svg width="14" height="14" fill="#fff" viewBox="0 0 24 24"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.21.49 2.53.76 3.88.76a1 1 0 011 1V20a1 1 0 01-1 1C10.18 21 3 13.82 3 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.36.27 2.67.76 3.88a1 1 0 01-.23 1.12l-2.41 1.79z"/></svg>
                  <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>Contact Support</span>
                </div>
                <button onClick={() => setShowCallDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.75)', padding: '2px', display: 'flex', alignItems: 'center', borderRadius: '4px', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc' }}>
                <p style={{ margin: 0, fontSize: '10.5px', color: '#64748b', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Toll Free Support Line</p>
                <a href={`tel:${TOLL_FREE}`} className="call-number-row" onClick={() => setShowCallDrawer(false)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="14" height="14" fill="#fff" viewBox="0 0 24 24"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.21.49 2.53.76 3.88.76a1 1 0 011 1V20a1 1 0 01-1 1C10.18 21 3 13.82 3 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.36.27 2.67.76 3.88a1 1 0 01-.23 1.12l-2.41 1.79z"/></svg>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '10px', color: '#0d9488', fontWeight: 600 }}>Tap to call →</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', letterSpacing: '0.4px' }}>{TOLL_FREE_DISPLAY}</span>
                    </div>
                  </div>
                </a>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '4px 0 2px' }}>
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 6v6l4 2"/></svg>
                  <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>Mon – Sat · 10:30 AM to 6:30 PM IST</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#ecfdf5', borderRadius: '8px', padding: '6px 10px', border: '1px solid #a7f3d0' }}>
                  <svg width="11" height="11" fill="#10b981" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  <span style={{ fontSize: '10px', color: '#065f46', fontWeight: 500 }}>Free from all Indian networks</span>
                </div>
              </div>
            </div>
          )}

          {/* Pill Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', borderRadius: '9999px', overflow: 'visible', border: '1px solid rgba(5,150,105,0.3)', boxShadow: '0 4px 20px rgba(16,185,129,0.35)', width: '56px' }}>
            <div className="ac-btn-wrap" style={{ borderRadius: '9999px 9999px 0 0', overflow: 'visible' }}>
              <span className="ac-tooltip">{isOpen ? 'Minimise' : 'Chat with us'}</span>
              <button onClick={isOpen ? () => setIsOpen(false) : handleOpen}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '56px', width: '56px', background: isOpen ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#10b981,#059669)', border: 'none', cursor: 'pointer', transition: 'background 0.15s', outline: 'none', borderRadius: '9999px 9999px 0 0', overflow: 'hidden' }}>
                {isOpen ? (
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                ) : (
                  <svg width="20" height="20" fill="#fff" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
                )}
              </button>
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
            <div className="ac-btn-wrap" style={{ borderRadius: '0 0 9999px 9999px', overflow: 'visible' }}>
              <span className="ac-tooltip">📞 Contact</span>
              <button onClick={handleCallDrawerToggle}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '56px', width: '56px', background: showCallDrawer ? 'linear-gradient(135deg,#0f766e,#115e59)' : 'linear-gradient(135deg,#0d9488,#0f766e)', border: 'none', cursor: 'pointer', transition: 'background 0.15s', outline: 'none', borderRadius: '0 0 9999px 9999px', overflow: 'hidden' }}>
                <svg width="20" height="20" fill="#fff" viewBox="0 0 24 24"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.21.49 2.53.76 3.88.76a1 1 0 011 1V20a1 1 0 01-1 1C10.18 21 3 13.82 3 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.36.27 2.67.76 3.88a1 1 0 01-.23 1.12l-2.41 1.79z"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}