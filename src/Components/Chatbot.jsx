import { useState, useRef, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const STORAGE_KEY_USER = 'aadona_chat_user_v3';
const STORAGE_KEY_HISTORY = (phone) => `aadona_chat_history_${phone}`;
const MAX_HISTORY = 40;
const TOLL_FREE = '18002026599';
const TOLL_FREE_DISPLAY = '1800-202-6599';

const QUICK_REPLY_MAP = {
  default: ['Products', 'Support', 'Partner Info', 'About AADONA', 'Contact Us'],
  products: ['Wireless APs', 'Surveillance', 'Network Switches', 'Servers & NAS', 'Industrial Switches'],
  support: ['Warranty Check', 'Tech Squad', 'Request DOA', 'Product Registration', 'Product Support'],
  partner: ['Become a Partner', 'Project Locking', 'Request a Demo', 'Request Training'],
  contact: ['Call Us', 'Email Us', 'Office Address', 'Working Hours'],
  technical: ['AP Configuration', 'Switch Configuration', 'NAS Configuration', 'CCTV Configuration'],
  sales: ['Product Suggestion', 'MII Policy', 'GeM Authorization', 'Product Guide'],
};

function getQuickReplies(text) {
  const t = text.toLowerCase();
  if (t.includes('config') || t.includes('technical') || t.includes('setup')) return QUICK_REPLY_MAP.technical;
  if (t.includes('product') || t.includes('wireless') || t.includes('switch') || t.includes('nas') || t.includes('server') || t.includes('surveillance') || t.includes('ap')) return QUICK_REPLY_MAP.products;
  if (t.includes('support') || t.includes('warranty') || t.includes('doa') || t.includes('repair')) return QUICK_REPLY_MAP.support;
  if (t.includes('partner') || t.includes('reseller') || t.includes('demo') || t.includes('training')) return QUICK_REPLY_MAP.partner;
  if (t.includes('contact') || t.includes('address') || t.includes('call') || t.includes('email')) return QUICK_REPLY_MAP.contact;
  if (t.includes('gem') || t.includes('mii') || t.includes('guide') || t.includes('suggest')) return QUICK_REPLY_MAP.sales;
  return QUICK_REPLY_MAP.default;
}

function getTime() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function EscalateBadge({ type }) {
  const config = {
    technical: {
      label: 'Technical Support',
      icon: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v10a2 2 0 002 2h6a2 2 0 002-2V3M9 13H5a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2v-4a2 2 0 00-2-2z',
      color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd'
    },
    sales: {
      label: 'Sales Team',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v2h5v-2zm0 0v-2a3 3 0 015.356-1.857m0 0a5.002 5.002 0 019.288 0',
      color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4'
    },
    gem: {
      label: 'GeM Specialist',
      icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
      color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe'
    },
  };
  const c = config[type] || config.technical;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '10px', marginTop: '6px' }}>
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={c.color} strokeWidth={1.8} style={{ flexShrink: 0 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
      </svg>
      <div>
        <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: c.color, fontFamily: "'DM Sans', sans-serif" }}>Connecting you to {c.label}</p>
        <p style={{ margin: 0, fontSize: '10px', color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}>We'll reach out at your registered contact</p>
      </div>
    </div>
  );
}

function renderMarkdown(text) {
  if (!text) return null;
  const clean = text.replace(/https?:\/\/[^\s)]+/g, '').trim();
  const lines = clean.split('\n');
  const elements = [];
  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.replace(/^[•\-\*]\s+/, '');
      elements.push(
        <div key={lineIdx} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', marginBottom: '2px' }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981', marginTop: '7px', flexShrink: 0 }} />
          <span style={{ lineHeight: 1.5 }}>{renderInline(content)}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const num = trimmed.match(/^(\d+)\./)[1];
      const content = trimmed.replace(/^\d+\.\s+/, '');
      elements.push(
        <div key={lineIdx} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', marginBottom: '2px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', minWidth: '14px', marginTop: '1px', flexShrink: 0 }}>{num}.</span>
          <span style={{ lineHeight: 1.5 }}>{renderInline(content)}</span>
        </div>
      );
    } else if (!trimmed) {
      if (lineIdx > 0 && lineIdx < lines.length - 1) {
        elements.push(<div key={lineIdx} style={{ height: '6px' }} />);
      }
    } else {
      elements.push(
        <div key={lineIdx} style={{ lineHeight: 1.6, marginBottom: '1px' }}>
          {renderInline(trimmed)}
        </div>
      );
    }
  });
  return <>{elements}</>;
}

function renderInline(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i} style={{ fontWeight: 700, color: '#0f172a' }}>{part.slice(2, -2)}</strong>;
    }
    const cleaned = part.replace(/\*+/g, '');
    return cleaned ? <span key={i}>{cleaned}</span> : null;
  });
}

function ProductCard({ product }) {
  if (!product) return null;
  const [imgError, setImgError] = useState(false);
  return (
    <div style={{ width: '168px', flexShrink: 0, borderRadius: '14px', border: '1px solid #e2e8f0', background: '#fff', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ height: '100px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderBottom: '1px solid #f1f5f9' }}>
        {product.image && !imgError ? (
          <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }} onError={() => setImgError(true)} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#cbd5e1" strokeWidth={1.2}>
              <rect x="2" y="3" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8M12 17v4" />
            </svg>
            <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>No Image</span>
          </div>
        )}
      </div>
      <div style={{ padding: '10px' }}>
        {product.model && (
          <div style={{ display: 'inline-block', marginBottom: '6px' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '6px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontFamily: 'monospace', letterSpacing: '0.5px' }}>{product.model}</span>
          </div>
        )}
        <p style={{ fontSize: '11.5px', fontWeight: 600, color: '#0f172a', lineHeight: 1.35, margin: '0 0 4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.name}</p>
        {product.overview && <p style={{ fontSize: '10px', color: '#64748b', lineHeight: 1.5, margin: '0 0 8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.overview}</p>}
        {product.features?.length > 0 && (
          <ul style={{ margin: '0 0 10px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {product.features.slice(0, 2).map((f, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', fontSize: '10px', color: '#475569' }}>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981', marginTop: '5px', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{f}</span>
              </li>
            ))}
          </ul>
        )}
        <a href={product.url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: '#fff', padding: '7px', borderRadius: '9px', textDecoration: 'none', background: 'linear-gradient(135deg, #10b981, #059669)' }}>
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          {product.visitLabel || 'View Product'}
        </a>
      </div>
    </div>
  );
}

function SingleProductCard({ product }) {
  if (!product) return null;
  const [imgError, setImgError] = useState(false);
  return (
    <div style={{ borderRadius: '14px', border: '1px solid #e2e8f0', background: '#fff', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', gap: '12px', padding: '12px' }}>
        <div style={{ flexShrink: 0, width: '80px', height: '80px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {product.image && !imgError ? (
            <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} onError={() => setImgError(true)} />
          ) : (
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#cbd5e1" strokeWidth={1.2}>
              <rect x="2" y="3" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8M12 17v4" />
            </svg>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {product.model && (
            <span style={{ display: 'inline-block', fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '6px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontFamily: 'monospace', letterSpacing: '0.5px', marginBottom: '5px' }}>
              {product.model}
            </span>
          )}
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.name}</p>
          {product.overview && (
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.overview}</p>
          )}
          {product.features?.length > 0 && (
            <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {product.features.slice(0, 2).map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', fontSize: '10px', color: '#475569' }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981', marginTop: '5px', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{f}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div style={{ padding: '0 12px 12px' }}>
        <a href={product.url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#fff', padding: '9px', borderRadius: '9px', textDecoration: 'none', background: 'linear-gradient(135deg, #10b981, #059669)' }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          {product.visitLabel || `View ${product.model || product.name}`}
        </a>
      </div>
    </div>
  );
}

function ActionButtons({ buttons }) {
  if (!buttons?.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
      {buttons.map((btn, i) => (
        <a key={i} href={btn.url} target="_self"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, padding: '7px 14px', borderRadius: '100px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', textDecoration: 'none', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          {btn.label}
        </a>
      ))}
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '12px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px 14px 14px 4px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: `aadonaBounce 0.9s ease ${i * 0.18}s infinite` }} />
      ))}
    </div>
  );
}

function BotMessage({ content, time, productCards, actionButtons, isStreaming, escalate }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }} className="aadona-fadeIn">
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: '2px', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
        <svg width="13" height="13" fill="#fff" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '85%' }}>
        <div style={{ padding: '11px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px 14px 14px 4px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', fontSize: '13px', color: '#1e293b', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
          {isStreaming
            ? (
              <>
                {renderMarkdown(content)}
                <span style={{ display: 'inline-block', width: '2px', height: '14px', background: '#10b981', marginLeft: '2px', borderRadius: '2px', animation: 'aadonaPulse 1s ease infinite', verticalAlign: 'middle' }} />
              </>
            )
            : renderMarkdown(content)
          }
        </div>
        {!isStreaming && escalate && <EscalateBadge type={escalate} />}
        {!isStreaming && productCards?.length > 0 && (
          productCards.length === 1
            ? <SingleProductCard product={productCards[0]} />
            : (
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                {productCards.map((p, i) => <ProductCard key={i} product={p} />)}
              </div>
            )
        )}
        {!isStreaming && <ActionButtons buttons={actionButtons} />}
        {!isStreaming && time && (
          <span style={{ fontSize: '10px', color: '#94a3b8', paddingLeft: '4px', fontFamily: "'DM Sans', sans-serif" }}>{time}</span>
        )}
      </div>
    </div>
  );
}

function UserMessage({ content, time }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: '8px' }} className="aadona-fadeIn">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', maxWidth: '78%' }}>
        <div style={{ padding: '11px 14px', borderRadius: '14px 14px 4px 14px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: '13px', lineHeight: 1.55, boxShadow: '0 2px 8px rgba(16,185,129,0.25)', fontFamily: "'DM Sans', sans-serif" }}>
          {content}
        </div>
        {time && <span style={{ fontSize: '10px', color: '#94a3b8', paddingRight: '4px', fontFamily: "'DM Sans', sans-serif" }}>{time}</span>}
      </div>
    </div>
  );
}

function QuickReplies({ options, onSelect }) {
  if (!options?.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px 12px 10px' }}>
      {options.map((opt) => (
        <button key={opt} onClick={() => onSelect(opt)}
          style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '100px', border: '1px solid #a7f3d0', color: '#065f46', background: '#fff', cursor: 'pointer', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
          {opt}
        </button>
      ))}
    </div>
  );
}

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

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: '1.5px solid #e2e8f0', background: '#fff',
    fontSize: '13px', color: '#1e293b', fontFamily: "'DM Sans', sans-serif",
    outline: 'none', boxSizing: 'border-box'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ padding: '20px', background: 'linear-gradient(135deg, #10b981, #059669)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" fill="#fff" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
          </div>
          <div>
            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '16px', margin: 0 }}>AADONA Assistant</h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px', margin: 0 }}>AI-Powered · Available 24/7</p>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>Get instant answers on products, support, GeM, and partnerships.</p>
      </div>

      <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', padding: '12px', background: '#f0fdf4', borderBottom: '1px solid #d1fae5', scrollbarWidth: 'none', flexShrink: 0 }}>
        {['Products & Specs', 'Config Support', 'GeM / MII', 'Partner Programs', 'Warranty & DOA'].map(item => (
          <span key={item} style={{ flexShrink: 0, fontSize: '10px', fontWeight: 600, padding: '4px 10px', borderRadius: '100px', background: '#fff', color: '#065f46', border: '1px solid #a7f3d0', whiteSpace: 'nowrap' }}>{item}</span>
        ))}
      </div>

      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', background: '#f8fafc' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px' }}>Quick intro before we begin</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '5px' }}>Full Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="Enter your name" style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#10b981'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '5px' }}>Mobile Number *</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#64748b', fontWeight: 500 }}>+91</span>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="10-digit number" style={{ ...inputStyle, paddingLeft: '44px' }}
                onFocus={e => e.target.style.borderColor = '#10b981'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '5px' }}>City *</label>
            <input type="text" value={city} onChange={e => setCity(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="Enter your city" style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#10b981'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
          </div>
        </div>
        {error && (
          <p style={{ marginTop: '8px', fontSize: '11px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            {error}
          </p>
        )}
        <button onClick={handleSubmit} disabled={loading}
          style={{ width: '100%', marginTop: '16px', padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(16,185,129,0.35)', fontFamily: "'DM Sans', sans-serif" }}>
          {loading ? (
            <><svg style={{ animation: 'aadonaSpin 1s linear infinite' }} width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.4)" strokeWidth="4" /><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Starting...</>
          ) : (
            <>Start Chat<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg></>
          )}
        </button>
        <p style={{ textAlign: 'center', fontSize: '10px', color: '#94a3b8', marginTop: '12px' }}>Your details are kept private · AADONA Communication Pvt Ltd</p>
      </div>
    </div>
  );
}

// ─── Main Chatbot ─────────────────────────────────────────────────────────
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
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const callDrawerRef = useRef(null);
  const lastSummaryRef = useRef({ messageCount: 0, sentAt: 0 });
  const inactivityTimerRef = useRef(null);
  const summaryMailSentRef = useRef(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const scrollToBottom = useCallback((force = false) => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (force || distanceFromBottom < 150) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => { if (isLoading) scrollToBottom(true); }, [isLoading]);
  useEffect(() => { if (isOpen && isRegistered) setTimeout(() => inputRef.current?.focus(), 100); }, [isOpen, isRegistered]);

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
    const handler = (e) => { if (callDrawerRef.current && !callDrawerRef.current.contains(e.target)) setShowCallDrawer(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCallDrawer]);

  useEffect(() => { const t = setTimeout(() => setShowBubble(true), 5000); return () => clearTimeout(t); }, []);
  useEffect(() => { return () => { if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current); }; }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!user?.phone) return;
      const userMessages = messages.filter(m => m.role === 'user');
      if (!userMessages.length) return;
      navigator.sendBeacon(`${API_BASE}/chat/summary`, new Blob([JSON.stringify({
        name: user.name, phone: user.phone, city: user.city,
        trigger: 'close',
        messages: messages.map(m => ({ role: m.role, content: m.content, time: m.time })),
        isResume: false
      })], { type: 'application/json' }));
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [messages, user]);

  const sendChatSummaryMail = useCallback(async (chatMessages, isResume = false, trigger = 'inactivity') => {
    if (!user?.phone) return;
    if (isResume) {
      if (!summaryMailSentRef.current) return;
      try { await fetch(`${API_BASE}/chat/summary`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: user.name, phone: user.phone, city: user.city, messages: chatMessages.map(m => ({ role: m.role, content: m.content, time: m.time })), isResume: true }) }); } catch { }
      return;
    }
    if (!chatMessages?.length || !chatMessages.filter(m => m.role === 'user').length) return;
    lastSummaryRef.current = { messageCount: chatMessages.length, sentAt: Date.now() };
    summaryMailSentRef.current = true;
    try { await fetch(`${API_BASE}/chat/summary`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: user.name, phone: user.phone, city: user.city, trigger, messages: chatMessages.map(m => ({ role: m.role, content: m.content, time: m.time })), isResume: false }) }); } catch { }
  }, [user]);

  const resetInactivityTimer = useCallback((chatMessages) => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => { sendChatSummaryMail(chatMessages, false, 'inactivity'); }, 10 * 60 * 1000);
  }, [sendChatSummaryMail]);

  const loadHistory = (phone) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY(phone));
      if (!raw) return;
      const hist = JSON.parse(raw);
      if (Array.isArray(hist) && hist.length) {
        setMessages(hist.map(m => ({
          role: m.role === 'assistant' ? 'bot' : 'user',
          content: m.content, time: m.time || '',
          productCards: m.productCards || null,
          actionButtons: m.actionButtons || null,
          escalate: m.escalate || null
        })));
        setApiHistory(hist.slice(-10).map(m => ({ role: m.role, content: m.content })));
        setQuickReplies(QUICK_REPLY_MAP.default);
      }
    } catch { }
  };

  const saveHistory = useCallback((phone, allMessages) => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY(phone), JSON.stringify(
        allMessages.slice(-MAX_HISTORY).map(m => ({
          role: m.role === 'bot' ? 'assistant' : 'user',
          content: m.content, time: m.time,
          productCards: m.productCards || null,
          actionButtons: m.actionButtons || null,
          escalate: m.escalate || null
        }))
      ));
    } catch { }
  }, []);

  const handleStart = async (name, phone, city) => {
    const userData = { name, phone, city, joinedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userData));
    fetch(`${API_BASE}/chat/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone, city }) }).catch(() => { });
    setUser(userData);
    setIsRegistered(true);

    const existingHistory = localStorage.getItem(STORAGE_KEY_HISTORY(phone));
    if (existingHistory) {
      loadHistory(phone);
      const welcomeBack = { role: 'bot', content: `Welcome back, **${name}**. How can I assist you today?`, time: getTime() };
      setMessages(prev => { const updated = [...prev, welcomeBack]; saveHistory(phone, updated); return updated; });
    } else {
      const greeting = {
        role: 'bot',
        content: `Hello **${name}**, welcome to **AADONA** — India's leading networking solutions brand.\n\nI can assist you with products, technical configuration, GeM/MII queries, support, and partnership programs. What would you like to know?`,
        time: getTime()
      };
      setMessages([greeting]);
      saveHistory(phone, [greeting]);
    }
    setQuickReplies(QUICK_REPLY_MAP.default);
  };

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || isLoading) return;

    if (summaryMailSentRef.current) sendChatSummaryMail(messages, true);

    setInput('');
    setQuickReplies([]);
    const userMsg = { role: 'user', content: trimmed, time: getTime() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    scrollToBottom(true);

    const newApiHistory = [...apiHistory, { role: 'user', content: trimmed }];
    setApiHistory(newApiHistory);
    setIsLoading(true);

    const botMsgId = `bot_${Date.now()}`;
    const streamingMsg = { id: botMsgId, role: 'bot', content: '', time: getTime(), isStreaming: true, productCards: null, actionButtons: null, escalate: null };
    setMessages(prev => [...prev, streamingMsg]);

    let streamedText = '';
    let finalProductCards = null;
    let finalActionButtons = null;
    let finalEscalate = null;

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newApiHistory,
          userName: user?.name || 'Guest',
          userPhone: user?.phone || '',
          userCity: user?.city || ''
        }),
      });

      if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.error || 'Server error'); }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const rawTokens = [];
      let donePayload = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          try {
            const json = JSON.parse(line.replace('data: ', ''));
            if (json.token) rawTokens.push(json.token);
            if (json.done) donePayload = json;
          } catch { }
        }
      }

      if (donePayload) {
        finalProductCards = donePayload.productCards || null;
        finalActionButtons = donePayload.actionButtons || null;
        finalEscalate = donePayload.escalate || null;
      }

      streamedText = rawTokens.join('');

      let displayed = '';
      for (const token of rawTokens) {
        for (const char of token.split('')) {
          displayed += char;
          const snap = displayed;
          setMessages(prev => {
            const updated = [...prev];
            const idx = updated.findIndex(m => m.id === botMsgId);
            if (idx !== -1) updated[idx] = { ...updated[idx], content: snap, isStreaming: true };
            return updated;
          });
          scrollToBottom();
          await new Promise(r => setTimeout(r, 10));
        }
      }

      setMessages(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(m => m.id === botMsgId);
        if (idx !== -1) {
          let finalText = (streamedText || '').trim();
          finalText = finalText.replace(/\*\*(?![^*]*\*\*)/, '');
          if (!finalText || finalText.length < 10) finalText = 'Here are matching AADONA products:';
          updated[idx] = {
            ...updated[idx],
            content: finalText,
            isStreaming: false,
            productCards: finalProductCards,
            actionButtons: finalActionButtons,
            escalate: finalEscalate
          };
        }
        return updated;
      });

      const finalMessages = [
        ...newMessages,
        { id: botMsgId, role: 'bot', content: streamedText, time: getTime(), productCards: finalProductCards, actionButtons: finalActionButtons, escalate: finalEscalate, isStreaming: false }
      ];
      setApiHistory(prev => [...prev, { role: 'assistant', content: streamedText }]);
      setQuickReplies(getQuickReplies(trimmed));
      saveHistory(user?.phone, finalMessages);
      resetInactivityTimer(finalMessages);

    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(m => m.id === botMsgId);
        if (idx !== -1) updated[idx] = { ...updated[idx], content: `Something went wrong. Please call **${TOLL_FREE_DISPLAY}** or email contact@aadona.com`, isStreaming: false };
        return updated;
      });
      setQuickReplies(QUICK_REPLY_MAP.default);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, messages, apiHistory, isLoading, user, saveHistory, scrollToBottom, sendChatSummaryMail, resetInactivityTimer]);

  const handleClearHistory = () => {
    if (!user?.phone) return;
    localStorage.removeItem(STORAGE_KEY_HISTORY(user.phone));
    const greeting = { role: 'bot', content: `Conversation cleared. How can I assist you, **${user.name}**?`, time: getTime() };
    setMessages([greeting]);
    setApiHistory([]);
    setQuickReplies(QUICK_REPLY_MAP.default);
    lastSummaryRef.current = { messageCount: 0, sentAt: 0 };
    summaryMailSentRef.current = false;
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
  };

  const handleOpen = () => { setIsOpen(true); setHasUnread(false); setShowCallDrawer(false); };
  const handleCallDrawerToggle = () => { setShowCallDrawer(prev => !prev); setIsOpen(false); };
  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  // ─── FIXED: Mobile chat window styles ─────────────────────────────────
  const chatWindowStyle = isMobile
    ? {
        // Mobile: position fixed, screen ke corners se safe distance
        position: 'fixed',
        bottom: '90px',   // launcher ke upar
        right: '10px',    // right edge se 10px
        left: '10px',     // left edge se 10px (cut nahi hoga)
        width: 'auto',    // left+right se auto width
        height: 'calc(100dvh - 110px)', // screen height minus launcher + margin
        maxHeight: 'calc(100dvh - 110px)',
      }
    : {
        // Desktop: fixed width, launcher ke upar
        position: 'absolute',
        bottom: 'calc(100% + 12px)',
        right: 0,
        width: '375px',
        height: 'min(590px, calc(100dvh - 130px))',
        maxHeight: 'calc(100dvh - 130px)',
      };

  return (
    <>
      <style>{`
        @keyframes aadonaFadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .aadona-fadeIn { animation: aadonaFadeIn 0.2s ease forwards; }
        @keyframes aadonaSlideUp { from { opacity:0; transform:scale(0.95) translateY(18px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .aadona-window { animation: aadonaSlideUp 0.26s cubic-bezier(0.34,1.18,0.64,1) forwards; }
        @keyframes aadonaBounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-4px); } }
        @keyframes aadonaPulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @keyframes aadonaSpin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes aadonaBlinkDot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.82); } }
        @keyframes aadonaBubbleIn { 0% { opacity:0; transform:translateX(-68%) scale(0.9); } 100% { opacity:1; transform:translateX(-68%) scale(1); } }
        @keyframes aadonaBubbleBounce { 0%,100% { transform:translateX(-68%) translateY(0); } 50% { transform:translateX(-68%) translateY(-3px); } }
        @keyframes aadonaDrawerUp { from { opacity:0; transform:translateY(8px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        .aadona-drawer { animation: aadonaDrawerUp 0.2s cubic-bezier(0.34,1.18,0.64,1) forwards; }
        .aadona-notif-bubble {
          position:absolute; bottom:calc(100% + 10px); left:35%; transform:translateX(-68%);
          background:#1e293b; color:#f8fafc;
          font-size:11px; font-weight:500; padding:6px 7px; border-radius:10px;
          white-space:nowrap; pointer-events:none;
          animation: aadonaBubbleIn 0.4s 0.6s ease both, aadonaBubbleBounce 2s 1.2s ease-in-out infinite;
          box-shadow:0 4px 16px rgba(0,0,0,0.2); font-family:'DM Sans',sans-serif;
        }
        .aadona-notif-bubble::after { content:''; position:absolute; top:100%; left:50%; transform:translateX(-50%); border:6px solid transparent; border-top-color:#1e293b; }
        .aadona-tooltip {
          position:absolute; right:calc(100% + 10px); top:50%; transform:translateY(-50%) translateX(4px);
          background:#1e293b; color:#f8fafc;
          font-size:11px; font-weight:500; padding:5px 11px; border-radius:8px;
          white-space:nowrap; pointer-events:none; opacity:0;
          transition:opacity 0.18s ease, transform 0.18s ease; z-index:99999;
          font-family:'DM Sans',sans-serif;
        }
        .aadona-tooltip::after { content:''; position:absolute; left:100%; top:50%; transform:translateY(-50%); border:5px solid transparent; border-left-color:#1e293b; }
        .aadona-btn-wrap:hover .aadona-tooltip { opacity:1; transform:translateY(-50%) translateX(0); }
        .aadona-btn-wrap { position:relative; display:flex; }
        .aadona-notif-dot {
          position:absolute; top:-5px; right:-5px; width:17px; height:17px;
          background:#ef4444; border-radius:50%; border:2px solid #fff;
          display:flex; align-items:center; justify-content:center;
          font-size:10px; font-weight:700; color:#fff; font-family:'DM Sans',sans-serif;
          animation: aadonaBlinkDot 1.4s ease-in-out infinite;
        }
        .aadona-close-btn { width:30px; height:30px; border-radius:50%; background:#ef4444; border:2.5px solid #fff; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:20; box-shadow:0 2px 10px rgba(239,68,68,0.5); transition:transform 0.15s,background 0.15s; outline:none; }
        .aadona-close-btn:hover { transform:scale(1.15); background:#dc2626; }
        .aadona-no-scroll::-webkit-scrollbar { display:none; }
        .aadona-no-scroll { scrollbar-width:none; -ms-overflow-style:none; }
        .aadona-call-row { display:flex; align-items:center; gap:9px; background:#f0fdf4; border-radius:10px; padding:10px 12px; text-decoration:none; border:1px solid #a7f3d0; transition:background 0.15s; }
        .aadona-call-row:hover { background:#d1fae5; }
        .aadona-msg-container { flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:12px; background:linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%); }
        .aadona-qr-btn:hover { background:#10b981 !important; color:#fff !important; border-color:#10b981 !important; }
      `}</style>

      {/* ─── FIXED: Mobile me portal-style — sibling div, not child ─── */}
      {isOpen && isMobile && (
        <div
          className="aadona-window"
          style={{
            ...chatWindowStyle,
            zIndex: 99998,
            background: '#fff',
            borderRadius: '20px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.14), 0 8px 24px rgba(16,185,129,0.12)',
            border: '1px solid rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Close button — mobile me top-right corner of window */}
          <button
            className="aadona-close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close chat"
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              zIndex: 30,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {isRegistered ? (
            <>
              {/* Header */}
              <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" fill="#fff" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '14px', margin: 0 }}>AADONA Assistant</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#a7f3d0', animation: 'aadonaPulse 2s ease infinite', flexShrink: 0 }} />
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Chatting as {user?.name}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '2px', marginLeft: 'auto', paddingRight: '28px' }}>
                  <button onClick={handleCallDrawerToggle} style={{ padding: '7px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', display: 'flex' }}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.21.49 2.53.76 3.88.76a1 1 0 011 1V20a1 1 0 01-1 1C10.18 21 3 13.82 3 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.36.27 2.67.76 3.88a1 1 0 01-.23 1.12l-2.41 1.79z" /></svg>
                  </button>
                  <button onClick={handleClearHistory} style={{ padding: '7px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex' }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div ref={messagesContainerRef} className="aadona-msg-container aadona-no-scroll">
                {messages.map((msg, i) =>
                  msg.role === 'bot'
                    ? <BotMessage key={msg.id || i} content={msg.content} time={msg.time} productCards={msg.productCards} actionButtons={msg.actionButtons} isStreaming={msg.isStreaming} escalate={msg.escalate} />
                    : <UserMessage key={i} content={msg.content} time={msg.time} />
                )}
                {isLoading && !messages[messages.length - 1]?.isStreaming && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }} className="aadona-fadeIn">
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: '2px' }}>
                      <svg width="13" height="13" fill="#fff" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
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
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '10px 12px 12px', background: '#fff', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 88) + 'px';
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about AADONA..."
                  rows={1}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', color: '#1e293b', resize: 'none', outline: 'none', minHeight: '40px', maxHeight: '88px', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}
                  onFocus={e => e.target.style.borderColor = '#10b981'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  disabled={isLoading}
                />
                <button onClick={() => sendMessage()} disabled={!input.trim() || isLoading}
                  style={{ width: '40px', height: '40px', borderRadius: '12px', border: 'none', background: input.trim() && !isLoading ? 'linear-gradient(135deg, #10b981, #059669)' : '#e2e8f0', cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: input.trim() && !isLoading ? '0 2px 10px rgba(16,185,129,0.35)' : 'none' }}>
                  <svg width="16" height="16" fill={input.trim() && !isLoading ? '#fff' : '#94a3b8'} viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>

              {/* Footer */}
              <div style={{ textAlign: 'center', padding: '6px', background: '#fff', borderTop: '1px solid #f8fafc', flexShrink: 0 }}>
                <span style={{ fontSize: '9.5px', color: '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}>
                  AADONA Communication · {TOLL_FREE_DISPLAY} · contact@aadona.com
                </span>
              </div>
            </>
          ) : (
            <RegistrationForm onStart={handleStart} />
          )}
        </div>
      )}

      <div style={{ position: 'fixed', bottom: '20px', right: '16px', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', fontFamily: "'DM Sans',sans-serif" }}>

        {/* Desktop Chat Window */}
        {isOpen && !isMobile && (
          <div style={{ position: 'relative' }}>
            <button className="aadona-close-btn" onClick={() => setIsOpen(false)} aria-label="Close chat"
              style={{ position: 'absolute', top: '-10px', right: '-10px' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <div className="aadona-window" style={{
              width: '375px',
              maxHeight: 'calc(100dvh - 110px)',
              height: 'min(590px, calc(100dvh - 110px))',
              background: '#fff',
              borderRadius: '20px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.14), 0 8px 24px rgba(16,185,129,0.12)',
              border: '1px solid rgba(0,0,0,0.08)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}>
              {isRegistered ? (
                <>
                  {/* Header */}
                  <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="18" height="18" fill="#fff" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '14px', margin: 0 }}>AADONA Assistant</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#a7f3d0', animation: 'aadonaPulse 2s ease infinite', flexShrink: 0 }} />
                        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Chatting as {user?.name}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '2px', marginLeft: 'auto' }}>
                      <button onClick={handleCallDrawerToggle} style={{ padding: '7px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', display: 'flex' }}>
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.21.49 2.53.76 3.88.76a1 1 0 011 1V20a1 1 0 01-1 1C10.18 21 3 13.82 3 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.36.27 2.67.76 3.88a1 1 0 01-.23 1.12l-2.41 1.79z" /></svg>
                      </button>
                      <button onClick={handleClearHistory} style={{ padding: '7px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex' }}>
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div ref={messagesContainerRef} className="aadona-msg-container aadona-no-scroll">
                    {messages.map((msg, i) =>
                      msg.role === 'bot'
                        ? <BotMessage key={msg.id || i} content={msg.content} time={msg.time} productCards={msg.productCards} actionButtons={msg.actionButtons} isStreaming={msg.isStreaming} escalate={msg.escalate} />
                        : <UserMessage key={i} content={msg.content} time={msg.time} />
                    )}
                    {isLoading && !messages[messages.length - 1]?.isStreaming && (
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }} className="aadona-fadeIn">
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: '2px' }}>
                          <svg width="13" height="13" fill="#fff" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
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
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '10px 12px 12px', background: '#fff', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e => {
                        setInput(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 88) + 'px';
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask anything about AADONA..."
                      rows={1}
                      style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', color: '#1e293b', resize: 'none', outline: 'none', minHeight: '40px', maxHeight: '88px', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}
                      onFocus={e => e.target.style.borderColor = '#10b981'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      disabled={isLoading}
                    />
                    <button onClick={() => sendMessage()} disabled={!input.trim() || isLoading}
                      style={{ width: '40px', height: '40px', borderRadius: '12px', border: 'none', background: input.trim() && !isLoading ? 'linear-gradient(135deg, #10b981, #059669)' : '#e2e8f0', cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: input.trim() && !isLoading ? '0 2px 10px rgba(16,185,129,0.35)' : 'none' }}>
                      <svg width="16" height="16" fill={input.trim() && !isLoading ? '#fff' : '#94a3b8'} viewBox="0 0 24 24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    </button>
                  </div>

                  {/* Footer */}
                  <div style={{ textAlign: 'center', padding: '6px', background: '#fff', borderTop: '1px solid #f8fafc', flexShrink: 0 }}>
                    <span style={{ fontSize: '9.5px', color: '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}>
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
          {!isOpen && hasUnread && showBubble && <div className="aadona-notif-bubble">Need help? Ask us anything.</div>}

          {/* Call Drawer */}
          {showCallDrawer && (
            <div className="aadona-drawer" style={{ position: 'absolute', bottom: 'calc(100% + 12px)', right: 0, width: '248px', background: '#fff', border: '1px solid rgba(0,0,0,0.09)', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 12px 36px rgba(0,0,0,0.15)', zIndex: 100, fontFamily: "'DM Sans',sans-serif" }}>
              <div style={{ background: 'linear-gradient(135deg,#10b981,#059669)', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="14" height="14" fill="#fff" viewBox="0 0 24 24"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.21.49 2.53.76 3.88.76a1 1 0 011 1V20a1 1 0 01-1 1C10.18 21 3 13.82 3 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.36.27 2.67.76 3.88a1 1 0 01-.23 1.12l-2.41 1.79z" /></svg>
                  <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>Contact Support</span>
                </div>
                <button onClick={() => setShowCallDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.75)', padding: '2px', display: 'flex' }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc' }}>
                <p style={{ margin: 0, fontSize: '10px', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Toll Free Support</p>
                <a href={`tel:${TOLL_FREE}`} className="aadona-call-row" onClick={() => setShowCallDrawer(false)}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" fill="#fff" viewBox="0 0 24 24"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.21.49 2.53.76 3.88.76a1 1 0 011 1V20a1 1 0 01-1 1C10.18 21 3 13.82 3 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.36.27 2.67.76 3.88a1 1 0 01-.23 1.12l-2.41 1.79z" /></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#0d9488', fontWeight: 700 }}>Tap to call →</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', letterSpacing: '0.4px' }}>{TOLL_FREE_DISPLAY}</div>
                  </div>
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" /></svg>
                  <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>Mon – Fri · 10:30 AM – 6:30 PM IST</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', borderRadius: '8px', padding: '7px 10px', border: '1px solid #a7f3d0' }}>
                  <svg width="11" height="11" fill="#10b981" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  <span style={{ fontSize: '10px', color: '#065f46', fontWeight: 600 }}>Free from all Indian networks</span>
                </div>
              </div>
            </div>
          )}

          {/* Pill Launcher */}
          <div style={{ display: 'flex', flexDirection: 'column', borderRadius: '9999px', overflow: 'visible', border: '1px solid rgba(5,150,105,0.3)', boxShadow: '0 8px 28px rgba(16,185,129,0.3), 0 2px 8px rgba(0,0,0,0.1)', width: '56px' }}>
            <div className="aadona-btn-wrap" style={{ borderRadius: '9999px 9999px 0 0', overflow: 'visible' }}>
              <span className="aadona-tooltip">{isOpen ? 'Minimise' : 'Chat with us'}</span>
              {!isOpen && hasUnread && showBubble && <span className="aadona-notif-dot">1</span>}
              <button onClick={isOpen ? () => setIsOpen(false) : handleOpen}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '56px', width: '56px', background: isOpen ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#10b981,#059669)', border: 'none', cursor: 'pointer', outline: 'none', borderRadius: '9999px 9999px 0 0', overflow: 'hidden' }}>
                {isOpen
                  ? <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  : <svg width="20" height="20" fill="#fff" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
                }
              </button>
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
            <div className="aadona-btn-wrap" style={{ borderRadius: '0 0 9999px 9999px', overflow: 'visible' }}>
              <span className="aadona-tooltip">Call us</span>
              <button onClick={handleCallDrawerToggle}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '56px', width: '56px', background: showCallDrawer ? 'linear-gradient(135deg,#0f766e,#115e59)' : 'linear-gradient(135deg,#0d9488,#0f766e)', border: 'none', cursor: 'pointer', outline: 'none', borderRadius: '0 0 9999px 9999px', overflow: 'hidden' }}>
                <svg width="20" height="20" fill="#fff" viewBox="0 0 24 24"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.21.49 2.53.76 3.88.76a1 1 0 011 1V20a1 1 0 01-1 1C10.18 21 3 13.82 3 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.36.27 2.67.76 3.88a1 1 0 01-.23 1.12l-2.41 1.79z" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}