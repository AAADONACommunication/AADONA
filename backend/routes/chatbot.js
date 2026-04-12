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
    )
    .sort({ category: 1 })
    .limit(500);

    if (!products.length) return { context: '', products: [] };

    const list = products.map(p => {
      const features = (p.features || []).slice(0, 3).join(' | ');
      const overview = p.overview?.content?.slice(0, 120) || p.description?.slice(0, 120) || '';
      return `- ${p.fullName || p.name} (Model: ${p.model || 'N/A'}) | Category: ${p.category} | SubCategory: ${p.subCategory || 'N/A'} | Slug: ${p.slug} | Overview: ${overview} | Features: ${features}`;
    }).join('\n');

    return { context: `\n\nLIVE PRODUCT DATABASE:\n${list}`, products };
  } catch { return { context: '', products: [] }; }
};

const getCategoryMap = async () => {
  try {
    const Category = mongoose.model('Category');
    const categories = await Category.find({}, 'name subCategories type');

    const result = [];

    categories.forEach(c => {
      result.push({
        name: c.name,
        type: c.type,
        slug: c.name.toLowerCase().trim()
          .replace(/\s+/g, '').replace(/[^\w]+/g, '')
      });

      (c.subCategories || []).forEach(sub => {
        result.push({
          name: sub.name,
          parentName: c.name,
          parentType: c.type,
          slug: sub.name.toLowerCase().trim()
            .replace(/\s+/g, '').replace(/[^\w]+/g, '')
        });
      });
    });

    return result;
  } catch {
    return [];
  }
};

// ─── Static Page Intent Detection ─────────────────────────────────────────
// Returns: { type: 'static', buttons: [...] } | null
const detectStaticPageIntent = (userMessage, aiReply) => {
  const msg = (userMessage + ' ' + aiReply).toLowerCase();

  // Map of regex → page info
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

// ─── Smart URL builder ─────────────────────────────────────────────────────
const buildProductUrl = (p) => {
  const cat = (p.category || '').toLowerCase().trim()
    .replace(/\s+/g, '').replace(/[^\w]+/g, '');
  const sub = (p.subCategory || '').toLowerCase().trim()
    .replace(/\s+/g, '').replace(/[^\w]+/g, '');

  // Passive category — subCategory se route
  if (cat === 'passive') {
    return `${BASE_URL}/${sub}/${p.slug}`;
  }
  return `${BASE_URL}/${cat}/${p.slug}`;
};

// ─── Category Page URL builder ─────────────────────────────────────────────
const buildCategoryUrl = (cat) => {
  // Passive type subCategories ka slug directly use hoga
  if (cat.parentType === 'passive' || (cat.parentName && cat.parentName.toLowerCase() === 'passive')) {
    return `${BASE_URL}/${cat.slug}`;
  }
  // Main categories
  return `${BASE_URL}/${cat.slug}`;
};

// ─── Product + Category Detection ─────────────────────────────────────────
const detectProductCards = (reply, products, userMessage, categories) => {
  if (!products?.length) return { cards: [], categoryButton: null };

  // IMPORTANT: Only use userMessage for category matching — NOT reply
  // AI reply mein dusri categories ke words aa jaate hain jo wrong match cause karte hain
  const userLower = userMessage.toLowerCase();
  const replyLower = reply.toLowerCase();

  // ── 1. Specific product match by model number (reply + user dono mein dekho) ──
  const combined = userLower + ' ' + replyLower;
  const matchedByModel = products.filter(p => {
    if (!p.model) return false;
    return combined.includes(p.model.toLowerCase());
  });

  // ── 2. Category match — ONLY from userMessage, not reply ──────
  let categoryButton = null;
  let matchedByCategory = [];
  let matchedCatName = null; // track which category matched

  if (!matchedByModel.length && categories?.length) {
    // Sort: longer names first to avoid partial matches (e.g. "network accessories" before "network")
    const sortedCats = [...categories].sort((a, b) => b.name.length - a.name.length);

    for (const cat of sortedCats) {
      const catNameLower = cat.name.toLowerCase();

      if (userLower.includes(catNameLower)) {
        matchedCatName = catNameLower;

        // Category page button — always parent category slug
        const pageLabel = cat.parentName ? cat.parentName : cat.name;
        const pageSlug = cat.parentName
          ? cat.parentName.toLowerCase().trim().replace(/\s+/g, '').replace(/[^\w]+/g, '')
          : cat.slug;
        categoryButton = {
          label: `Browse ${pageLabel}`,
          url: `${BASE_URL}/${pageSlug}`
        };

        // Products: exact category or subCategory match only
        const filtered = products.filter(p => {
          const pCat = (p.category || '').toLowerCase();
          const pSub = (p.subCategory || '').toLowerCase();
          if (cat.parentName) {
            // This is a subCategory — match subCategory field exactly
            return pSub === catNameLower;
          }
          // Main category — match category field exactly
          return pCat === catNameLower;
        });
        matchedByCategory = filtered.slice(0, 4);
        break;
      }
    }

    // If no user match, try reply but only for clear category mentions
    // (only main category names, not subcategories — avoids false positives)
    if (!categoryButton) {
      const mainCats = sortedCats.filter(c => !c.parentName);
      for (const cat of mainCats) {
        const catNameLower = cat.name.toLowerCase();
        if (replyLower.includes(catNameLower)) {
          matchedCatName = catNameLower;
          categoryButton = {
            label: `Browse ${cat.name}`,
            url: `${BASE_URL}/${cat.slug}`
          };
          const filtered = products.filter(p =>
            (p.category || '').toLowerCase() === catNameLower
          );
          matchedByCategory = filtered.slice(0, 4);
          break;
        }
      }
    }
  }

  // ── 3. Decide which products to show ──────────────────────────
  const finalProducts = matchedByModel.length
    ? matchedByModel.slice(0, 4)
    : matchedByCategory;

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

  // If we have specific model cards, no need for category button
  if (matchedByModel.length) {
    categoryButton = null;
  }

  return { cards, categoryButton };
};

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
- ONLY answer AADONA-related questions. Politely decline everything else.
- For product queries, ALWAYS reference the LIVE PRODUCT DATABASE. Use exact model numbers.
- When user asks about a specific product → give a brief 2-line overview + top 2 specs.
- When user asks about a category (e.g. "wireless products", "indoor switches") → briefly describe what AADONA offers in that category using DB data.
- Address the user by first name only occasionally — not in every message.
- GREETING: Keep it brief and professional.

MOST IMPORTANT NAVIGATION RULES:
- NEVER mention any URL, link, or page address in your text response. Not even partially.
- NEVER say "visit aadona.com/..." or "go to aadona.com/..." or "check our website".
- NEVER say "visit this page" or "click here" in your text.
- When a user has a query related to a specific SERVICE/SUPPORT page (careers, warranty, partner, etc.):
  * FIRST understand their exact requirement conversationally.
  * ONLY after understanding, end your reply naturally.
  * A button will automatically appear below — do NOT mention it in text.
  * Let the button handle navigation silently.
- When a user asks about PRODUCTS:
  * If asking about a specific model → answer briefly, product card with image will appear automatically.
  * If asking about a category → describe the category briefly, a "Browse [Category]" button + relevant products will appear.
  * NEVER say "I'll show you the products" — just answer the query, the UI handles the rest.
- NEVER say "my database does not contain" or "I don't have information" if products exist.
- NEVER say "please contact sales" for product queries — always check LIVE PRODUCT DATABASE first.
- If a category exists in database (like NAS, Switches, Wireless), ALWAYS reference those products.
- Only say "we do not have this product" if after checking the full database, truly no match is found.
- NEVER mention database limitations to the user.
- Guide conversationally. One question at a time.

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

// ─── POST /chat/summary ────────────────────────────────────────────────────
router.post('/chat/summary', async (req, res) => {
  try {
    const { name, phone, city, messages, isResume } = req.body;
    if (!name || !phone) return res.json({ success: true });

    const transporter = require('../mailer');

    // ── Resume notification ──
    if (isResume) {
      const resumeChatRows = (messages || [])
        .filter(m => m.content?.trim())
        .map(m => {
          const isBot = m.role === 'bot' || m.role === 'assistant';
          const bg = isBot ? '#f0fdf4' : '#ffffff';
          const label = isBot ? '🤖 AADONA Assistant' : `👤 ${name}`;
          const labelColor = isBot ? '#166534' : '#1e40af';
          return `
            <tr style="background:${bg}">
              <td style="padding:10px 14px;border:1px solid #e5e7eb;width:150px;vertical-align:top">
                <span style="font-size:12px;font-weight:700;color:${labelColor}">${label}</span>
                ${m.time ? `<br/><span style="font-size:10px;color:#9ca3af">${m.time}</span>` : ''}
              </td>
              <td style="padding:10px 14px;border:1px solid #e5e7eb;font-size:13px;
                color:#374151;line-height:1.6">
                ${m.content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br/>')}
              </td>
            </tr>`;
        }).join('');

      await transporter.sendMail({
        from: `"AADONA Chatbot" <${process.env.EMAIL_USER}>`,
        to: process.env.COMPANY_EMAIL,
        subject: `🔄 User Resumed Chat — ${name} (+91 ${phone})`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;padding:28px;
            border:1px solid #fef08a;border-radius:12px">
            <div style="background:#fefce8;padding:16px 20px;border-radius:8px;margin-bottom:20px;
              border-left:4px solid #f59e0b">
              <h2 style="color:#854d0e;margin:0 0 6px">🔄 User Resumed Chat</h2>
              <p style="color:#713f12;font-size:14px;margin:0">
                <b>${name}</b> (+91 ${phone}${city ? `, ${city}` : ''}) has
                <b>resumed the conversation</b> after being inactive.
              </p>
              <p style="color:#92400e;font-size:12px;margin:8px 0 0">
                ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
              </p>
            </div>
            ${resumeChatRows ? `
              <h3 style="color:#065f46;font-size:13px;text-transform:uppercase;
                letter-spacing:0.5px;margin-bottom:10px">Previous Chat Transcript</h3>
              <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse">
                ${resumeChatRows}
              </table>
            ` : ''}
            <p style="margin-top:20px;font-size:11px;color:#9ca3af">
              Sent automatically · AADONA Chatbot System
            </p>
          </div>
        `,
      }).catch(() => {});
      return res.json({ success: true });
    }

    // ── Full summary ──
    if (!messages?.length) return res.json({ success: true });
    const hasRealChat = messages.some(m => m.role === 'user');
    if (!hasRealChat) return res.json({ success: true });

    const chatRows = messages
      .filter(m => m.content?.trim())
      .map(m => {
        const isBot = m.role === 'bot' || m.role === 'assistant';
        const bg = isBot ? '#f0fdf4' : '#ffffff';
        const label = isBot ? '🤖 AADONA Assistant' : `👤 ${name}`;
        const labelColor = isBot ? '#166534' : '#1e40af';
        return `
          <tr style="background:${bg}">
            <td style="padding:10px 14px;border:1px solid #e5e7eb;width:150px;vertical-align:top">
              <span style="font-size:12px;font-weight:700;color:${labelColor}">${label}</span>
              ${m.time ? `<br/><span style="font-size:10px;color:#9ca3af">${m.time}</span>` : ''}
            </td>
            <td style="padding:10px 14px;border:1px solid #e5e7eb;font-size:13px;
              color:#374151;line-height:1.6">
              ${m.content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br/>')}
            </td>
          </tr>`;
      }).join('');

    await transporter.sendMail({
      from: `"AADONA Chatbot" <${process.env.EMAIL_USER}>`,
      to: process.env.COMPANY_EMAIL,
      subject: `💬 Chat Summary — ${name} (+91 ${phone})${req.body.trigger === 'close' ? ' (Tab Closed)' : ' (10 min Inactivity)'}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;padding:28px;
          border:1px solid #d1fae5;border-radius:12px">
          <h2 style="color:#065f46;margin-bottom:4px">Chat Summary (${req.body.trigger === 'close' ? 'Tab Closed' : '10 min Inactivity'})</h2>
          <p style="color:#6b7280;font-size:13px;margin-bottom:20px">
            Conversation captured after 10 minutes of inactivity.
          </p>
          <table cellpadding="10" cellspacing="0" width="100%"
            style="border-collapse:collapse;font-size:13px;margin-bottom:24px">
            <tr style="background:#f0fdf4">
              <td style="border:1px solid #d1fae5;font-weight:600;width:40%">Name</td>
              <td style="border:1px solid #d1fae5">${name}</td>
            </tr>
            <tr>
              <td style="border:1px solid #d1fae5;font-weight:600">Mobile</td>
              <td style="border:1px solid #d1fae5">+91 ${phone}</td>
            </tr>
            <tr style="background:#f0fdf4">
              <td style="border:1px solid #d1fae5;font-weight:600">City</td>
              <td style="border:1px solid #d1fae5">${city || '-'}</td>
            </tr>
            <tr>
              <td style="border:1px solid #d1fae5;font-weight:600">Total Messages</td>
              <td style="border:1px solid #d1fae5">${messages.length}</td>
            </tr>
            <tr style="background:#f0fdf4">
              <td style="border:1px solid #d1fae5;font-weight:600">Time</td>
              <td style="border:1px solid #d1fae5">
                ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
              </td>
            </tr>
          </table>
          <h3 style="color:#065f46;font-size:13px;text-transform:uppercase;
            letter-spacing:0.5px;margin-bottom:10px">Chat Transcript</h3>
          <table cellpadding="0" cellspacing="0" width="100%"
            style="border-collapse:collapse">
            ${chatRows}
          </table>
          <p style="margin-top:20px;font-size:11px;color:#9ca3af">
            Sent automatically · AADONA Chatbot System
          </p>
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

    const categories = await getCategoryMap();

    // ── Product cards + category button (dynamic) ──
    const { cards: productCards, categoryButton } = detectProductCards(
      fullReply,
      products,
      lastUserMessage,
      categories
    );

    // ── Static page action buttons ──
    // Only show static buttons if NO product cards were found
    // (product queries shouldn't mix with static page buttons)
    let actionButtons = [];
    if (!productCards.length) {
      actionButtons = detectStaticPageIntent(lastUserMessage, fullReply);
    }

    // Final buttons: category button (if any) + action buttons, max 2
    const allButtons = [
      ...(categoryButton ? [categoryButton] : []),
      ...actionButtons
    ].slice(0, 2);

    res.write(`data: ${JSON.stringify({
      done: true,
      productCards: productCards.length ? productCards : null,
      actionButtons: allButtons.length ? allButtons : null,
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