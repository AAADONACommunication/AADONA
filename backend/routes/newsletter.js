const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const transporter = require("../mailer");
const { formLimiter, adminLimiter } = require("../middleware/rateLimiters");
const { upload } = require("../middleware/uploads");
const Subscriber = require("../models/Subscriber");
const NewsletterHistory = require("../models/NewsletterHistory");
const logAction = require("../utils/auditLog");
const isEmailDomainValid = require("../utils/email");
const { uploadToFirebase } = require("../utils/storageAliases");

// ── NEWSLETTER SUBSCRIBE (Public) ─────────────────────────────────
router.post("/newsletter-subscribe", formLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.status(400).json({ success: false, message: "Email is required" });

  const emailValid = await isEmailDomainValid(email);
  if (!emailValid)
    return res.status(400).json({ 
      success: false, 
      message: "Invalid email address. Please enter a real email." 
    });

  try {
    const cleanEmail = email.toLowerCase().trim();

    // If already exist
    const existing = await Subscriber.findOne({ email: cleanEmail });
    if (existing) {
      if (existing.status === "unsubscribed") {
        existing.status = "active";
        await existing.save();
        // Company ko notify karo
        transporter.sendMail({
          from: `"AADONA Newsletter" <${process.env.EMAIL_USER}>`,
          to: process.env.COMPANY_EMAIL,
          subject: `Newsletter Re-Subscription: ${cleanEmail}`,
          html: `<p><b>${cleanEmail}</b> has re-subscribed to the newsletter.</p>`,
        }).catch(() => {});
        return res.json({ success: true, message: "Welcome back! You're subscribed again." });
      }
      return res.json({ success: true, message: "You're already subscribed!" });
    }

    // Save new subcriber
    await Subscriber.create({ email: cleanEmail });

    // Notify the company about new subscriber
    transporter.sendMail({
      from: `"AADONA Newsletter" <${process.env.EMAIL_USER}>`,
      to: process.env.COMPANY_EMAIL,
      subject: `New Newsletter Subscriber`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;
          padding:30px;border:1px solid #e5e7eb;border-radius:12px">
          <h2 style="color:#166534">New Subscriber</h2>
          <div style="background:#f0fdf4;padding:16px;border-radius:8px;
            border-left:4px solid #16a34a;margin:20px 0">
            <b>Email:</b> ${cleanEmail}<br/>
            <b>Time:</b> ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
          </div>
        </div>
      `,
    }).catch(() => {});

    res.json({ success: true, message: "Subscribed successfully!" });

  } catch (err) {
    console.error("[Newsletter Subscribe]", err.message);
    res.status(500).json({ success: false, message: "Failed to subscribe. Try again." });
  }
});

// ── NEWSLETTER HISTORY (Admin) ────────────────────────────────────
router.get("/subscribers/history", verifyToken, adminLimiter, async (req, res) => {
  try {
    const history = await NewsletterHistory.find()
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── BROADCAST EMAIL (Admin) ────────────────────────────────────────
router.post("/subscribers/broadcast",
  verifyToken,
  adminLimiter,
  upload.fields([
    { name: "bannerImage", maxCount: 1 },
    { name: "pdfAttachments", maxCount: 10 },
  ]),
  async (req, res) => {
    const buttons = req.body.buttons ? JSON.parse(req.body.buttons) : [];
    const { subject, heading, bodyText, footerText } = req.body;
    if (!subject?.trim() || !bodyText?.trim())
      return res.status(400).json({ message: "Subject and content are required" });

    try {
      // Banner image → Firebase upload
      let bannerUrl = null;
      if (req.files?.bannerImage?.[0]) {
        bannerUrl = await uploadToFirebase(req.files.bannerImage[0], "newsletter-banners");
      }

      // Build professional HTML email
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
                
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#166534,#16a34a);padding:32px;text-align:center">
                    <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px">AADONA Communication</h1>
                    <p style="color:#bbf7d0;margin:6px 0 0;font-size:13px">Your trusted networking partner</p>
                  </td>
                </tr>

                <!-- Banner Image -->
                ${bannerUrl ? `
                <tr>
                  <td style="padding:0">
                    <img src="${bannerUrl}" alt="Newsletter Banner" width="600"
                      style="width:100%;max-width:600px;display:block;object-fit:cover"/>
                  </td>
                </tr>` : ""}

                <!-- Heading -->
                ${heading?.trim() ? `
                <tr>
                  <td style="padding:32px 40px 0">
                    <h2 style="color:#166534;font-size:22px;font-weight:700;margin:0">${heading}</h2>
                  </td>
                </tr>` : ""}

                <!-- Body -->
                <tr>
                  <td style="padding:20px 40px 28px;color:#374151;font-size:15px;line-height:1.75">
                    ${bodyText.replace(/\n/g, "<br/>")}
                  </td>
                </tr>

                <!-- CTA Button -->
                ${buttons.length > 0 ? `
                  <tr>
                    <td style="padding:0 40px 32px;text-align:center">
                      ${buttons.filter(b => b.text?.trim() && b.url?.trim()).map(b => `
                        <a href="${b.url}" target="_blank"
                          style="display:inline-block;background:#16a34a;color:#ffffff;
                            text-decoration:none;font-weight:700;font-size:15px;
                            padding:14px 36px;border-radius:10px;margin:4px;
                            box-shadow:0 4px 12px rgba(22,163,74,0.35)">
                          ${b.text}
                        </a>
                      `).join("")}
                    </td>
                  </tr>` : ""}

                <!-- Divider -->
                <tr>
                  <td style="padding:0 40px">
                    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0"/>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:24px 40px;text-align:center">
                    <p style="color:#6b7280;font-size:12px;margin:0;line-height:1.6">
                      ${footerText?.trim() || "© 2025 AADONA Communication. All rights reserved."}<br/>
                      <span style="color:#9ca3af">You received this email because you subscribed to AADONA updates.</span>
                    </p>
                  </td>
                </tr>

              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `;

      // Selected subscribers
      const parsedIds = req.body.selectedIds
        ? JSON.parse(req.body.selectedIds)
        : [];

      const query = parsedIds.length
        ? { _id: { $in: parsedIds }, status: "active" }
        : { status: "active" };

      const subscribers = await Subscriber.find(query);
      if (subscribers.length === 0)
        return res.status(400).json({ message: "No active subscribers found" });

      const BATCH_SIZE = 50;
      let sent = 0;
      let failed = 0;

      for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
        const batch = subscribers.slice(i, i + BATCH_SIZE);
        const bccList = batch.map((s) => s.email).join(",");

        const mailOptions = {
          from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
          to: process.env.COMPANY_EMAIL,
          bcc: bccList,
          subject: subject.trim(),
          html: emailHtml,
        };

        // PDF attachment
        if (req.files?.pdfAttachments?.length) {
          mailOptions.attachments = req.files.pdfAttachments.map(pdf => ({
            filename: pdf.originalname,
            content: pdf.buffer,
            contentType: "application/pdf",
          }));
        }

        try {
          await transporter.sendMail(mailOptions);
          sent += batch.length;
        } catch (err) {
          console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, err.message);
          failed += batch.length;
        }
      }

      logAction(req.user.email, "BROADCAST", "Newsletter", subject, {
        changes: { sent: { new: sent }, failed: { new: failed } },
      });

      await NewsletterHistory.create({
        subject: subject.trim(),
        heading: req.body.heading?.trim() || "",
        bodyText: req.body.bodyText?.trim(),
        footerText: req.body.footerText?.trim() || "",
        buttons,
        bannerUrl,
        pdfNames: req.files?.pdfAttachments?.map(f => f.originalname) || [],
        sentTo: sent,
        failed,
        sentBy: req.user.email,
      });

      res.json({
        success: true,
        message: `Newsletter sent to ${sent} subscribers${failed > 0 ? `, ${failed} failed` : ""}.`,
      });

    } catch (err) {
      console.error("[Broadcast]", err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── UNSUBSCRIBE single (Admin) ─────────────────────────────────────
router.delete("/subscribers/:id", verifyToken, async (req, res) => {
  try {
    const sub = await Subscriber.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: "Subscriber not found" });
    await Subscriber.findByIdAndDelete(req.params.id);
    logAction(req.user.email, "DELETE", "Subscriber", sub.email, {});
    res.json({ message: "Subscriber removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SUBSCRIBERS LIST (Admin only) ─────────────────────────────────
router.get("/subscribers", verifyToken, adminLimiter, async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const subscribers = await Subscriber.find(query).sort({ createdAt: -1 });
    res.json(subscribers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
