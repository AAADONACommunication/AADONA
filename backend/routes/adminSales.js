const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const admin = require("../firebaseAdmin");
const verifyToken = require("../middleware/verifyToken");
const transporter = require("../mailer");
const SalesQuotation = require("../models/SalesQuotation"); // apna actual path check kar lena

/* =============================
   GET /api/admin/sales
   List all sales reps (Firebase users with salesRep custom claim)
============================= */
router.get("/", verifyToken, async (req, res) => {
  try {
    const listResult = await admin.auth().listUsers(1000);
    const salesReps = listResult.users
      .filter((user) => user.customClaims?.salesRep === true)
      .map((user) => ({
        uid: user.uid,
        name: user.displayName || user.customClaims?.name || "-",
        email: user.email,
        phone: user.customClaims?.phone || "",
        region: user.customClaims?.region || "",
        isActive: user.customClaims?.isActive !== false,
        createdBy: user.customClaims?.createdBy || "-",
        createdAt: user.metadata.creationTime || null,
      }));

    res.json(salesReps);
  } catch (err) {
    console.error("List sales reps error:", err);
    res.status(500).json({ message: "Failed to fetch sales reps" });
  }
});

/* =============================
   POST /api/admin/sales/invite
   Send invite link to a sales rep email
============================= */
router.post("/invite", verifyToken, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Generate a signup token (store however your existing signup flow expects —
    // e.g. in a separate SalesInvite model, or Firebase custom token)
    const token = crypto.randomBytes(24).toString("hex");

    // TODO: persist this token somewhere (e.g. SalesInvite collection) so that
    // /sales-signup/:token can validate it. Adjust to match your existing implementation.

    const signupUrl = `${process.env.FRONTEND_URL || "https://aadona.com"}/sales-signup/${token}`;

    await transporter.sendMail({
      from: `"AADONA Sales" <${process.env.EMAIL_USER}>`,
      to: cleanEmail,
      subject: "You're invited to join AADONA Sales Portal",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:30px;border:1px solid #e5e7eb;border-radius:12px">
          <h2 style="color:#166534">Sales Rep Invitation</h2>
          <p style="color:#374151">You've been invited to join AADONA as a Sales Representative.</p>
          <a href="${signupUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px">
            Complete Signup
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:20px">If you did not expect this invite, you can ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: "Invite sent successfully" });
  } catch (err) {
    console.error("Invite sales rep error:", err);
    res.status(500).json({ message: "Failed to send invite" });
  }
});

/* =============================
   DELETE /api/admin/sales/:uid
   Remove a sales rep
============================= */
router.delete("/:uid", verifyToken, async (req, res) => {
  try {
    const { uid } = req.params;

    const userRecord = await admin.auth().getUser(uid);
    if (!userRecord.customClaims?.salesRep) {
      return res.status(400).json({ message: "This user is not a sales rep" });
    }

    await admin.auth().deleteUser(uid);
    res.json({ message: "Sales rep removed successfully" });
  } catch (err) {
    console.error("Delete sales rep error:", err);
    if (err.code === "auth/user-not-found") {
      return res.status(404).json({ message: "User not found in Firebase" });
    }
    res.status(500).json({ message: "Failed to remove sales rep" });
  }
});

/* =============================
   GET /api/admin/sales/:uid/insights
   Return all SalesQuotation docs for this rep (read-only, no analytics)
============================= */
router.get("/:uid/insights", verifyToken, async (req, res) => {
  try {
    const { uid } = req.params;

    const quotations = await SalesQuotation.find({ salesRepUid: uid })
      .populate("customer")
      .populate("endCustomer")
      .sort({ createdAt: -1 });

    res.json(quotations);
  } catch (err) {
    console.error("Admin sales insights error:", err);
    res.status(500).json({ message: "Failed to load insights" });
  }
});

module.exports = router;