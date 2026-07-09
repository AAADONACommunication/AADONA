const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verifyToken = require("../middleware/verifyToken");
const transporter = require("../mailer");
const SalesQuotation = require("../models/SalesQuotation");
const SalesRep = require("../models/SalesRep");
const AdminQuotation = require("../models/AdminQuotation");

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

    const target = Number(quotation.expectedBudget);
    if (!Number.isFinite(target) || target < 0) {
      return res.status(400).json({ message: "Invalid customer offer amount on this quotation" });
    }

    const subtotal = Number(quotation.subtotal) || 0;
    const oldDiscount = Number(quotation.discountAmount) || 0;
    const oldGst = Number(quotation.gstAmount) || 0;

    const gstRate = subtotal > 0 ? oldGst / subtotal : 0;

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

    // Spread the extra discount proportionally across items — unitPrice & gst untouched
    const extraDiscount = parseFloat((newDiscount - oldDiscount).toFixed(2));
    const revisedItems = quotation.items.map((item) => {
      const share = subtotal > 0 ? item.total / subtotal : 0;
      const itemExtraDiscount = parseFloat((extraDiscount * share).toFixed(2));
      return {
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice, // unchanged
        gst: item.gst, // unchanged
        discount: parseFloat((Number(item.discount || 0) + itemExtraDiscount).toFixed(2)),
        total: item.total,
      };
    });

    // Snapshot before overwrite (audit trail)
    quotation.negotiationHistory.push({
      expectedBudget: quotation.expectedBudget,
      customerMessage: quotation.customerMessage,
      customerRespondedAt: quotation.customerRespondedAt,
      adminRevisedItems: quotation.items.map((i) => ({
        name: i.name,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.total,
      })),
      adminRevisedSubtotal: subtotal,
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

// ── POST /admin/sales-quotations/:id/revise ──
router.post("/admin/sales-quotations/:id/revise", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid quotation ID" });
    }

    const { items, remarks } = req.body;

    const quotation = await SalesQuotation.findById(id)
      .populate("customer")
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
        total,
      };
    });

    const revisedSubtotal = parseFloat(
      revisedItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)
    );

    adminQuotation.revisionHistory = adminQuotation.revisionHistory || [];
    adminQuotation.revisionHistory.push({
      items: adminQuotation.items,
      subtotal: adminQuotation.subtotal,
      remarks: adminQuotation.remarks,
      revisedAt: new Date(),
    });

    adminQuotation.items = revisedItems;
    adminQuotation.subtotal = revisedSubtotal;
    if (remarks !== undefined) {
      adminQuotation.remarks = remarks.trim();
    }
    await adminQuotation.save();

    quotation.status = "admin_revised";
    quotation.adminApprovedAt = new Date();
    quotation.adminApprovedAmount = revisedSubtotal;
    quotation.pricingRevisionType = "item_price_revised";
    await quotation.save();

    try {
      const salesRep = await SalesRep.findOne({ uid: quotation.salesRepUid });
      if (salesRep?.email) {
        const itemRowsHtml = revisedItems.map((item, i) => `
          <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f0fdf4"}">
            <td style="padding:8px 10px;border:1px solid #e5e7eb;color:#374151">${item.name}</td>
            <td style="padding:8px 10px;border:1px solid #e5e7eb;color:#374151;text-align:center">${item.quantity}</td>
            <td style="padding:8px 10px;border:1px solid #e5e7eb;color:#374151;text-align:right">₹${item.unitPrice.toFixed(2)}</td>
            <td style="padding:8px 10px;border:1px solid #e5e7eb;font-weight:600;color:#166534;text-align:right">₹${item.total.toFixed(2)}</td>
          </tr>
        `).join("");

        await transporter.sendMail({
          from: `"AADONA Admin" <${process.env.EMAIL_USER}>`,
          to: salesRep.email,
          subject: `Revised Pricing Ready — #${quotation.quotationNumber}`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px;background:#f0fdf4">
              <h2 style="color:#166534">Admin Has Revised the Pricing</h2>
              <p style="color:#374151;font-size:14px"><strong>Quotation:</strong> #${quotation.quotationNumber}</p>
              <p style="color:#374151;font-size:14px"><strong>Customer:</strong> ${quotation.customer?.personalName || "—"}</p>
              <p style="color:#374151;font-size:14px"><strong>Customer Requested Amount:</strong> ₹${Number(quotation.expectedBudget).toFixed(2)}</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0">
                <thead>
                  <tr style="background:#166534">
                    <th style="padding:8px 10px;border:1px solid #166534;color:#fff;font-size:12px;text-align:left">Product</th>
                    <th style="padding:8px 10px;border:1px solid #166534;color:#fff;font-size:12px">Qty</th>
                    <th style="padding:8px 10px;border:1px solid #166534;color:#fff;font-size:12px;text-align:right">New Price</th>
                    <th style="padding:8px 10px;border:1px solid #166534;color:#fff;font-size:12px;text-align:right">Total</th>
                  </tr>
                </thead>
                <tbody>${itemRowsHtml}</tbody>
              </table>
              <p style="color:#166534;font-size:16px;font-weight:800;text-align:right">New Subtotal: ₹${revisedSubtotal.toFixed(2)}</p>
              ${adminQuotation.remarks ? `<p style="color:#374151;font-size:14px"><strong>Admin Notes:</strong> ${adminQuotation.remarks}</p>` : ""}
              <p style="color:#374151;font-size:14px">Please log in to the Sales Portal, apply your GST/discount, and resend the revised quotation to the customer.</p>
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

module.exports = router;