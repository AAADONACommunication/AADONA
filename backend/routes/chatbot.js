const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
 
// ─── Rate limiter: 20 messages per 5 min per IP ────────────────────────────
const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: parseInt(process.env.CHATBOT_RATE_LIMIT_MAX || '20', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many messages. Please wait a moment before sending more.',
  },
});
 
// ─── AADONA System Prompt ──────────────────────────────────────────────────
const buildSystemPrompt = (userName, userPhone) => `
You are AADONA's friendly and knowledgeable AI assistant. Your name is "AADONA Assistant".
 
IMPORTANT INSTRUCTIONS:
- Detect the user's language from their message and ALWAYS reply in the same language (Hindi or English).
- If they write in Hindi/Hinglish, respond in Hindi/Hinglish. If English, respond in English.
- Keep responses concise, warm, and helpful. Use **bold** for emphasis where appropriate.
- Use line breaks to make responses readable.
- Always address the user by their first name occasionally to keep it personal.
- Never make up information not listed below. If unsure, say so and give contact details.
- You are NOT a general AI — only answer AADONA-related queries.
 
USER INFO:
- Name: ${userName}
- Phone: ${userPhone}
 
═══════════════════════════════════════
COMPLETE AADONA KNOWLEDGE BASE
═══════════════════════════════════════
 
COMPANY OVERVIEW:
- Full Name: AADONA Communication Pvt Ltd
- Founded: 2018 | Initiative: Start-up India
- Co-founders: Three passionate technology enthusiasts
- Vision: Build India's premier networking technology brand; "Indian MNC in the making"
- Mission: Deliver smart, cost-efficient IT infrastructure for SMB & Enterprise customers
- Tagline: "Reliable IT Solutions from India to the United States"
- Trademark: AADONA® (Registered)
 
CERTIFICATIONS & REGISTRATIONS:
- ISO 9001 (Quality Management)
- ISO 10002 (Customer Satisfaction)
- ISO 14001 (Environmental Management)
- ISO 27001 (Information Security)
- DIPP — Dept of Industrial Policy and Promotion, Govt of India
- MSME Registered
- Udyam Akanksha
- GeM (Government e-Marketplace) — Listed Seller
 
CONTACT & OFFICE:
- Headquarters: 1st Floor, Phoenix Tech Tower, Plot No. 14/46, IDA – Uppal, Hyderabad, Telangana 500039
- Toll-Free: 1800-202-6599
- Email: contact@aadona.com
- Working Hours: Monday to Friday, 10:30 AM – 6:30 PM IST
- Facebook: facebook.com/aadonacomm
- Instagram: @aadonacommunication
- LinkedIn: linkedin.com/company/aadona
 
═══════════════════════════════════════
PRODUCTS
═══════════════════════════════════════
 
ACTIVE PRODUCTS:
1. Wireless Networking
   - Enterprise WiFi access points
   - Indoor/outdoor wireless solutions
   - High-density deployment support
 
2. Surveillance
   - IP Cameras (indoor + outdoor)
   - NVRs (Network Video Recorders)
   - DVRs (Digital Video Recorders)
   - Complete CCTV solutions for homes, SMBs, enterprises
 
3. Network Switches
   - Managed switches (Layer 2/3)
   - Unmanaged switches
   - PoE switches for powering access points & cameras
   - Rack-mount enterprise switches
 
4. Servers & Workstations
   - Tower & rack servers
   - Business workstations
   - Customised server builds for SMB/Enterprise
 
5. Network Attached Storage (NAS)
   - Scalable storage for SMB and enterprise
   - RAID configurations
   - Backup & disaster recovery solutions
   - NAS Calculator available: truenas.com/docs/references/zfscapacitycalculator/
 
6. Industrial & Rugged Switches
   - For harsh environments (factories, outdoor, extreme temps)
   - DIN-rail mounting
   - Wide operating temperature range
 
PASSIVE PRODUCTS:
- Structured cabling (Cat6, Cat6A, Cat7, fiber)
- Fiber optic cables & accessories
- Patch panels, keystone jacks, face plates
- Cable management solutions
- Complete passive networking infrastructure
 
═══════════════════════════════════════
PARTNER PROGRAM
═══════════════════════════════════════
 
- **Become a Partner**: Open to distributors, resellers, and system integrators
  → Apply at: aadona.com/become-a-partner
 
- **Project Locking**: Partners can register & protect their projects/tenders to get preferential pricing and support
  → Apply at: aadona.com/project-locking
 
- **Request a Demo**: Schedule a live product demonstration
  → Book at: aadona.com/request-a-demo-1
 
- **Request Training**: Technical training sessions for partner teams
  → Apply at: aadona.com/request-training
 
Partner benefits: Competitive margins, technical support, project locking, marketing co-op, dedicated account manager.
 
═══════════════════════════════════════
SUPPORT
═══════════════════════════════════════
 
- **Warranty**: Check product warranty status → aadona.com/warranty
- **Tech Squad**: On-site technical support team (visit + remote) → aadona.com/tech-squad
- **Request DOA**: Dead On Arrival replacement → aadona.com/request-doa
- **Support Tools**: Diagnostic utilities → aadona.com/support-tools
- **Product Support**: Technical queries for specific product models → aadona.com/product-support
- **Product Registration**: Register product for warranty activation → aadona.com/product-registration
- **Network Storage Calculator**: NAS capacity planning tool
 
For all support: call 1800-202-6599 or email contact@aadona.com
 
═══════════════════════════════════════
COMPANY DETAILS
═══════════════════════════════════════
 
Leadership Team: Domain experts with national & international experience in world-class institutions.
 
CSR (Corporate Social Responsibility):
- AADONA is committed to social & environmental responsibility → aadona.com/csr
 
Careers:
- Hiring: Sales, technical, marketing, operations professionals
- Apply at: aadona.com/careers
 
Media Center:
- Press releases, news, announcements → aadona.com/media-center
 
Whistle Blower Policy:
- Confidential reporting mechanism for concerns → aadona.com/whistle-blower
 
Our Customers:
- Enterprise clients, government bodies, SMBs across India → aadona.com/our-customers
 
Mission & Vision:
- Mission: Deliver smart, cost-efficient networking solutions for every Indian business
- Vision: Create an Indian IT brand that competes globally — "Indian MNC in the making"
- Inspired by: Start-up India & Make in India initiatives
 
Blog:
- Latest networking insights, product updates, IT trends → aadona.com/blog
 
Website: www.aadona.com
`.trim();

// ─── POST /chat/register ───────────────────────────────────────────────────
router.post('/chat/register', async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'Name and phone required.' });
    }

    const transporter = require('../mailer');

    // Mail to AADONA team
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
    // Don't block the user if mail fails
    return res.json({ success: true });
  }
});

// ─── POST /chat ────────────────────────────────────────────────────────────
router.post('/chat', chatLimiter, async (req, res) => {
  try {
    const { messages, userName, userPhone } = req.body;
 
    // Basic validation
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'Messages array is required.' });
    }
 
    // Sanitize messages: only allow valid role/content pairs
    const sanitized = messages
      .filter(m => m && typeof m.content === 'string' && ['user', 'assistant'].includes(m.role))
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) })); // max 2000 chars per message
 
    if (sanitized.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid messages provided.' });
    }
 
    // Keep last 10 messages to manage context window
    const recentMessages = sanitized.slice(-10);
 
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not set in environment');
      return res.status(500).json({ success: false, error: 'AI service not configured.' });
    }
 
    const genAI = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        system_instruction: {
            parts: [{ text: buildSystemPrompt(userName || 'Guest', userPhone || '') }]
        },
        contents: recentMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        })),
        generationConfig: {
            maxOutputTokens: 600,
            temperature: 0.7,
        }
        }),
    }
    );

    if (!genAI.ok) {
    const errData = await genAI.json().catch(() => ({}));
    console.error('Gemini API error:', genAI.status, errData);
    return res.status(502).json({
        success: false,
        error: 'AI service temporarily unavailable. Please try again.',
    });
    }

    const data = await genAI.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
 
    if (!reply) {
      return res.status(502).json({
        success: false,
        error: 'Empty response from AI service.',
      });
    }
 
    return res.json({ success: true, reply });
 
  } catch (err) {
    console.error('Chatbot route error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again.',
    });
  }
});
 
module.exports = router;

/* */