const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verifyToken = require("../middleware/verifyToken");
const transporter = require("../mailer");
const SalesQuotation = require("../models/SalesQuotation");
const SalesRep = require("../models/SalesRep");

// ── GET /admin/sales-quotations/pending-approval ──
router.get("/admin/sales-quotations/pending-approval", verifyToken, async (req, res) => {
  try {
    const quotations = await SalesQuotation.find({ status: "awaiting_admin_approval" })
      .populate("customer")
      .populate("sourceQuotation")
      .sort({ customerRespondedAt: -1 });

    return res.json(quotations);
  } catch (err) {
    console.error("Get pending approvals error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /admin/sales-quotations/:id/approve ──
router.post("/admin/sales-quotations/:id/approve", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid quotation ID" });
    }

    const quotation = await SalesQuotation.findById(id).populate("customer");
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    if (quotation.status !== "awaiting_admin_approval") {
      return res.status(400).json({ message: "Quotation is not awaiting admin approval" });
    }

    quotation.status = "negotiation_requested";
    quotation.adminApprovedAt = new Date();
    await quotation.save();

    try {
      const salesRep = await SalesRep.findOne({ uid: quotation.salesRepUid });
      if (salesRep?.email) {
        await transporter.sendMail({
          from: `"AADONA Admin" <${process.env.EMAIL_USER}>`,
          to: salesRep.email,
          subject: `Admin Approved — #${quotation.quotationNumber}`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px;background:#f0fdf4">
              <h2 style="color:#166534">Admin Approved the Discounted Price</h2>
              <p style="color:#374151;font-size:14px"><strong>Quotation:</strong> #${quotation.quotationNumber}</p>
              <p style="color:#374151;font-size:14px"><strong>Customer:</strong> ${quotation.customer?.personalName || "—"}</p>
              <p style="color:#374151;font-size:14px"><strong>Approved Customer Amount:</strong> ₹${Number(quotation.expectedBudget).toFixed(2)}</p>
              <p style="color:#374151;font-size:14px">You can now proceed to finalize this with the customer.</p>
            </div>
          `,
        });
      }
    } catch (mailErr) {
      console.error("Approval notification email failed:", mailErr.message);
    }

    return res.json(quotation);
  } catch (err) {
    console.error("Approve quotation error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /admin/sales-quotations/:id/reject ──
router.post("/admin/sales-quotations/:id/reject", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid quotation ID" });
    }

    const quotation = await SalesQuotation.findById(id).populate("customer");
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    if (quotation.status !== "awaiting_admin_approval") {
      return res.status(400).json({ message: "Quotation is not awaiting admin approval" });
    }

    quotation.status = "rejected";
    quotation.adminRejectedAt = new Date();
    quotation.rejectedAt = new Date();
    await quotation.save();

    try {
      const salesRep = await SalesRep.findOne({ uid: quotation.salesRepUid });
      if (salesRep?.email) {
        await transporter.sendMail({
          from: `"AADONA Admin" <${process.env.EMAIL_USER}>`,
          to: salesRep.email,
          subject: `Admin Rejected — #${quotation.quotationNumber}`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px;background:#fef2f2">
              <h2 style="color:#b91c1c">Admin Rejected the Discounted Price</h2>
              <p style="color:#374151;font-size:14px"><strong>Quotation:</strong> #${quotation.quotationNumber}</p>
              <p style="color:#374151;font-size:14px"><strong>Customer:</strong> ${quotation.customer?.personalName || "—"}</p>
              <p style="color:#374151;font-size:14px"><strong>Customer Requested Amount:</strong> ₹${Number(quotation.expectedBudget).toFixed(2)}</p>
              <p style="color:#374151;font-size:14px">Please follow up with the customer regarding this rejection.</p>
            </div>
          `,
        });
      }
    } catch (mailErr) {
      console.error("Rejection notification email failed:", mailErr.message);
    }

    return res.json(quotation);
  } catch (err) {
    console.error("Reject quotation error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;