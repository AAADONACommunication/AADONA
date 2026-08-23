const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verifyToken = require("../middleware/verifyToken");
const transporter = require("../mailer");
const SalesQuotation = require("../models/SalesQuotation");
const SalesRep = require("../models/SalesRep");
const AdminQuotation = require("../models/AdminQuotation");

// ── GET /admin/sales-quotations/pending-approval ──
router.get(
  "/admin/sales-quotations/pending-approval",
  verifyToken,
  async (req, res) => {
    try {
      const quotations = await SalesQuotation.find({
        $or: [
          // Currently waiting for admin action
          { status: "awaiting_admin_approval" },

          // Admin directly approved customer pricing
          { adminApprovedAt: { $ne: null } },

          // Admin revised pricing
          {
            negotiationHistory: {
              $elemMatch: {
                revisedAt: { $ne: null },
              },
            },
          },

          // Admin rejected negotiation
          { adminRejectedAt: { $ne: null } },
        ],
      })
        .populate("customer")
        .populate("endCustomer")
        .populate("sourceQuotation")
        .sort({ updatedAt: -1 });

      return res.json(quotations);
    } catch (err) {
      console.error(
        "Get admin negotiation records error:",
        err.message
      );

      return res.status(500).json({
        error: err.message,
      });
    }
  }
);

// ── GET /admin/sales-quotations/pending-approval/count ──
router.get(
  "/admin/sales-quotations/pending-approval/count",
  verifyToken,
  async (req, res) => {
    try {
      const count = await SalesQuotation.countDocuments({
        status: "awaiting_admin_approval",
      });
      return res.json({ count });
    } catch (err) {
      console.error("Get pending negotiations count error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }
);

/* =========================================================
   ADMIN - Save/update the shared in-progress revise-pricing draft.
   Any admin opening this negotiation afterwards sees the same values.
   This NEVER sends anything - purely a saved state.
========================================================= */
router.put("/admin/sales-quotations/:id/draft", verifyToken, async (req, res) => {
  try {
    const { reviseItems, reviseRemarks } = req.body;

    const quotation = await SalesQuotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ message: "Negotiation not found" });

    quotation.adminReviseDraft = {
      reviseItems: Array.isArray(reviseItems) ? reviseItems : [],
      reviseRemarks: reviseRemarks || "",
      savedAt: new Date(),
    };
    await quotation.save();

    res.json({ ok: true });
  } catch (err) {
    console.error("Save negotiation draft error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /admin/sales-quotations/:id/approve ──
router.post("/admin/sales-quotations/:id/approve", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid quotation ID" });
    }

    const quotation = await SalesQuotation.findById(id).populate("customer").populate("endCustomer");
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    if (quotation.status !== "awaiting_admin_approval") {
      return res.status(400).json({ message: "Quotation is not awaiting admin approval" });
    }

    const target = Number(quotation.expectedBudget);
    if (!Number.isFinite(target) || target < 0) {
      return res.status(400).json({ message: "Invalid customer offer amount on this quotation" });
    }

    const subtotal = Number(quotation.subtotal) || 0;
    const oldDiscount = Number(quotation.discountAmount) || 0;
    const oldGst = Number(quotation.gstAmount) || 0;

    let newGst = oldGst;
    const totalBeforeDiscount = parseFloat((subtotal + newGst).toFixed(2));

    let newDiscount = totalBeforeDiscount - target;
    newDiscount = Math.max(newDiscount, oldDiscount, 0);
    newDiscount = Math.min(newDiscount, totalBeforeDiscount);

    let newGrandTotal = parseFloat((totalBeforeDiscount - newDiscount).toFixed(2));

    // Snap exactly to the customer's offer (kill paisa-level rounding drift)
    const drift = parseFloat((target - newGrandTotal).toFixed(2));
    if (Math.abs(drift) > 0) {
      newDiscount = parseFloat((newDiscount - drift).toFixed(2));
      newGrandTotal = target;
    }

    // Spread the extra discount proportionally across items - unitPrice & gst untouched
    const effectiveDiscountPercent =
      totalBeforeDiscount > 0
        ? Math.min((newDiscount / totalBeforeDiscount) * 100, 100)
        : 0;

    const revisedItems = quotation.items.map((item) => {
      const baseAmount =
        Number(item.quantity) * Number(item.unitPrice);

      // GST calculated fully on base amount
      const itemGst = parseFloat(
        (baseAmount * (Number(item.gst || 0) / 100)).toFixed(2)
      );

      // First: Base + GST
      const itemTotalBeforeDiscount = parseFloat(
        (baseAmount + itemGst).toFixed(2)
      );

      // Then: Discount on Base + GST
      const itemDiscountAmount = parseFloat(
        (
          itemTotalBeforeDiscount *
          (effectiveDiscountPercent / 100)
        ).toFixed(2)
      );

      const itemFinalTotal = parseFloat(
        (itemTotalBeforeDiscount - itemDiscountAmount).toFixed(2)
      );

      return {
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        gst: item.gst,
        discount: parseFloat(effectiveDiscountPercent.toFixed(4)),
        total: itemFinalTotal,
      };
    });

    // Ek hi audit entry - Approve As-Is seedha finalize karta hai, ye "revision" nahi hai
    quotation.negotiationHistory.push({
      type: "admin_approved",
      actor: "admin",
      eventAt: new Date(),
      expectedBudget: quotation.expectedBudget,
      customerMessage: quotation.customerMessage,
      customerRespondedAt: quotation.customerRespondedAt,
      adminRevisedItems: revisedItems.map((i) => ({
        name: i.name,
        description: i.description || "",
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        gst: i.gst,
        discount: i.discount,
        total: i.total,
      })),
      adminRevisedSubtotal: subtotal,
      adminRevisedDiscountAmount: parseFloat(newDiscount.toFixed(2)),
      adminRevisedGstAmount: newGst,
      revisedGrandTotal: newGrandTotal,
      revisedAt: new Date(),
      recordedAt: new Date(),
    });

    quotation.items = revisedItems;
    quotation.discountAmount = parseFloat(newDiscount.toFixed(2));
    quotation.gstAmount = newGst;
    quotation.grandTotal = newGrandTotal;
    quotation.status = "admin_revised";
    quotation.adminApprovedAt = new Date();
    quotation.adminApprovedAmount = newGrandTotal;
    quotation.pricingRevisionType = "discount_applied";
    quotation.adminReviseDraft = null; // resolved - clear the in-progress draft

    await quotation.save();

    try {
      const salesRep = await SalesRep.findOne({ uid: quotation.salesRepUid });
      if (salesRep?.email) {
        await transporter.sendMail({
          from: `"AADONA Admin" <${process.env.EMAIL_USER}>`,
          to: salesRep.email,
          subject: `Admin Approved - #${quotation.quotationNumber}`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px;background:#f0fdf4">
              <h2 style="color:#166534">Admin Approved the Discounted Price</h2>
              <p style="color:#374151;font-size:14px"><strong>Quotation:</strong> #${quotation.quotationNumber}</p>
              <p style="color:#374151;font-size:14px"><strong>Partner:</strong> ${quotation.customer?.personalName || "-"}</p>
              <p style="color:#374151;font-size:14px"><strong>End Customer:</strong> ${quotation.endCustomer?.endCustomerName || "-"}</p>
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

    const quotation = await SalesQuotation.findById(id).populate("customer").populate("endCustomer");
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    if (quotation.status !== "awaiting_admin_approval") {
      return res.status(400).json({ message: "Quotation is not awaiting admin approval" });
    }

    quotation.status = "admin_rejected_to_sales";
    quotation.adminRejectedAt = new Date();
    quotation.rejectedAt = null;
    const rejectedAt = new Date();

    quotation.status = "admin_rejected_to_sales";
    quotation.adminRejectedAt = rejectedAt;
    quotation.rejectedAt = null;

    quotation.negotiationHistory.push({
        type: "admin_rejected",
        actor: "admin",
        eventAt: rejectedAt,

        expectedBudget: quotation.expectedBudget,
        customerMessage: quotation.customerMessage,
        customerRespondedAt: quotation.customerRespondedAt,

        recordedAt: rejectedAt,
    });

    quotation.adminReviseDraft = null; // resolved - clear the in-progress draft

    await quotation.save();

    try {
      const salesRep = await SalesRep.findOne({ uid: quotation.salesRepUid });
      if (salesRep?.email) {
        await transporter.sendMail({
          from: `"AADONA Admin" <${process.env.EMAIL_USER}>`,
          to: salesRep.email,
          subject: `Customer Offer Rejected - Action Required #${quotation.quotationNumber}`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px;background:#fef2f2">
              <h2 style="color:#b91c1c">Admin Rejected the Discounted Price</h2>
              <p style="color:#374151;font-size:14px"><strong>Quotation:</strong> #${quotation.quotationNumber}</p>
              <p style="color:#374151;font-size:14px"><strong>Partner:</strong> ${quotation.customer?.personalName || "-"}</p>
              <p style="color:#374151;font-size:14px"><strong>End Customer:</strong> ${quotation.endCustomer?.endCustomerName || "-"}</p>
              <p style="color:#374151;font-size:14px"><strong>Customer Requested Amount:</strong> ₹${Number(quotation.expectedBudget).toFixed(2)}</p>
              <p style="color:#374151;font-size:14px">
                The quotation has been returned to your Sales Portal.
                You can edit the price or discount and resend it to the customer.
              </p>
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

// ── POST /admin/sales-quotations/:id/revise ──
router.post("/admin/sales-quotations/:id/revise", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid quotation ID" });
    }

    const { items, remarks, extendValidityDays } = req.body;

    const quotation = await SalesQuotation.findById(id)
      .populate("customer")
      .populate("endCustomer")
      .populate("sourceQuotation");
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    if (quotation.status !== "awaiting_admin_approval") {
      return res.status(400).json({ message: "Quotation is not awaiting admin approval" });
    }

    const adminQuotation = await AdminQuotation.findById(quotation.sourceQuotation._id);
    if (!adminQuotation) {
      return res.status(404).json({ message: "Source admin quotation not found" });
    }

    if (!items || !Array.isArray(items) || items.length !== adminQuotation.items.length) {
      return res.status(400).json({ message: "Items array must match the original admin quotation" });
    }

    const revisedItems = adminQuotation.items.map((existingItem, index) => {
      const incoming = items[index] || {};
      const unitPrice = Number(incoming.unitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(`Invalid revised price for item: ${existingItem.name}`);
      }
      const quantity = existingItem.quantity;
      const total = parseFloat((quantity * unitPrice).toFixed(2));

      return {
        name: existingItem.name,
        description: existingItem.description || "",
        quantity,
        unitPrice,
        gst: existingItem.gst,
        total,
      };
    });

    const revisedSubtotal = parseFloat(
      revisedItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)
    );

    const gstTotal = parseFloat(
      revisedItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice * (i.gst / 100)), 0).toFixed(2)
    );
    const revisedGrandTotalWithGst = parseFloat((revisedSubtotal + gstTotal).toFixed(2));

    adminQuotation.revisionHistory = adminQuotation.revisionHistory || [];
    adminQuotation.revisionHistory.push({
      items: adminQuotation.items,
      subtotal: adminQuotation.subtotal,
      gstAmount: adminQuotation.gstAmount,
      grandTotal: adminQuotation.grandTotal,
      remarks: adminQuotation.remarks,
      revisedAt: new Date(),
    });

    adminQuotation.items = revisedItems;
    adminQuotation.subtotal = revisedSubtotal;
    adminQuotation.gstAmount = gstTotal;
    adminQuotation.grandTotal = revisedGrandTotalWithGst; 
    if (remarks !== undefined) {
      adminQuotation.remarks = remarks.trim();
    }

    const ALLOWED_VALIDITY = [7, 15, 30, 45, 60, 90];
    if (extendValidityDays && ALLOWED_VALIDITY.includes(Number(extendValidityDays))) {
      const daysToAdd = Number(extendValidityDays);
      const baseDate = adminQuotation.validUntil || adminQuotation.validTill || new Date();
      const newValidUntil = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

      adminQuotation.validUntil = newValidUntil;
      adminQuotation.validTill = newValidUntil;
      quotation.validUntil = newValidUntil;
    }

    await adminQuotation.save();

    quotation.negotiationHistory.push({
      type: "admin_revision",
      actor: "admin",
      eventAt: new Date(),
      expectedBudget: quotation.expectedBudget,
      customerMessage: quotation.customerMessage,
      customerRespondedAt: quotation.customerRespondedAt,

      adminRevisedItems: revisedItems.map((i) => ({
        name: i.name,
        description: i.description || "",
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        gst: i.gst,
        discount: 0,
        total: i.total,
      })),

      adminRevisedSubtotal: revisedSubtotal,
      adminRevisedDiscountAmount: 0,
      adminRevisedGstAmount: gstTotal,
      revisedGrandTotal: revisedGrandTotalWithGst,
      revisedAt: new Date(),
      recordedAt: new Date(),
    });

    quotation.status = "admin_revised";
    quotation.adminApprovedAt = new Date();
    quotation.adminApprovedAmount = revisedGrandTotalWithGst;
    quotation.pricingRevisionType = "item_price_revised";
    quotation.adminReviseDraft = null; // resolved - clear the in-progress draft
    await quotation.save();

    try {
      const salesRep = await SalesRep.findOne({ uid: quotation.salesRepUid });
      if (salesRep?.email) {
        const itemRowsHtml = revisedItems.map((item, i) => {
          const itemGstAmt = parseFloat((item.quantity * item.unitPrice * (item.gst / 100)).toFixed(2));
          const itemTotalWithGst = parseFloat((item.total + itemGstAmt).toFixed(2));
          return `
            <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f0fdf4"}">
              <td style="padding:8px 10px;border:1px solid #e5e7eb;color:#374151">${item.name}</td>
              <td style="padding:8px 10px;border:1px solid #e5e7eb;color:#374151;text-align:center">${item.quantity}</td>
              <td style="padding:8px 10px;border:1px solid #e5e7eb;color:#374151;text-align:right">₹${item.unitPrice.toFixed(2)}</td>
              <td style="padding:8px 10px;border:1px solid #e5e7eb;color:#374151;text-align:right">${item.gst}%</td>
              <td style="padding:8px 10px;border:1px solid #e5e7eb;font-weight:600;color:#166534;text-align:right">₹${itemTotalWithGst.toFixed(2)}</td>
            </tr>
          `;
        }).join("");

        await transporter.sendMail({
          from: `"AADONA Admin" <${process.env.EMAIL_USER}>`,
          to: salesRep.email,
          subject: `Revised Pricing Ready - #${quotation.quotationNumber}`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px;background:#f0fdf4">
              <h2 style="color:#166534">Admin Has Revised the Pricing</h2>
              <p style="color:#374151;font-size:14px"><strong>Quotation:</strong> #${quotation.quotationNumber}</p>
              <p style="color:#374151;font-size:14px"><strong>Partner:</strong> ${quotation.customer?.personalName || "-"}</p>
              <p style="color:#374151;font-size:14px"><strong>End Customer:</strong> ${quotation.endCustomer?.endCustomerName || "-"}</p>
              <p style="color:#374151;font-size:14px"><strong>Customer Requested Amount:</strong> ₹${Number(quotation.expectedBudget).toFixed(2)}</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0">
                <thead>
                  <tr style="background:#166534">
                    <th style="padding:8px 10px;border:1px solid #166534;color:#fff;font-size:12px;text-align:left">Product</th>
                    <th style="padding:8px 10px;border:1px solid #166534;color:#fff;font-size:12px">Qty</th>
                    <th style="padding:8px 10px;border:1px solid #166534;color:#fff;font-size:12px;text-align:right">New Price</th>
                    <th style="padding:8px 10px;border:1px solid #166534;color:#fff;font-size:12px;text-align:right">GST</th>
                    <th style="padding:8px 10px;border:1px solid #166534;color:#fff;font-size:12px;text-align:right">Total</th>
                  </tr>
                </thead>
                <tbody>${itemRowsHtml}</tbody>
              </table>
              <p style="color:#374151;font-size:14px;text-align:right;margin:4px 0">Subtotal: ₹${revisedSubtotal.toFixed(2)}</p>
              <p style="color:#374151;font-size:14px;text-align:right;margin:4px 0">GST: ₹${gstTotal.toFixed(2)}</p>
              <p style="color:#166534;font-size:16px;font-weight:800;text-align:right">New Grand Total: ₹${revisedGrandTotalWithGst.toFixed(2)}</p>
              ${adminQuotation.remarks ? `<p style="color:#374151;font-size:14px"><strong>Admin Notes:</strong> ${adminQuotation.remarks}</p>` : ""}
              <p style="color:#374151;font-size:14px">Please log in to the Sales Portal, apply your discount, and resend the revised quotation to the customer.</p>
            </div>
          `,
        });
      }
    } catch (mailErr) {
      console.error("Revise notification email failed:", mailErr.message);
    }

    return res.json(quotation);
  } catch (err) {
    console.error("Revise quotation error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /admin/sales-quotations/:id/extend-validity ──
// Standalone: sirf validity extend karta hai, pricing/items ko touch nahi karta
router.post("/admin/sales-quotations/:id/extend-validity", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid quotation ID" });
    }

    const { extendByDays } = req.body;
    const ALLOWED_VALIDITY = [7, 15, 30, 45, 60, 90];
    if (!extendByDays || !ALLOWED_VALIDITY.includes(Number(extendByDays))) {
      return res.status(400).json({ message: "extendByDays must be one of 7, 15, 30, 45, 60, 90" });
    }

    const quotation = await SalesQuotation.findById(id).populate("sourceQuotation");
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    const adminQuotation = await AdminQuotation.findById(
      quotation.sourceQuotation?._id || quotation.sourceQuotation
    );
    if (!adminQuotation) {
      return res.status(404).json({ message: "Source admin quotation not found" });
    }

    const daysToAdd = Number(extendByDays);
    // purani validity se hi ADD karo - overwrite nahi
    const baseDate = adminQuotation.validUntil || adminQuotation.validTill || quotation.validUntil || new Date();
    const newValidUntil = new Date(new Date(baseDate).getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    adminQuotation.validUntil = newValidUntil;
    adminQuotation.validTill = newValidUntil;
    await adminQuotation.save();

    quotation.validUntil = newValidUntil;
    await quotation.save();

    return res.json({ message: "Validity extended successfully", validUntil: newValidUntil });
  } catch (err) {
    console.error("Extend validity error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;