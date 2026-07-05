const express = require("express");
const router = express.Router();
const transporter = require("../mailer");
const SalesQuotation = require("../models/SalesQuotation");
const AdminQuotation = require("../models/AdminQuotation");
const SalesRep = require("../models/SalesRep");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const FRONTEND_URL = process.env.FRONTEND_URL || "https://aadona.com";

// ── Helper: strip internal/admin-only fields before sending to customer ──
const toPublicQuotation = (quotation) => ({
  _id: quotation._id,
  quotationNumber: quotation.quotationNumber,
  customer: quotation.customer
    ? {
        personalName: quotation.customer.personalName,
        companyName: quotation.customer.companyName,
        email: quotation.customer.email,
        contactNumber: quotation.customer.contactNumber,
      }
    : null,
  items: quotation.items,
  subtotal: quotation.subtotal,
  discountAmount: quotation.discountAmount,
  gstAmount: quotation.gstAmount,
  grandTotal: quotation.grandTotal,
  notes: quotation.notes,
  status: quotation.status,
  sentAt: quotation.sentAt,
  viewedAt: quotation.viewedAt,
  acceptedAt: quotation.acceptedAt,
  rejectedAt: quotation.rejectedAt,
  customerMessage: quotation.customerMessage,
  expectedBudget: quotation.expectedBudget,
  customerRespondedAt: quotation.customerRespondedAt,
  counterOfferAmount: quotation.counterOfferAmount,
  counterOfferSubtotal: quotation.counterOfferSubtotal,
  counterOfferDiscountAmount: quotation.counterOfferDiscountAmount,
  counterOfferGstAmount: quotation.counterOfferGstAmount,
  counterOfferItems: quotation.counterOfferItems,
  counterOfferMessage: quotation.counterOfferMessage,
  counterOfferAt: quotation.counterOfferAt,
  negotiatedAmount: quotation.negotiatedAmount,
  negotiatedAt: quotation.negotiatedAt,
  negotiationHistory: quotation.negotiationHistory || [],
  validTill: quotation.sourceQuotation?.validTill || null,
});

// ── GET /quotation/:publicToken ── (NO AUTH — customer facing)
router.get("/quotation/:publicToken", async (req, res) => {
  try {
    const { publicToken } = req.params;

    const quotation = await SalesQuotation.findOne({ publicToken })
      .populate("customer")
      .populate("sourceQuotation");

    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    // First-open tracking: sent -> viewed
    if (quotation.status === "sent") {
      quotation.status = "viewed";
      quotation.viewedAt = new Date();
      await quotation.save();
    }

    return res.json(toPublicQuotation(quotation));
  } catch (err) {
    console.error("Get public quotation error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /quotation/:publicToken/accept ── (NO AUTH)
router.post("/quotation/:publicToken/accept", async (req, res) => {
  try {
    const { publicToken } = req.params;

    const quotation = await SalesQuotation.findOne({ publicToken }).populate("customer");
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    if (quotation.status === "accepted") {
      return res.status(400).json({ message: "Quotation already accepted" });
    }
    if (quotation.status === "rejected") {
      return res.status(400).json({ message: "This quotation was rejected and cannot be accepted" });
    }

    quotation.status = "accepted";
    quotation.acceptedAt = new Date();
    await quotation.save();

    // Notify Sales Representative
    try {
      const salesRep = await SalesRep.findOne({ uid: quotation.salesRepUid });
      if (salesRep?.email) {
        await transporter.sendMail({
          from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
          to: salesRep.email,
          subject: `Quotation Accepted — #${quotation.quotationNumber}`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px;background:#f0fdf4">
              <h2 style="color:#166534">Quotation Accepted ✅</h2>
              <p style="color:#374151;font-size:14px">
                <strong>${quotation.customer?.personalName || "Customer"}</strong> has accepted
                quotation <strong>#${quotation.quotationNumber}</strong> for
                <strong>₹${Number(quotation.grandTotal).toFixed(2)}</strong>.
              </p>
              <p style="color:#374151;font-size:14px">Please log in to the Sales Portal to proceed.</p>
            </div>
          `,
        });
      }
    } catch (mailErr) {
      console.error("Accept notification email failed:", mailErr.message);
    }

    return res.json({ message: "Quotation Accepted Successfully", status: quotation.status });
  } catch (err) {
    console.error("Accept quotation error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /quotation/:publicToken/negotiate ── (NO AUTH)
router.post("/quotation/:publicToken/negotiate", async (req, res) => {
  try {
    const { publicToken } = req.params;
    const { reason, expectedBudget, additionalNotes } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Reason is required" });
    }
    const expected = Number(expectedBudget);
    if (!Number.isFinite(expected) || expected <= 0) {
      return res.status(400).json({ message: "A valid expected total price is required" });
    }

    const quotation = await SalesQuotation.findOne({ publicToken })
      .populate("customer")
      .populate("sourceQuotation");

    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    if (["accepted", "rejected"].includes(quotation.status)) {
      return res.status(400).json({ message: `Quotation already ${quotation.status}, cannot negotiate` });
    }

    const combinedMessage = [
      `Reason: ${reason.trim()}`,
      additionalNotes && additionalNotes.trim() ? `Additional Notes: ${additionalNotes.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    // Preserve prior negotiation round instead of silently overwriting it
    if (quotation.customerRespondedAt || quotation.counterOfferAt) {
      quotation.negotiationHistory = quotation.negotiationHistory || [];
      quotation.negotiationHistory.push({
        expectedBudget: quotation.expectedBudget,
        customerMessage: quotation.customerMessage,
        customerRespondedAt: quotation.customerRespondedAt,
        counterOfferAmount: quotation.counterOfferAmount,
        counterOfferSubtotal: quotation.counterOfferSubtotal,
        counterOfferDiscountAmount: quotation.counterOfferDiscountAmount,
        counterOfferGstAmount: quotation.counterOfferGstAmount,
        counterOfferItems: quotation.counterOfferItems,
        counterOfferMessage: quotation.counterOfferMessage,
        counterOfferAt: quotation.counterOfferAt,
        recordedAt: new Date(),
      });
    }

    // Reset counter-offer fields for this fresh negotiation round
    quotation.counterOfferAmount = null;
    quotation.counterOfferSubtotal = null;
    quotation.counterOfferDiscountAmount = null;
    quotation.counterOfferGstAmount = null;
    quotation.counterOfferItems = [];
    quotation.counterOfferMessage = "";
    quotation.counterOfferAt = null;

    quotation.customerMessage = combinedMessage;
    quotation.expectedBudget = expected;
    quotation.customerRespondedAt = new Date();

    const adminSubtotal = Number(quotation.sourceQuotation?.subtotal || 0);
    quotation.adminApprovedAmount = adminSubtotal;

    const salesRep = await SalesRep.findOne({ uid: quotation.salesRepUid });

    if (expected >= adminSubtotal) {
      // ── Within sales rep's authority ──
      quotation.status = "negotiation_requested";
      await quotation.save();

      try {
        if (salesRep?.email) {
          await transporter.sendMail({
            from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
            to: salesRep.email,
            subject: `Negotiation Requested — #${quotation.quotationNumber}`,
            html: `
              <div style="font-family:Arial,sans-serif;padding:24px;background:#fff7ed">
                <h2 style="color:#c2410c">Customer Requested Negotiation</h2>
                <p style="color:#374151;font-size:14px"><strong>Quotation:</strong> #${quotation.quotationNumber}</p>
                <p style="color:#374151;font-size:14px"><strong>Customer:</strong> ${quotation.customer?.personalName || "—"}</p>
                <p style="color:#374151;font-size:14px"><strong>Current Total:</strong> ₹${Number(quotation.grandTotal).toFixed(2)}</p>
                <p style="color:#374151;font-size:14px"><strong>Customer Expected Total:</strong> ₹${expected.toFixed(2)}</p>
                <p style="color:#374151;font-size:14px;white-space:pre-line"><strong>Message:</strong><br/>${combinedMessage}</p>
                <p style="color:#374151;font-size:14px">This is within your pricing authority — no admin approval required. Please log in to the Sales Portal to respond.</p>
              </div>
            `,
          });
        }
      } catch (mailErr) {
        console.error("Negotiation email failed:", mailErr.message);
      }
    } else {
      // ── Below admin's minimum approved price — needs admin sign-off ──
      quotation.status = "awaiting_admin_approval";
      await quotation.save();

      const difference = adminSubtotal - expected;

      const approvalHtml = `
        <div style="font-family:Arial,sans-serif;padding:24px;background:#fef2f2">
          <h2 style="color:#b91c1c">Admin Approval Required</h2>
          <table style="font-size:14px;color:#374151;border-collapse:collapse">
            <tr><td style="padding:4px 12px 4px 0"><strong>Quotation Number</strong></td><td>#${quotation.quotationNumber}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><strong>Customer</strong></td><td>${quotation.customer?.personalName || "—"}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><strong>Sales Representative</strong></td><td>${salesRep?.name || quotation.salesRepUid}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><strong>Admin Approved Amount</strong></td><td>₹${adminSubtotal.toFixed(2)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><strong>Sales Quotation Amount</strong></td><td>₹${Number(quotation.grandTotal).toFixed(2)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><strong>Customer Requested Amount</strong></td><td>₹${expected.toFixed(2)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><strong>Difference</strong></td><td>₹${difference.toFixed(2)} below admin price</td></tr>
          </table>
          <p style="color:#374151;font-size:14px;white-space:pre-line;margin-top:12px"><strong>Customer Message:</strong><br/>${combinedMessage}</p>
        </div>
      `;

      try {
        const recipients = [salesRep?.email, ADMIN_EMAIL].filter(Boolean);
        if (recipients.length > 0) {
          await transporter.sendMail({
            from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
            to: recipients.join(","),
            subject: `Admin Approval Required — #${quotation.quotationNumber}`,
            html: approvalHtml,
          });
        }
      } catch (mailErr) {
        console.error("Admin approval notification failed:", mailErr.message);
      }
    }

    return res.json({ message: "Negotiation submitted", status: quotation.status });
  } catch (err) {
    console.error("Negotiate quotation error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /quotation/:publicToken/accept-counter ── (NO AUTH)
router.post("/quotation/:publicToken/accept-counter", async (req, res) => {
  try {
    const { publicToken } = req.params;

    const quotation = await SalesQuotation.findOne({ publicToken }).populate("customer");
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    if (quotation.status !== "counter_offered") {
      return res.status(400).json({
        message: `Cannot accept counter offer from status "${quotation.status}"`,
      });
    }

    if (quotation.counterOfferAmount == null || !Number.isFinite(Number(quotation.counterOfferAmount))) {
      return res.status(400).json({ message: "No valid counter offer found to accept" });
    }

    quotation.negotiatedAmount = quotation.counterOfferAmount;
    quotation.negotiatedAt = new Date();
    quotation.status = "accepted";
    quotation.acceptedAt = new Date();
    await quotation.save();

    try {
      const salesRep = await SalesRep.findOne({ uid: quotation.salesRepUid });
      if (salesRep?.email) {
        await transporter.sendMail({
          from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
          to: salesRep.email,
          subject: `Counter Offer Accepted — #${quotation.quotationNumber}`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px;background:#f0fdf4">
              <h2 style="color:#166534">Counter Offer Accepted ✅</h2>
              <p style="color:#374151;font-size:14px">
                <strong>${quotation.customer?.personalName || "Customer"}</strong> has accepted your
                counter offer of <strong>₹${Number(quotation.negotiatedAmount).toFixed(2)}</strong> for
                quotation <strong>#${quotation.quotationNumber}</strong>.
              </p>
              <p style="color:#374151;font-size:14px">Please log in to the Sales Portal to proceed.</p>
            </div>
          `,
        });
      }
    } catch (mailErr) {
      console.error("Accept-counter notification email failed:", mailErr.message);
    }

    return res.json({ message: "Counter offer accepted successfully", status: quotation.status });
  } catch (err) {
    console.error("Accept counter offer error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;