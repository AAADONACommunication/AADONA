const express = require("express");
const router = express.Router();
const admin = require("../firebaseAdmin");
const SalesRep = require("../models/SalesRep");
const verifyToken = require("../middleware/verifyToken"); // admin middleware
const verifySalesToken = require("../middleware/verifySalesToken");
const crypto = require("crypto");
const transporter = require("../mailer");
const SalesInvite = require("../models/SalesInvite");
const otpStore = require("../otpStore");

// ── CREATE SALES REP (Admin only) ──
router.post("/admin/sales/create", verifyToken, async (req, res) => {
  try {
    const { name, email, password, phone, region } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    // Firebase user banao
    const user = await admin.auth().createUser({ email, password, displayName: name });

    // salesRep: true custom claim set karo
    await admin.auth().setCustomUserClaims(user.uid, { salesRep: true });

    // DB mein save karo
    const salesRep = await SalesRep.create({
      uid: user.uid,
      name,
      email,
      phone: phone || "",
      region: region || "",
      createdBy: req.user.email,
    });

    res.status(201).json({ message: "Sales rep created successfully", salesRep });
  } catch (err) {
    console.log("Create sales rep error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET ALL SALES REPS (Admin only) ──
router.get("/admin/sales", verifyToken, async (req, res) => {
  try {
    const salesReps = await SalesRep.find().sort({ createdAt: -1 });
    res.json(salesReps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── TOGGLE ACTIVE/INACTIVE (Admin only) ──
router.put("/admin/sales/:uid/toggle", verifyToken, async (req, res) => {
  try {
    const salesRep = await SalesRep.findOne({ uid: req.params.uid });
    if (!salesRep) return res.status(404).json({ message: "Sales rep not found" });

    salesRep.isActive = !salesRep.isActive;
    await salesRep.save();

    // Firebase mein bhi disable/enable karo
    await admin.auth().updateUser(req.params.uid, {
      disabled: !salesRep.isActive,
    });

    res.json({ message: `Sales rep ${salesRep.isActive ? "activated" : "deactivated"}`, salesRep });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE SALES REP (Admin only) ──
router.delete("/admin/sales/:uid", verifyToken, async (req, res) => {
  try {
    const salesRep = await SalesRep.findOne({ uid: req.params.uid });
    if (!salesRep) return res.status(404).json({ message: "Sales rep not found" });

    // Firebase se delete karo
    await admin.auth().deleteUser(req.params.uid);

    // DB se delete karo
    await SalesRep.findOneAndDelete({ uid: req.params.uid });

    res.json({ message: "Sales rep deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/sales/verify", verifySalesToken, async (req, res) => {
  try {
    const salesRep = await SalesRep.findOne({
      uid: req.salesRep.uid,
      isActive: true,
    });

    if (!salesRep) {
      return res.status(403).json({
        message: "Sales representative not found or inactive",
      });
    }

    res.json({
      success: true,
      salesRep,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

// ── GET OWN PROFILE (Sales rep) ──
router.get("/sales/profile", verifySalesToken, async (req, res) => {
  try {
    const salesRep = await SalesRep.findOne({ uid: req.salesRep.uid });
    if (!salesRep) return res.status(404).json({ message: "Profile not found" });
    res.json(salesRep);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SEND INVITE (Admin only) ──
router.post("/admin/sales/invite", verifyToken, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existing = await SalesRep.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ message: "This email is already registered as a sales rep" });
    }

    await SalesInvite.deleteMany({ email: cleanEmail, used: false });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await SalesInvite.create({
      email: cleanEmail,
      token,
      expiresAt,
      invitedBy: req.user.email,
    });

    const inviteUrl = `${process.env.FRONTEND_URL}/sales-signup/${token}`;

    await transporter.sendMail({
      from: `"AADONA Admin" <${process.env.EMAIL_USER}>`,
      to: cleanEmail,
      subject: "You're invited to join AADONA Sales Portal",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;border:1px solid #e5e7eb;border-radius:12px">
          <h2 style="color:#166534">You're Invited!</h2>
          <p style="color:#374151">You have been invited by <b>${req.user.email}</b> to join the AADONA Sales Portal.</p>
          <p style="color:#374151">Click the button below to set up your account. This link expires in <b>7 days</b>.</p>
          <div style="text-align:center;margin:30px 0">
            <a href="${inviteUrl}" style="background:#16a34a;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
              Set Up My Account
            </a>
          </div>
          <p style="color:#9ca3af;font-size:12px">If you did not expect this invite, please ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: "Invite sent successfully ✅" });
  } catch (err) {
    console.log("Send invite error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── VERIFY INVITE TOKEN (Public) ──
router.get("/sales/invite/:token", async (req, res) => {
  try {
    const invite = await SalesInvite.findOne({
      token: req.params.token,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!invite) {
      return res.status(400).json({ message: "Invalid or expired invite link" });
    }

    res.json({ email: invite.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SEND OTP FOR SIGNUP (Public) ──
router.post("/sales/signup/send-otp", async (req, res) => {
  try {
    const { email, token } = req.body;
    if (!email || !token) {
      return res.status(400).json({ message: "Email and token are required" });
    }

    const invite = await SalesInvite.findOne({
      token,
      email: email.toLowerCase().trim(),
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!invite) {
      return res.status(400).json({ message: "Invalid or expired invite link" });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(`sales-${email}`, { otp, expiresAt });

    await transporter.sendMail({
      from: `"AADONA Sales Portal" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP for Sales Portal Signup",
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:30px;border:1px solid #e5e7eb;border-radius:12px">
          <h2 style="color:#166534">Verify Your Email</h2>
          <p style="color:#374151">Use the OTP below to verify your email:</p>
          <div style="font-size:38px;font-weight:bold;letter-spacing:12px;color:#166534;text-align:center;padding:20px;background:#f0fdf4;border-radius:10px;margin:20px 0">
            ${otp}
          </div>
          <p style="color:#6b7280;font-size:13px">Expires in <strong>5 minutes</strong>. Do not share it.</p>
        </div>
      `,
    });

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.log("Send OTP error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── VERIFY OTP + CREATE ACCOUNT (Public) ──
router.post("/sales/signup/verify", async (req, res) => {
  try {
    const { email, token, otp, password, name, phone } = req.body;

    if (!email || !token || !otp || !password || !name) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const invite = await SalesInvite.findOne({
      token,
      email: email.toLowerCase().trim(),
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!invite) {
      return res.status(400).json({ message: "Invalid or expired invite link" });
    }

    const otpRecord = otpStore.get(`sales-${email}`);
    if (!otpRecord) {
      return res.status(400).json({ message: "OTP not found. Please request a new one." });
    }
    if (Date.now() > otpRecord.expiresAt) {
      otpStore.delete(`sales-${email}`);
      return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }
    if (otpRecord.otp !== otp.toString()) {
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }

    otpStore.delete(`sales-${email}`);

    const firebaseUser = await admin.auth().createUser({
      email: email.toLowerCase().trim(),
      password,
      displayName: name,
    });

    await admin.auth().setCustomUserClaims(firebaseUser.uid, { salesRep: true });

    const salesRep = await SalesRep.create({
      uid: firebaseUser.uid,
      name,
      email: email.toLowerCase().trim(),
      phone: phone || "",
      createdBy: invite.invitedBy,
    });

    invite.used = true;
    await invite.save();

    res.status(201).json({ message: "Account created successfully ✅", salesRep });
  } catch (err) {
    console.log("Signup verify error:", err.message);
    if (err.code === "auth/email-already-exists") {
      return res.status(400).json({ message: "This email is already registered" });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;