const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const transporter = require("../mailer");
const Inquiry = require("../models/Inquiry");
const { deleteFromFirebase } = require("../utils/storageAliases");

router.get("/inquiries", verifyToken, async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 });
    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/inquiries/:id/read", verifyToken, async (req, res) => {
  try {
    const inquiry = await Inquiry.findByIdAndUpdate(
      req.params.id,
      { status: "read" },
      { new: true }
    );
    if (!inquiry)
      return res.status(404).json({ message: "Inquiry not found" });
    res.json(inquiry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/inquiries/:id/reply", verifyToken, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message)
      return res.status(400).json({ message: "Message is required" });

    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry)
      return res.status(404).json({ message: "Inquiry not found" });
    if (!inquiry.customerEmail)
      return res.status(400).json({ message: "No customer email found" });

    await transporter.sendMail({
      from: `"AADONA Support" <${process.env.EMAIL_USER}>`,
      to: inquiry.customerEmail,
      subject: `Re: Your ${inquiry.formType} inquiry`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;border:1px solid #e5e7eb;border-radius:12px">
          <h2 style="color:#166534">AADONA Response</h2>
          <p>Dear ${inquiry.customerName},</p>
          <div style="background:#f0fdf4;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #16a34a">
            ${message}
          </div>
          <p style="color:#6b7280;font-size:13px">This is regarding your <b>${inquiry.formType}</b> inquiry submitted on ${new Date(inquiry.createdAt).toDateString()}.</p>
          <p style="color:#166534;font-weight:bold">Team AADONA</p>
        </div>
      `,
    });

    inquiry.replies.push({
      message,
      sentBy: req.user.email,
      sentAt: new Date(),
    });
    inquiry.status = "replied";
    await inquiry.save();

    res.json({ message: "Reply sent successfully", inquiry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/inquiries/:id", verifyToken, async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry)
      return res.status(404).json({ message: "Inquiry not found" });

    const attachmentUrl = inquiry.formData?.attachmentUrl;
    if (attachmentUrl) await deleteFromFirebase(attachmentUrl);

    await Inquiry.findByIdAndDelete(req.params.id);
    res.json({ message: "Inquiry deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
