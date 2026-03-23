const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const mongoose = require('mongoose');

const BASE_URL = 'https://aadona.online';

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
      'name fullName model category subCategory description image slug'
    ).limit(80);
    if (!products.length) return { context: '', products: [] };
    const list = products.map(p =>
      `- ${p.fullName || p.name} (Model: ${p.model || 'N/A'}) | Category: ${p.category} | Slug: ${p.slug} | Desc: ${p.description?.slice(0, 80) || ''}`
    ).join('\n');
    return { context: `\n\nLIVE PRODUCT DATABASE:\n${list}`, products };
  } catch { return { context: '', products: [] }; }
};

// ─── Smart Intent Detection ────────────────────────────────────────────────
// Returns array of action buttons relevant to the user's message + AI reply
const detectActionButtons = (userMessage, aiReply, products) => {
  const msg = (userMessage + ' ' + aiReply).toLowerCase();
  const buttons = [];

  // Support intents
  if (/warranty|वारंटी/.test(msg))
    buttons.push({ label: '🛡️ Check Warranty', url: `${BASE_URL}/warranty` });
  if (/tech squad|on.?site|technician|visit|तकनीशियन/.test(msg))
    buttons.push({ label: '🔧 Tech Squad', url: `${BASE_URL}/tech-squad` });
  if (/doa|dead on arrival|replacement|replace/.test(msg))
    buttons.push({ label: '🔄 Request DOA', url: `${BASE_URL}/request-doa` });
  if (/register product|product registration|रजिस्टर/.test(msg))
    buttons.push({ label: '📋 Register Product', url: `${BASE_URL}/product-registration` });
  if (/support tool|diagnostic/.test(msg))
    buttons.push({ label: '🛠️ Support Tools', url: `${BASE_URL}/support-tools` });
  if (/product support|technical help|tech help|help with product/.test(msg))
    buttons.push({ label: '💬 Product Support', url: `${BASE_URL}/product-support` });

  // Partner intents
  if (/partner|reseller|distributor|system integrator|पार्टनर/.test(msg))
    buttons.push({ label: '🤝 Become a Partner', url: `${BASE_URL}/become-a-partner` });
  if (/project lock|tender|project register/.test(msg))
    buttons.push({ label: '🔒 Project Locking', url: `${BASE_URL}/project-locking` });
  if (/demo|demonstration|डेमो/.test(msg))
    buttons.push({ label: '🎯 Request a Demo', url: `${BASE_URL}/request-a-demo-1` });
  if (/training|train|ट्रेनिंग/.test(msg))
    buttons.push({ label: '📚 Request Training', url: `${BASE_URL}/request-training` });

  // Company intents
  if (/career|job|hiring|vacancy|नौकरी/.test(msg))
    buttons.push({ label: '💼 Careers', url: `${BASE_URL}/careers` });
  if (/csr|social responsibility/.test(msg))
    buttons.push({ label: '🌱 CSR', url: `${BASE_URL}/csr` });
  if (/blog|article|news|insight/.test(msg))
    buttons.push({ label: '📰 Blog', url: `${BASE_URL}/blog` });
  if (/customer|client|who uses|हमारे ग्राहक/.test(msg))
    buttons.push({ label: '🏢 Our Customers', url: `${BASE_URL}/our-customers` });
  if (/media|press|announcement/.test(msg))
    buttons.push({ label: '📢 Media Center', url: `${BASE_URL}/media-center` });
  if (/contact|reach|call|email|संपर्क/.test(msg))
    buttons.push({ label: '📞 Contact Us', url: `${BASE_URL}/contact` });

  // Product category intents — browse category pages
  if (/wireless|wifi|wi-fi|access point|वायरलेस/.test(msg))
    buttons.push({ label: '📡 Browse Wireless', url: `${BASE_URL}/wireless` });
  if (/surveillance|camera|cctv|nvr|dvr|सर्विलांस/.test(msg))
    buttons.push({ label: '📷 Browse Surveillance', url: `${BASE_URL}/surveillance` });
  if (/switch|स्विच/.test(msg))
    buttons.push({ label: '🔀 Browse Switches', url: `${BASE_URL}/switches` });
  if (/server|workstation|सर्वर/.test(msg))
    buttons.push({ label: '🖥️ Browse Servers', url: `${BASE_URL}/servers` });
  if (/nas|storage|स्टोरेज/.test(msg))
    buttons.push({ label: '💾 Browse NAS', url: `${BASE_URL}/nas` });
  if (/industrial|rugged|harsh/.test(msg))
    buttons.push({ label: '⚙️ Industrial Switches', url: `${BASE_URL}/industrial-switches` });
  if (/passive|cable|fiber|cabling/.test(msg))
    buttons.push({ label: '🔌 Passive Networking', url: `${BASE_URL}/passive-networking` });

  // Deduplicate by URL
  const seen = new Set();
  return buttons.filter(b => {
    if (seen.has(b.url)) return false;
    seen.add(b.url);
    return true;
  }).slice(0, 4); // max 4 buttons per message
};

// ─── Multiple product cards detection ─────────────────────────────────────
const detectProductCards = (reply, products) => {
  if (!products?.length) return [];
  const replyLower = reply.toLowerCase();

  const matched = products.filter(p => {
    const modelMatch = p.model && p.model.length > 2 && replyLower.includes(p.model.toLowerCase());
    const nameMatch = p.fullName && p.fullName.length > 3 && replyLower.includes(p.fullName.toLowerCase());
    return modelMatch || nameMatch;
  });

  // Return max 4 product cards
  return matched.slice(0, 4).map(p => ({
    name: p.fullName || p.name,
    model: p.model,
    image: p.image,
    slug: p.slug,
    category: p.category,
    url: `${BASE_URL}/${(p.category || 'products').toLowerCase().replace(/\s+/g, '-')}/${p.slug}`,
  }));
};

// ─── System Prompt ─────────────────────────────────────────────────────────
const buildSystemPrompt = (userName, userPhone) => `
You are AADONA's friendly and knowledgeable AI assistant. Your name is "AADONA Assistant".

CRITICAL INSTRUCTIONS:
- LANGUAGE: Detect language from user's LAST message only.
  * Single English words (Products, Support, About, Wireless, etc.) → reply in English.
  * Full Hindi sentence → reply in Hindi.
  * Hinglish → reply in Hinglish.
  * NEVER mix Hindi and English randomly in the same sentence.
- Be concise and professional. Use **bold** for key info only.
- NEVER make up information. If unsure, give contact: 1800-202-6599 or contact@aadona.com
- You ONLY answer AADONA-related questions. Politely decline unrelated topics.
- For product queries, ALWAYS use the LIVE PRODUCT DATABASE. Mention exact model numbers.
- If user asks to "show all [category] products", list ALL matching products from the database with their model numbers.
- Address user by first name occasionally.
- Keep responses SHORT. No filler sentences.

USER INFO:
- Name: ${userName}
- Phone: ${userPhone}

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
- Toll-Free: 1800-202-6599 | Email: contact@aadona.com
- Hours: Mon–Fri, 10:30 AM – 6:30 PM IST
- Social: facebook.com/aadonacomm | @aadonacommunication | linkedin.com/company/aadona

PRODUCTS (use LIVE DATABASE for exact models):
1. Wireless — Enterprise WiFi APs, indoor/outdoor
2. Surveillance — IP Cameras, NVRs, DVRs, CCTV
3. Network Switches — Managed/Unmanaged/PoE/Rack
4. Servers & Workstations — Tower, rack, custom builds
5. NAS — Scalable storage, RAID, backup solutions
6. Industrial & Rugged Switches — DIN-rail, harsh environments
7. Passive — Cat6/6A/7, fiber, patch panels, cable management

SUPPORT PAGES:
- Warranty: aadona.online/warranty
- Tech Squad (on-site): aadona.online/tech-squad
- Request DOA: aadona.online/request-doa
- Support Tools: aadona.online/support-tools
- Product Support: aadona.online/product-support
- Product Registration: aadona.online/product-registration

PARTNER PAGES:
- Become a Partner: aadona.online/become-a-partner
- Project Locking: aadona.online/project-locking
- Request a Demo: aadona.online/request-a-demo-1
- Request Training: aadona.online/request-training

OTHER PAGES:
- Careers: aadona.online/careers
- CSR: aadona.online/csr
- Blog: aadona.online/blog
- Our Customers: aadona.online/our-customers
- Media Center: aadona.online/media-center
`.trim();

// ─── POST /chat/register ───────────────────────────────────────────────────
router.post('/chat/register', async (req, res) => {
  try {
    const { name, phone } = req.body;
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
    return res.json({ success: true }); // don't block user if mail fails
  }
});

// ─── POST /chat ────────────────────────────────────────────────────────────
router.post('/chat', chatLimiter, async (req, res) => {
  try {
    const { messages, userName, userPhone } = req.body;

    if (!Array.isArray(messages) || messages.length === 0)
      return res.status(400).json({ success: false, error: 'Messages array is required.' });

    const sanitized = messages
      .filter(m => m && typeof m.content === 'string' && ['user', 'assistant'].includes(m.role))
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));

    if (sanitized.length === 0)
      return res.status(400).json({ success: false, error: 'No valid messages provided.' });

    const recentMessages = sanitized.slice(-10);
    const lastUserMessage = [...sanitized].reverse().find(m => m.role === 'user')?.content || '';

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not set');
      return res.status(500).json({ success: false, error: 'AI service not configured.' });
    }

    const { context: productsContext, products } = await getProductsContext();

    const genAI = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: buildSystemPrompt(userName || 'Guest', userPhone || '') + productsContext }],
          },
          contents: recentMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          generationConfig: { maxOutputTokens: 700, temperature: 0.7 },
        }),
      }
    );

    if (!genAI.ok) {
      const errData = await genAI.json().catch(() => ({}));
      console.error('Gemini API error:', genAI.status, errData);
      return res.status(502).json({ success: false, error: 'AI service temporarily unavailable. Please try again.' });
    }

    const data = await genAI.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply)
      return res.status(502).json({ success: false, error: 'Empty response from AI service.' });

    // Detect product cards (multiple)
    const productCards = detectProductCards(reply, products);

    // Detect action buttons
    const actionButtons = detectActionButtons(lastUserMessage, reply, products);

    return res.json({
      success: true,
      reply,
      productCards: productCards.length ? productCards : null,  // array of cards
      actionButtons: actionButtons.length ? actionButtons : null, // array of buttons
      // keep single productCard for backward compat
      productCard: productCards[0] || null,
    });

  } catch (err) {
    console.error('Chatbot route error:', err.message);
    return res.status(500).json({ success: false, error: 'Internal server error. Please try again.' });
  }
});

module.exports = router;