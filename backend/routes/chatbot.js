const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const mongoose = require('mongoose');

const BASE_URL = 'https://aadona.com';

// ─── Rate limiter ──────────────────────────────────────────────────────────
const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: parseInt(process.env.CHATBOT_RATE_LIMIT_MAX || '20', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many messages. Please wait a moment before sending more.' },
});

// ─── Products from DB ──────────────────────────────────────────────────────
const getProductsContext = async () => {
  try {
    const Product = mongoose.model('Product');
    const products = await Product.find(
      {},
      'name fullName model category subCategory description overview features image slug'
    ).limit(80);
    if (!products.length) return { context: '', products: [] };

    const list = products.map(p => {
      const features = (p.features || []).slice(0, 3).join(' | ');
      const overview = p.overview?.content?.slice(0, 120) || p.description?.slice(0, 120) || '';
      return `- ${p.fullName || p.name} (Model: ${p.model || 'N/A'}) | Category: ${p.category} | Slug: ${p.slug} | Overview: ${overview} | Features: ${features}`;
    }).join('\n');

    return { context: `\n\nLIVE PRODUCT DATABASE:\n${list}`, products };
  } catch { return { context: '', products: [] }; }
};

const getCategoryMap = async () => {
  try {
    const Category = mongoose.model('Category');
    const categories = await Category.find({}, 'name');

    const map = categories.map(c => ({
      name: c.name,
      slug: c.name.toLowerCase().replace(/\s+/g, '-')
    }));

    return map;
  } catch {
    return [];
  }
};

// ─── Smart Intent Detection ────────────────────────────────────────────────
const detectActionButtons = (userMessage, aiReply, products, categories) => {
  const msg = (userMessage + ' ' + aiReply).toLowerCase();
  const buttons = [];

  // Confusion Detection
  const isConfused = /not understand|confuse|samajh nahi|kya karu|help|issue|problem|kaise|how|unable|nahi ho raha|error|fail/.test(msg);

  if (!isConfused) {
    for (const cat of categories) {
      const name = cat.name.toLowerCase();

      if (msg.includes(name)) {
        buttons.push({
          label: `Go to ${cat.name}`,
          url: `${BASE_URL}/${cat.slug}`
        });
        break;
      }
    }
  }

  // ONLY show buttons if confused
  if (isConfused && /warranty|वारंटी/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/warranty` });

  if (isConfused && /tech squad|on.?site|technician|visit|तकनीशियन/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/techSquad` });

  if (isConfused && /doa|dead on arrival|replacement|replace/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/requestDoa` });

  if (isConfused && /register product|product registration|रजिस्टर/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/warrantyRegistration` });

  if (isConfused && /support tool|diagnostic/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/supportTools` });

  if (isConfused && /product support|technical help|tech help|help with product/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/productSupport` });

  if (isConfused && /partner|reseller|distributor|system integrator|पार्टनर/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/becomePartner` });

  if (isConfused && /project lock|tender|project register/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/projectLocking` });

  if (isConfused && /demo|demonstration|डेमो/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/requestDemo` });

  if (isConfused && /training|train|ट्रेनिंग/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/requestTraining` });

  if (isConfused && /career|job|hiring|vacancy|नौकरी/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/careers` });

  if (isConfused && /csr|social responsibility/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/csr` });

  if (isConfused && /blog|article|news|insight/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/blog` });

  if (isConfused && /customer|client|who uses|हमारे ग्राहक/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/customers` });

  if (isConfused && /media|press|announcement/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/mediaCenter` });

  if (isConfused && /contact|reach|call|email|संपर्क/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/contactUs` });

  if (isConfused && /about|company|aadona kya|who are/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/about` });

  if (isConfused && /mission|vision|goal/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/missionVision` });

  if (isConfused && /leader|team|founder|management/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/leadershipTeam` });

  if (isConfused && /whistle|complaint|report|misconduct/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/whistleBlower` });

  if (isConfused && /wireless|wifi|wi-fi|access point|वायरलेस/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/wireless` });

  if (isConfused && /surveillance|camera|cctv|nvr|dvr|सर्विलांस/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/surveillance` });

  if (isConfused && /switch|स्विच/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/switches` });

  if (isConfused && /server|workstation|सर्वर/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/servers` });

  if (isConfused && /nas|storage|स्टोरेज/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/nas` });

  if (isConfused && /industrial|rugged|harsh/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/industrial-switches` });

  if (isConfused && /passive|cable|fiber|cabling/.test(msg))
    buttons.push({ label: 'Go to this page', url: `${BASE_URL}/passive-networking` });

  const seen = new Set();
  return buttons.filter(b => {
    if (seen.has(b.url)) return false;
    seen.add(b.url);
    return true;
  }).slice(0, 3);
};

// ─── Product Cards Detection ───────────────────────────────────────────────
const detectProductCards = (reply, products) => {
  if (!products?.length) return [];
  const replyLower = reply.toLowerCase();

  const matched = products.filter(p => {
    const combined = `${p.fullName} ${p.name} ${p.model} ${p.category}`.toLowerCase();

    return combined.split(' ').some(word =>
      word.length > 3 && replyLower.includes(word)
    );
  });

  return matched.slice(0, 4).map(p => ({
    name: p.fullName || p.name,
    model: p.model,
    image: p.image,
    slug: p.slug,
    category: p.category,
    overview: p.overview?.content?.slice(0, 120) || p.description?.slice(0, 120) || '',
    features: (p.features || []).slice(0, 3),
    url: `${BASE_URL}/${(p.category || 'products').toLowerCase().replace(/\s+/g, '-')}/${p.slug}`,
  }));
};

// ─── System Prompt ─────────────────────────────────────────────────────────
const buildSystemPrompt = (userName, userPhone, userCity) => `
You are AADONA's AI assistant. Your name is "AADONA Assistant".

CRITICAL INSTRUCTIONS:
- LANGUAGE: Detect language from user's LAST message only.
  * English message → reply in English.
  * Hindi message → reply in Hindi.
  * Hinglish → reply in Hinglish.
  * NEVER mix languages randomly in the same sentence.
- TONE: Professional, concise, modern. No emojis. No filler words. No "ji". No "sure!", no "great!", no "absolutely!". Get straight to the point.
- RESPONSE STYLE: Be direct. Answer in 3-4 lines max unless user asks for details. Use **bold** only for model numbers or key specs.
- NEVER fabricate information. If unsure, provide: 1800-202-6599 or contact@aadona.com
- ONLY answer AADONA-related questions. Politely decline everything else and redirect to the contact number.
- For product queries, ALWAYS reference the LIVE PRODUCT DATABASE. Use exact model numbers.
- When user asks about a specific product → give a brief 2-line overview + top 2 specs. Let them ask for more.
- When user asks to see all products in a category → list ALL matching models from the database.
- Address the user by first name only occasionally — not in every message.
- Mention page links naturally only when directly relevant. Never dump all URLs at once.
- Guide users step by step. Ask one follow-up question at a time if clarification is needed.
- GREETING: Keep it brief and professional. No enthusiasm overload.
- When describing a product:
  * Do NOT copy raw database text.
  * Rephrase naturally like a human sales expert.
  * Highlight use-case + benefit (not just specs).
  * Keep it short but impactful.
- If a product exists in database:
  * ALWAYS mention its model number clearly in **bold**
  * Give 1 short benefit line + 2 key specs
- NEVER show raw URLs in chat responses.
- Always try to solve the user's query directly in chat first.
- ONLY if the user seems confused, unsure, or asks for help repeatedly:
  * Then suggest a button (NOT a link)
  * Say something like: "You can also use the option below if needed."
- Do NOT say "visit this page" or paste URLs.
- Let frontend buttons handle navigation.
- If a button is available:
  * Do NOT mention link in text
  * Just guide user and let button appear below

USER INFO:
- Name: ${userName}
- Phone: ${userPhone}
- City: ${userCity || 'Not provided'}

═══════════════════════════════════════
AADONA KNOWLEDGE BASE
═══════════════════════════════════════

COMPANY:
- Full Name: AADONA Communication Pvt Ltd
- Founded: 2018 | Start-up India initiative
- Vision: "Indian MNC in the making" — India's premier networking brand
- Mission: Smart, cost-efficient IT infrastructure for SMB & Enterprise
- Trademark: AADONA® (Registered)
- Certifications: ISO 9001, ISO 10002, ISO 14001, ISO 27001, DIPP, MSME, GeM Seller

CONTACT:
- HQ: 1st Floor, Phoenix Tech Tower, Plot 14/46, IDA–Uppal, Hyderabad, Telangana 500039
- Production & Billing: 7, SBI Colony, Mohaba Bazar, Hirapur Road, Raipur, CG — 492099
- Toll-Free: 1800-202-6599 | Email: contact@aadona.com
- Hours: Mon–Fri, 10:30 AM – 6:30 PM IST

PRODUCTS (use LIVE DATABASE for exact models):
1. Wireless — Enterprise WiFi APs, indoor/outdoor
2. Surveillance — IP Cameras, NVRs, DVRs, CCTV
3. Network Switches — Managed/Unmanaged/PoE/Rack
4. Servers & Workstations — Tower, rack, custom builds
5. NAS — Scalable storage, RAID, backup solutions
6. Industrial & Rugged Switches — DIN-rail, harsh environments
7. Passive — Cat6/6A/7, fiber, patch panels, cable management

STATIC PAGES (mention naturally only when relevant):
- About Us: aadona.com/about
- Mission & Vision: aadona.com/missionVision
- Leadership Team: aadona.com/leadershipTeam
- CSR: aadona.com/csr
- Careers: aadona.com/careers
- Blog: aadona.com/blog
- Media Center: aadona.com/mediaCenter
- Our Customers: aadona.com/customers
- Contact Us: aadona.com/contactUs
- Whistleblower: aadona.com/whistleBlower

SUPPORT PAGES:
- Warranty Check: aadona.com/warranty
- Tech Squad (on-site): aadona.com/techSquad
- Request DOA: aadona.com/requestDoa
- Support Tools: aadona.com/supportTools
- Product Support: aadona.com/productSupport
- Product Registration: aadona.com/warrantyRegistration

PARTNER PAGES:
- Become a Partner: aadona.com/becomePartner
- Project Locking: aadona.com/projectLocking
- Request a Demo: aadona.com/requestDemo
- Request Training: aadona.com/requestTraining
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
            <tr style="background:#f0fdf4">
              <td style="border:1px solid #d1fae5;font-weight:600;color:#374151;width:40%">Name</td>
              <td style="border:1px solid #d1fae5;color:#111827">${name}</td>
            </tr>
            <tr>
              <td style="border:1px solid #d1fae5;font-weight:600;color:#374151">Mobile</td>
              <td style="border:1px solid #d1fae5;color:#111827">+91 ${phone}</td>
            </tr>
            <tr style="background:#f0fdf4">
              <td style="border:1px solid #d1fae5;font-weight:600;color:#374151">City</td>
              <td style="border:1px solid #d1fae5;color:#111827">${city || '-'}</td>
            </tr>
            <tr>
              <td style="border:1px solid #d1fae5;font-weight:600;color:#374151">Time</td>
              <td style="border:1px solid #d1fae5;color:#111827">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
            </tr>
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

// ─── POST /chat (Streaming) ────────────────────────────────────────────────
router.post('/chat', chatLimiter, async (req, res) => {
  try {
    const { messages, userName, userPhone, userCity } = req.body;

    if (!Array.isArray(messages) || messages.length === 0)
      return res.status(400).json({ success: false, error: 'Messages array is required.' });

    const sanitized = messages
      .filter(m => m && typeof m.content === 'string' && ['user', 'assistant'].includes(m.role))
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));

    if (sanitized.length === 0)
      return res.status(400).json({ success: false, error: 'No valid messages provided.' });

    const recentMessages = sanitized.slice(-10);
    const lastUserMessage = [...sanitized].reverse().find(m => m.role === 'user')?.content || '';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not set');
      return res.status(500).json({ success: false, error: 'AI service not configured.' });
    }

    const { context: productsContext, products } = await getProductsContext().catch(() => ({ context: '', products: [] }));
    const systemContent = buildSystemPrompt(userName || 'Guest', userPhone || '', userCity || '') + (productsContext || '');

    const geminiMessages = recentMessages.map((m, i) => {
      if (i === 0 && m.role === 'user') {
        return { role: 'user', parts: [{ text: systemContent + '\n\nUser: ' + m.content }] };
      }
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      };
    });

    // ── Streaming Gemini call ──
    const genAI = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: { maxOutputTokens: 1000, temperature: 0.65 },
          systemInstruction: { parts: [{ text: systemContent }] }
        }),
      }
    );

    if (!genAI.ok) {
      const errData = await genAI.json().catch(() => ({}));
      console.error('Gemini API error:', genAI.status, errData);
      return res.status(502).json({ success: false, error: 'AI service temporarily unavailable. Please try again.' });
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let fullReply = '';
    const reader = genAI.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        try {
          const json = JSON.parse(line.replace('data: ', ''));
          const token = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (token) {
            fullReply += token;
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }
        } catch { }
      }
    }

    // REMOVE ANY URL FROM AI RESPONSE
     fullReply = fullReply.replace(/https?:\/\/[^\s]+/g, '');

    const productCards = detectProductCards(fullReply, products);
    const categories = await getCategoryMap();
    const actionButtons = detectActionButtons(lastUserMessage, fullReply, products, categories);

    res.write(`data: ${JSON.stringify({
      done: true,
      productCards: productCards.length ? productCards : null,
      actionButtons: actionButtons.length ? actionButtons : null,
    })}\n\n`);
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