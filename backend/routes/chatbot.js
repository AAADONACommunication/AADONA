const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const mongoose = require('mongoose');

const BASE_URL = 'https://aadona.com';

// ─── In-Memory Cache ───────────────────────────────────────────────────────
const replyCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const getCached = (key) => {
  const entry = replyCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { replyCache.delete(key); return null; }
  return entry.data;
};
const setCache = (key, data) => {
  if (replyCache.size > 200) replyCache.clear(); // prevent memory leak
  replyCache.set(key, { data, ts: Date.now() });
};

// ─── Rate limiter ──────────────────────────────────────────────────────────
const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: parseInt(process.env.CHATBOT_RATE_LIMIT_MAX || '20', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many messages. Please wait a moment before sending more.' },
});

// ─── Products from DB (no context string, only objects) ───────────────────
const getProducts = async () => {
  try {
    const Product = mongoose.model('Product');
    const products = await Product.find(
      {},
      'name fullName model category subCategory description overview features image slug'
    ).sort({ category: 1 }).limit(500);
    return products;
  } catch { return []; }
};

const getCategoryMap = async () => {
  try {
    const Category = mongoose.model('Category');
    const categories = await Category.find({}, 'name subCategories type');
    const result = [];
    categories.forEach(c => {
      result.push({
        name: c.name, type: c.type,
        slug: c.name.toLowerCase().trim().replace(/\s+/g, '').replace(/[^\w]+/g, '')
      });
      (c.subCategories || []).forEach(sub => {
        result.push({
          name: sub.name, parentName: c.name, parentType: c.type,
          slug: sub.name.toLowerCase().trim().replace(/\s+/g, '').replace(/[^\w]+/g, '')
        });
      });
    });
    return result;
  } catch { return []; }
};

// ─── Static Page Intent Detection ─────────────────────────────────────────
const detectStaticPageIntent = (userMessage, aiReply) => {
  const msg = (userMessage + ' ' + aiReply).toLowerCase();

  const staticPages = [
    { regex: /career|job|hiring|vacancy|internship|intern|fresher|नौकरी/, label: 'View Careers', url: `${BASE_URL}/careers` },
    { regex: /tech squad|on.?site|technician.*visit|घर पे.*technician/, label: 'Tech Squad', url: `${BASE_URL}/techSquad` },
    { regex: /warranty|वारंटी/, label: 'Warranty Check', url: `${BASE_URL}/warranty` },
    { regex: /doa|dead on arrival/, label: 'Request DOA', url: `${BASE_URL}/requestDoa` },
    { regex: /register.*product|product.*registration|रजिस्टर/, label: 'Product Registration', url: `${BASE_URL}/warrantyRegistration` },
    { regex: /issue|problem|fault|not.?working|error|disconnect|hang|slow|repair|खराब|technical|firmware|config|product.*support|support.*product/, label: 'Product Support', url: `${BASE_URL}/productSupport` },
    { regex: /partner|reseller|distributor|पार्टनर/, label: 'Become a Partner', url: `${BASE_URL}/becomePartner` },
    { regex: /project lock|tender|project register/, label: 'Project Locking', url: `${BASE_URL}/projectLocking` },
    { regex: /demo|demonstration|डेमो/, label: 'Request Demo', url: `${BASE_URL}/requestDemo` },
    { regex: /training|train|ट्रेनिंग/, label: 'Request Training', url: `${BASE_URL}/requestTraining` },
    { regex: /contact|reach|call|email|संपर्क/, label: 'Contact Us', url: `${BASE_URL}/contactUs` },
    { regex: /whistle|complaint|misconduct/, label: 'Whistleblower', url: `${BASE_URL}/whistleBlower` },
    { regex: /about.*aadona|aadona.*about|company.*info|who.*aadona/, label: 'About AADONA', url: `${BASE_URL}/about` },
    { regex: /csr|social responsibility/, label: 'CSR', url: `${BASE_URL}/csr` },
    { regex: /blog|article|news/, label: 'Blog', url: `${BASE_URL}/blog` },
    { regex: /leadership.*team|leadership.*aadona|founder.*aadona|ceo.*aadona|who.*founded.*aadona|aadona.*leadership/, label: 'Leadership Team', url: `${BASE_URL}/leadershipTeam` },
    { regex: /customer|client|who.*use|use.*aadona/, label: 'Our Customers', url: `${BASE_URL}/customers` },
  ];

  const intentClear = /help|issue|problem|chahiye|chahta|chahti|karna|kaise|how|need|want|request|submit|check|register|book|interested|apply|intern|about|info|tell me|batao|bata/.test(msg);
  if (!intentClear) return [];

  const seen = new Set();
  const buttons = [];
  for (const page of staticPages) {
    if (page.regex.test(msg) && !seen.has(page.url)) {
      seen.add(page.url);
      buttons.push({ label: page.label, url: page.url });
      if (buttons.length >= 2) break;
    }
  }
  return buttons;
};

// ─── Smart URL builder ────────────────────────────────────────────────────
const buildProductUrl = (p) => {
  const cat = (p.category || '').toLowerCase().trim().replace(/\s+/g, '').replace(/[^\w]+/g, '');
  const sub = (p.subCategory || '').toLowerCase().trim().replace(/\s+/g, '').replace(/[^\w]+/g, '');
  if (cat === 'passive') return `${BASE_URL}/${sub}/${p.slug}`;
  return `${BASE_URL}/${cat}/${p.slug}`;
};

// ─── Product + Category Detection ─────────────────────────────────────────
const detectProductCards = (reply, products, userMessage, categories) => {
  if (!products?.length) return { cards: [], categoryButton: null };

  const userLower = userMessage.toLowerCase();
  const replyLower = reply.toLowerCase();
  const userNormalized = userLower.replace(/-/g, '');

  const matchedByModel = products.filter(p => {
    if (!p.model) return false;
    const modelLower = p.model.toLowerCase();
    const modelNormalized = modelLower.replace(/-/g, '');
    return userLower.includes(modelLower) || userNormalized.includes(modelNormalized);
  });

  let categoryButton = null;
  let matchedByCategory = [];

  if (!matchedByModel.length && categories?.length) {
    const sortedCats = [...categories].sort((a, b) => b.name.length - a.name.length);

    for (const cat of sortedCats) {
      const catNameLower = cat.name.toLowerCase();
      if (userLower.includes(catNameLower)) {
        const isPassiveSub = cat.parentType === 'passive' || (cat.parentName || '').toLowerCase() === 'passive';
        const finalSlug = isPassiveSub ? cat.slug : (
          cat.parentName
            ? cat.parentName.toLowerCase().trim().replace(/\s+/g, '').replace(/[^\w]+/g, '')
            : cat.slug
        );
        categoryButton = { label: `Browse ${cat.name}`, url: `${BASE_URL}/${finalSlug}` };
        const filtered = products.filter(p => {
          const pCat = (p.category || '').toLowerCase();
          const pSub = (p.subCategory || '').toLowerCase();
          return cat.parentName ? pSub === catNameLower : pCat === catNameLower;
        });
        matchedByCategory = filtered.slice(0, 4);
        break;
      }
    }

    if (!categoryButton) {
      const mainCats = sortedCats.filter(c => !c.parentName);
      for (const cat of mainCats) {
        const catNameLower = cat.name.toLowerCase();
        if (replyLower.includes(catNameLower) && userLower.includes(catNameLower)) {
          categoryButton = { label: `Browse ${cat.name}`, url: `${BASE_URL}/${cat.slug}` };
          matchedByCategory = products.filter(p => (p.category || '').toLowerCase() === catNameLower).slice(0, 4);
          break;
        }
      }
    }
  }

  const finalProducts = matchedByModel.length ? matchedByModel.slice(0, 4) : matchedByCategory;
  const cards = finalProducts.map(p => ({
    name: p.fullName || p.name,
    model: p.model,
    image: p.image || null,
    slug: p.slug,
    category: p.category,
    subCategory: p.subCategory,
    overview: p.overview?.content?.slice(0, 120) || p.description?.slice(0, 120) || '',
    features: (p.features || []).slice(0, 3),
    url: buildProductUrl(p),
    visitLabel: `View ${p.model || p.name}`
  }));

  if (matchedByModel.length) categoryButton = null;
  return { cards, categoryButton };
};

// ─── Minimal System Prompt ─────────────────────────────────────────────────
const buildSystemPrompt = (userName, userPhone, userCity) => `
You are AADONA Assistant — AI chatbot for AADONA Communication Pvt Ltd (Indian networking brand, founded 2018).

RULES:
- Reply in user's language (English/Hindi/Hinglish — detect from last message only)
- Max 2–3 lines. Max 50 words. Be direct.
- No emojis. No filler words ("sure!", "great!"). No "ji".
- Bold only model numbers or key specs.
- Never mention any URL or link in text. Navigation buttons appear automatically.
- Never fabricate info. If unsure: 1800-202-6599 or contact@aadona.com
- Only answer AADONA-related questions. Decline everything else politely.
- Never say "my database doesn't have" or "please contact sales" for product queries.
- Complete every sentence. Never stop mid-sentence.

PRODUCTS: Wireless APs, Surveillance (Cameras/NVR/DVR), Network Switches (Managed/PoE/Rack), Servers & Workstations, NAS, Industrial Switches, Passive (Cat6/6A/7, Fiber, Patch Panels)

COMPANY: ISO 9001/10002/14001/27001 certified. HQ: Hyderabad. GeM registered OEM.
CONTACT: Toll-Free 1800-202-6599 | contact@aadona.com | Mon–Fri 10:30AM–6:30PM IST

USER: Name: ${userName} | Phone: ${userPhone} | City: ${userCity || 'Not provided'}
`.trim();

// ─── POST /chat/register ───────────────────────────────────────────────────
router.post('/chat/register', async (req, res) => {
  try {
    const { name, phone, city } = req.body;
    if (!name || !phone)
      return res.status(400).json({ success: false, error: 'Name and phone required.' });

    const transporter = require('../mailer');
    await transporter.sendMail({
      from: `"AADONA Chatbot" <${process.env.EMAIL_USER}>`,
      to: process.env.COMPANY_EMAIL,
      subject: `New Chatbot User — ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:28px;border:1px solid #d1fae5;border-radius:12px">
          <h2 style="color:#065f46;margin-bottom:4px">New Chatbot Registration</h2>
          <p style="color:#6b7280;font-size:13px;margin-bottom:20px">A new user just started chatting on AADONA website.</p>
          <table cellpadding="10" cellspacing="0" width="100%" style="border-collapse:collapse;font-size:14px">
            <tr style="background:#f0fdf4"><td style="border:1px solid #d1fae5;font-weight:600;color:#374151;width:40%">Name</td><td style="border:1px solid #d1fae5;color:#111827">${name}</td></tr>
            <tr><td style="border:1px solid #d1fae5;font-weight:600;color:#374151">Mobile</td><td style="border:1px solid #d1fae5;color:#111827">+91 ${phone}</td></tr>
            <tr style="background:#f0fdf4"><td style="border:1px solid #d1fae5;font-weight:600;color:#374151">City</td><td style="border:1px solid #d1fae5;color:#111827">${city || '-'}</td></tr>
            <tr><td style="border:1px solid #d1fae5;font-weight:600;color:#374151">Time</td><td style="border:1px solid #d1fae5;color:#111827">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td></tr>
          </table>
          <p style="margin-top:20px;font-size:12px;color:#9ca3af">Sent automatically by AADONA Chatbot System</p>
        </div>
      `,
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('Chat register error:', err.message);
    return res.json({ success: true });
  }
});

// ─── POST /chat/summary ────────────────────────────────────────────────────
router.post('/chat/summary', async (req, res) => {
  try {
    const { name, phone, city, messages, isResume } = req.body;
    if (!name || !phone) return res.json({ success: true });

    const userMessages = (messages || []).filter(m => m.role === 'user');
    if (!userMessages.length) return res.json({ success: true });

    const transporter = require('../mailer');

    const makeChatRows = (msgs, nameLabel) => msgs
      .filter(m => m.content?.trim())
      .map(m => {
        const isBot = m.role === 'bot' || m.role === 'assistant';
        const bg = isBot ? '#f0fdf4' : '#ffffff';
        const label = isBot ? '🤖 AADONA Assistant' : `👤 ${nameLabel}`;
        const labelColor = isBot ? '#166534' : '#1e40af';
        return `
          <tr style="background:${bg}">
            <td style="padding:10px 14px;border:1px solid #e5e7eb;width:150px;vertical-align:top">
              <span style="font-size:12px;font-weight:700;color:${labelColor}">${label}</span>
              ${m.time ? `<br/><span style="font-size:10px;color:#9ca3af">${m.time}</span>` : ''}
            </td>
            <td style="padding:10px 14px;border:1px solid #e5e7eb;font-size:13px;color:#374151;line-height:1.6">
              ${m.content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br/>')}
            </td>
          </tr>`;
      }).join('');

    if (isResume) {
      const resumeChatRows = makeChatRows(messages || [], name);
      await transporter.sendMail({
        from: `"AADONA Chatbot" <${process.env.EMAIL_USER}>`,
        to: process.env.COMPANY_EMAIL,
        subject: `🔄 User Resumed Chat — ${name} (+91 ${phone})`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;padding:28px;border:1px solid #fef08a;border-radius:12px">
            <div style="background:#fefce8;padding:16px 20px;border-radius:8px;margin-bottom:20px;border-left:4px solid #f59e0b">
              <h2 style="color:#854d0e;margin:0 0 6px">🔄 User Resumed Chat</h2>
              <p style="color:#713f12;font-size:14px;margin:0"><b>${name}</b> (+91 ${phone}${city ? `, ${city}` : ''}) has <b>resumed the conversation</b> after being inactive.</p>
              <p style="color:#92400e;font-size:12px;margin:8px 0 0">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
            </div>
            ${resumeChatRows ? `<h3 style="color:#065f46;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Previous Chat Transcript</h3><table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse">${resumeChatRows}</table>` : ''}
            <p style="margin-top:20px;font-size:11px;color:#9ca3af">Sent automatically · AADONA Chatbot System</p>
          </div>
        `,
      }).catch(() => {});
      return res.json({ success: true });
    }

    if (!messages?.length) return res.json({ success: true });

    const chatRows = makeChatRows(messages, name);
    await transporter.sendMail({
      from: `"AADONA Chatbot" <${process.env.EMAIL_USER}>`,
      to: process.env.COMPANY_EMAIL,
      subject: `💬 Chat Summary — ${name} (+91 ${phone})${req.body.trigger === 'close' ? ' (Tab Closed)' : ' (10 min Inactivity)'}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;padding:28px;border:1px solid #d1fae5;border-radius:12px">
          <h2 style="color:#065f46;margin-bottom:4px">Chat Summary (${req.body.trigger === 'close' ? 'Tab Closed' : '10 min Inactivity'})</h2>
          <table cellpadding="10" cellspacing="0" width="100%" style="border-collapse:collapse;font-size:13px;margin-bottom:24px">
            <tr style="background:#f0fdf4"><td style="border:1px solid #d1fae5;font-weight:600;width:40%">Name</td><td style="border:1px solid #d1fae5">${name}</td></tr>
            <tr><td style="border:1px solid #d1fae5;font-weight:600">Mobile</td><td style="border:1px solid #d1fae5">+91 ${phone}</td></tr>
            <tr style="background:#f0fdf4"><td style="border:1px solid #d1fae5;font-weight:600">City</td><td style="border:1px solid #d1fae5">${city || '-'}</td></tr>
            <tr><td style="border:1px solid #d1fae5;font-weight:600">Total Messages</td><td style="border:1px solid #d1fae5">${messages.length}</td></tr>
            <tr style="background:#f0fdf4"><td style="border:1px solid #d1fae5;font-weight:600">Time</td><td style="border:1px solid #d1fae5">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td></tr>
          </table>
          <h3 style="color:#065f46;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Chat Transcript</h3>
          <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse">${chatRows}</table>
          <p style="margin-top:20px;font-size:11px;color:#9ca3af">Sent automatically · AADONA Chatbot System</p>
        </div>
      `,
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('Chat summary error:', err.message);
    return res.json({ success: true });
  }
});

// ─── POST /chat (Streaming) ────────────────────────────────────────────────
router.post('/chat', chatLimiter, async (req, res) => {
  try {
    const { messages, userName, userPhone, userCity } = req.body;

    if (!Array.isArray(messages) || messages.length === 0)
      return res.status(400).json({ success: false, error: 'Messages array is required.' });

    const sanitized = messages
      .filter(m => m && typeof m.content === 'string' && ['user', 'assistant'].includes(m.role))
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));

    if (!sanitized.length)
      return res.status(400).json({ success: false, error: 'No valid messages provided.' });

    const lastUserMessage = [...sanitized].reverse().find(m => m.role === 'user')?.content || '';
    if (!lastUserMessage) return res.status(400).json({ success: false, error: 'No user message found.' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: 'AI service not configured.' });

    // ── Load DB data (products + categories) ──────────────────────────────
    const [products, categories] = await Promise.all([
      getProducts(),
      getCategoryMap()
    ]);

    // ── 1. CACHE CHECK ────────────────────────────────────────────────────
    const cacheKey = lastUserMessage.trim().toLowerCase();
    const cached = getCached(cacheKey);
    if (cached) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      res.write(`data: ${JSON.stringify({ token: cached.reply })}\n\n`);
      res.write(`data: ${JSON.stringify({
        done: true,
        productCards: cached.productCards || null,
        actionButtons: cached.actionButtons || null,
      })}\n\n`);
      return res.end();
    }

    // ── 2. STATIC INTENT → bypass LLM ────────────────────────────────────
    const staticButtons = detectStaticPageIntent(lastUserMessage, '');
    if (staticButtons.length) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const reply = "Here's what you're looking for.";
      res.write(`data: ${JSON.stringify({ token: reply })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, actionButtons: staticButtons })}\n\n`);

      setCache(cacheKey, { reply, productCards: null, actionButtons: staticButtons });
      return res.end();
    }

    // ── 3. PRODUCT INTENT → bypass LLM ───────────────────────────────────
    const isProductQuery = /price|model|buy|spec|feature|switch|camera|wifi|nas|wireless|surveillance|server|workstation|passive|patch|fiber|cat6|cat7|poe|rack|nvr|dvr/i.test(lastUserMessage);
    if (isProductQuery) {
      const { cards, categoryButton } = detectProductCards('', products, lastUserMessage, categories);
      if (cards.length) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const reply = cards[0].overview || "Here are some products that match your query.";
        const allButtons = categoryButton ? [categoryButton] : [];

        res.write(`data: ${JSON.stringify({ token: reply })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true, productCards: cards, actionButtons: allButtons.length ? allButtons : null })}\n\n`);

        setCache(cacheKey, { reply, productCards: cards, actionButtons: allButtons.length ? allButtons : null });
        return res.end();
      }
    }

    // ── 4. GEMINI CALL (last resort) ──────────────────────────────────────
    const systemContent = buildSystemPrompt(userName || 'Guest', userPhone || '', userCity || '');

    // Send only last user message to LLM — no history, no product DB
    const geminiMessages = [
      {
        role: 'user',
        parts: [{ text: lastUserMessage }]
      }
    ];

    const isDetailQuery = /detail|explain|why|kaise|how|specification/i.test(lastUserMessage);
    const isListQuery = /list|all|show all|complete|sab|saare/i.test(lastUserMessage);
    const maxTokens = isListQuery ? 300 : isDetailQuery ? 200 : 120;

    const genAI = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
          systemInstruction: { parts: [{ text: systemContent }] }
        }),
      }
    );

    if (!genAI.ok) {
      const errData = await genAI.json().catch(() => ({}));
      console.error('Gemini API error:', genAI.status, errData);
      return res.status(502).json({ success: false, error: 'AI service temporarily unavailable. Please try again.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let fullReply = '';
    const reader = genAI.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        try {
          const json = JSON.parse(line.replace('data: ', ''));
          let token = '';

          if (json?.candidates?.[0]?.content?.parts) {
            token = json.candidates[0].content.parts.map(p => p.text || '').join('');
          }
          if (!token && json?.candidates?.[0]?.output_text) {
            token = json.candidates[0].output_text;
          }

          if (token) {
            fullReply += token;
            buffer += token;
            if (buffer.length > 25 || buffer.endsWith(' ')) {
              res.write(`data: ${JSON.stringify({ token: buffer })}\n\n`);
              buffer = '';
            }
          }
        } catch { }
      }
    }

    if (buffer) {
      res.write(`data: ${JSON.stringify({ token: buffer })}\n\n`);
    }

    // Clean URLs from reply
    fullReply = fullReply.replace(/https?:\/\/[^\s]+/g, '');

    // Trim to clean sentence boundary
    if (!isListQuery && fullReply.length > 300) {
      const trimmed = fullReply.slice(0, 300);
      const lastDot = Math.max(trimmed.lastIndexOf('.'), trimmed.lastIndexOf('!'), trimmed.lastIndexOf('?'));
      fullReply = lastDot > 100 ? trimmed.slice(0, lastDot + 1) : fullReply.slice(0, 350);
    }

    // Post-LLM: detect product cards and static buttons from reply
    const { cards: productCards, categoryButton } = detectProductCards(fullReply, products, lastUserMessage, categories);
    let actionButtons = [];
    if (!productCards.length) {
      actionButtons = detectStaticPageIntent(lastUserMessage, fullReply);
    }

    const allButtons = [
      ...(categoryButton ? [categoryButton] : []),
      ...actionButtons
    ].slice(0, 2);

    const finalPayload = {
      done: true,
      productCards: productCards.length ? productCards : null,
      actionButtons: allButtons.length ? allButtons : null,
    };

    // Cache this LLM result
    setCache(cacheKey, {
      reply: fullReply,
      productCards: finalPayload.productCards,
      actionButtons: finalPayload.actionButtons
    });

    res.write(`data: ${JSON.stringify(finalPayload)}\n\n`);
    res.end();

  } catch (err) {
    console.error('Chatbot route error:', err.message);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: 'Internal server error. Please try again.' });
    }
    res.write(`data: ${JSON.stringify({ done: true, error: 'Something went wrong.' })}\n\n`);
    res.end();
  }
});

module.exports = router;