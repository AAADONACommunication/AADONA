const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const verifyToken = require("../middleware/verifyToken");
const transporter = require("../mailer");
const otpStore = require("../otpStore");

router.post("/send-otp", verifyToken, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 2 * 60 * 1000;
    otpStore.set(email, { otp, expiresAt });

    await transporter.sendMail({
      from: `"Admin System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Admin Account OTP",
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:30px;border:1px solid #e5e7eb;border-radius:12px">
          <h2 style="color:#166534;margin-bottom:8px">Admin Account Verification</h2>
          <p style="color:#374151;margin-bottom:20px">Use the OTP below to verify your email and create your admin account:</p>
          <div style="font-size:38px;font-weight:bold;letter-spacing:12px;color:#166534;text-align:center;padding:20px;background:#f0fdf4;border-radius:10px;margin-bottom:20px">
            ${otp}
          </div>
          <p style="color:#6b7280;font-size:13px">This OTP expires in <strong>2 minutes</strong>. Do not share it with anyone.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:16px">If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

router.post("/verify-otp", verifyToken, async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required" });

    const record = otpStore.get(email);
    if (!record)
      return res
        .status(400)
        .json({ message: "OTP not found. Please request a new one." });

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res
        .status(400)
        .json({ message: "OTP has expired. Please request a new one." });
    }

    if (record.otp !== otp.toString()) {
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }

    otpStore.delete(email);
    res.json({ message: "OTP verified successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to verify OTP" });
  }
});

module.exports = router;
