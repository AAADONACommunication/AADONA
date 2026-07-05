const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verifySalesToken = require("../middleware/verifySalesToken");
const transporter = require("../mailer");
const SalesQuotation = require("../models/SalesQuotation");
const AdminQuotation = require("../models/AdminQuotation");
const Customer = require("../models/Customer");
const crypto = require("crypto");

const FRONTEND_URL = process.env.FRONTEND_URL || "https://aadona.com";

// ── Generate unique quotation number ──
const generateQuotationNumber = async () => {
  const prefix = "AQ";
  const year = new Date().getFullYear();
  let quotationNumber;
  let exists = true;

  while (exists) {
    const random = Math.floor(100000 + Math.random() * 900000);
    quotationNumber = `${prefix}-${year}-${random}`;
    exists = await SalesQuotation.findOne({ quotationNumber });
  }

  return quotationNumber;
};

// ── POST /sales-quotations/send ──
router.post("/sales-quotations/send", verifySalesToken, async (req, res) => {
  try {
    const { sourceQuotation, items, notes, gstRate, discount } = req.body;

    // 1. Validate sourceQuotation
    if (!sourceQuotation || !mongoose.Types.ObjectId.isValid(sourceQuotation)) {
      return res.status(400).json({ message: "Invalid source quotation ID" });
    }

    // 2. Fetch AdminQuotation — quantity source of truth
    const adminQuotation = await AdminQuotation.findById(sourceQuotation);
    if (!adminQuotation) {
      return res.status(404).json({ message: "Source admin quotation not found" });
    }

    // 3. Ownership check
    if (adminQuotation.salesRepUid !== req.salesRep.uid) {
      return res.status(403).json({ message: "Access denied" });
    }

    // 4. Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items array is required and cannot be empty" });
    }

    if (items.length !== adminQuotation.items.length) {
      return res.status(400).json({ message: "Items mismatch with source quotation" });
    }

    // Prevent duplicate quotation
    const existingQuotation = await SalesQuotation.findOne({
    sourceQuotation: adminQuotation._id,
    });

    if (existingQuotation) {
    return res.status(400).json({
        message: "Quotation already sent to customer.",
    });
    }

    // ── Top-level GST / discount (quotation-wide, not per-item) ──
    const gstPercent = Number(gstRate);
    if (!Number.isFinite(gstPercent) || gstPercent < 0 || gstPercent > 100) {
      return res.status(400).json({ message: "Invalid GST rate" });
    }

    let discountType = "percent";
    let discountValue = 0;
    if (discount && Number.isFinite(Number(discount.value)) && Number(discount.value) > 0) {
      discountType = discount.type === "flat" ? "flat" : "percent";
      discountValue = Number(discount.value);
    }

    // 5. Fetch Customer
    const customer = await Customer.findById(adminQuotation.customer);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // 6. Build items — quantity ALWAYS from AdminQuotation, never trust frontend
    const rawItems = adminQuotation.items.map((adminItem, index) => {
      const incoming = items[index] || {};

      const unitPrice = Number(incoming.unitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(`Invalid unit price for item: ${adminItem.name}`);
      }

      // Sales price cannot be lower than admin price
      if (unitPrice < adminItem.unitPrice) {
        throw new Error(
          `Price for "${adminItem.name}" cannot be lower than admin price (₹${adminItem.unitPrice})`
        );
      }

      const quantity = adminItem.quantity; // LOCKED - never from frontend

      return {
        name: adminItem.name,
        description: adminItem.description || "",
        quantity,
        unitPrice,
        baseAmount: quantity * unitPrice,
      };
    });

    const rawSubtotal = rawItems.reduce((sum, i) => sum + i.baseAmount, 0);

    const effectiveDiscountPercent =
      rawSubtotal <= 0
        ? 0
        : discountType === "flat"
        ? Math.min((discountValue / rawSubtotal) * 100, 100)
        : Math.min(discountValue, 100);

    const calculatedItems = rawItems.map((item) => {
      const discountAmt = parseFloat((item.baseAmount * (effectiveDiscountPercent / 100)).toFixed(2));
      const taxableAmount = item.baseAmount - discountAmt;
      const gstAmt = parseFloat((taxableAmount * (gstPercent / 100)).toFixed(2));
      const total = parseFloat((taxableAmount + gstAmt).toFixed(2));

      return {
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        gst: gstPercent,
        discount: effectiveDiscountPercent,
        total,
      };
    });

    // 7. Calculate overall totals
    const subtotal = parseFloat(
      calculatedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2)
    );

    const discountAmount = parseFloat(
      calculatedItems
        .reduce((sum, item) => {
          const base = item.quantity * item.unitPrice;
          return sum + base * (item.discount / 100);
        }, 0)
        .toFixed(2)
    );

    const gstAmount = parseFloat(
      calculatedItems
        .reduce((sum, item) => {
          const base = item.quantity * item.unitPrice;
          const afterDiscount = base - base * (item.discount / 100);
          return sum + afterDiscount * (item.gst / 100);
        }, 0)
        .toFixed(2)
    );

    const grandTotal = parseFloat(
      calculatedItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)
    );

    // 8. Generate quotation number
    const quotationNumber = await generateQuotationNumber();

    const publicToken = crypto.randomBytes(32).toString("hex");

    // 8.5 Validate + compute reminder schedule (optional)
    const { reminderAfterDays } = req.body;
    let reminderAfterDaysValue = null;
    let reminderAt = null;

    if (reminderAfterDays !== undefined && reminderAfterDays !== null && reminderAfterDays !== "") {
      const days = Number(reminderAfterDays);
      if (![3, 7].includes(days)) {
        return res.status(400).json({ message: "reminderAfterDays must be 3 or 7" });
      }
      reminderAfterDaysValue = days;
      reminderAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    // 9. Save SalesQuotation
    const salesQuotation = await SalesQuotation.create({
      sourceQuotation: adminQuotation._id,
      customer: customer._id,
      salesRepUid: req.salesRep.uid,
      quotationNumber,
      publicToken,
      items: calculatedItems,
      subtotal,
      discountAmount,
      gstAmount,
      grandTotal,
      notes: notes?.trim() || "",
      status: "sent",
      sentAt: new Date(),
      reminderAfterDays: reminderAfterDaysValue,
      reminderAt,
    });

    // 10. Build email HTML
    const itemRowsHtml = calculatedItems.map((item, i) => `
      <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f0fdf4"}">
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151">
          ${item.name}
          ${item.description ? `<br/><span style="font-size:12px;color:#6b7280">${item.description}</span>` : ""}
        </td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;text-align:center">
          ${item.quantity}
        </td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;text-align:right">
          ₹${item.unitPrice.toFixed(2)}
        </td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;text-align:right">
          ${item.gst}%
        </td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;text-align:right">
          ${item.discount}%
        </td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;color:#166534;text-align:right">
          ₹${item.total.toFixed(2)}
        </td>
      </tr>
    `).join("");

    const viewQuotationUrl = `${FRONTEND_URL}/quotation/${publicToken}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"/></head>
      <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0">
          <tr><td align="center">
            <table width="650" cellpadding="0" cellspacing="0" 
              style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#166534,#16a34a);padding:32px;text-align:center">
                  <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800">AADONA Communication</h1>
                  <p style="color:#bbf7d0;margin:6px 0 0;font-size:13px">Your Quotation</p>
                </td>
              </tr>

              <!-- Info -->
              <tr>
                <td style="padding:28px 32px 0">
                  <h2 style="color:#166534;font-size:18px;margin:0 0 16px">
                    Quotation #${quotationNumber}
                  </h2>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px">Customer</td>
                      <td style="padding:4px 0;color:#111827;font-weight:600;font-size:13px">
                        ${customer.personalName}
                      </td>
                    </tr>
                    ${customer.companyName ? `
                    <tr>
                      <td style="padding:4px 0;color:#6b7280;font-size:13px">Company</td>
                      <td style="padding:4px 0;color:#111827;font-weight:600;font-size:13px">
                        ${customer.companyName}
                      </td>
                    </tr>` : ""}
                    <tr>
                      <td style="padding:4px 0;color:#6b7280;font-size:13px">Date</td>
                      <td style="padding:4px 0;color:#111827;font-weight:600;font-size:13px">
                        ${new Date().toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Product Table -->
              <tr>
                <td style="padding:24px 32px 0">
                  <table width="100%" cellpadding="0" cellspacing="0" 
                    style="border-collapse:collapse;border-radius:8px;overflow:hidden">
                    <thead>
                      <tr style="background:#166534">
                        <th style="padding:10px 12px;border:1px solid #166534;color:#fff;text-align:left;font-size:13px">Product</th>
                        <th style="padding:10px 12px;border:1px solid #166534;color:#fff;text-align:center;font-size:13px">Qty</th>
                        <th style="padding:10px 12px;border:1px solid #166534;color:#fff;text-align:right;font-size:13px">Unit Price</th>
                        <th style="padding:10px 12px;border:1px solid #166534;color:#fff;text-align:right;font-size:13px">GST</th>
                        <th style="padding:10px 12px;border:1px solid #166534;color:#fff;text-align:right;font-size:13px">Discount</th>
                        <th style="padding:10px 12px;border:1px solid #166534;color:#fff;text-align:right;font-size:13px">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemRowsHtml}
                    </tbody>
                  </table>
                </td>
              </tr>

              <!-- Totals -->
              <tr>
                <td style="padding:16px 32px 0">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="text-align:right;padding:4px 0;color:#6b7280;font-size:13px">Subtotal</td>
                      <td style="text-align:right;padding:4px 0 4px 24px;color:#111827;font-size:13px;width:120px">
                        ₹${subtotal.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td style="text-align:right;padding:4px 0;color:#6b7280;font-size:13px">Discount</td>
                      <td style="text-align:right;padding:4px 0;color:#dc2626;font-size:13px">
                        − ₹${discountAmount.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td style="text-align:right;padding:4px 0;color:#6b7280;font-size:13px">GST</td>
                      <td style="text-align:right;padding:4px 0;color:#111827;font-size:13px">
                        ₹${gstAmount.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2"><hr style="border:none;border-top:2px solid #e5e7eb;margin:8px 0"/></td>
                    </tr>
                    <tr>
                      <td style="text-align:right;padding:4px 0;color:#166534;font-weight:800;font-size:16px">Grand Total</td>
                      <td style="text-align:right;padding:4px 0;color:#166534;font-weight:800;font-size:16px">
                        ₹${grandTotal.toFixed(2)}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              ${notes && notes.trim() ? `
              <tr>
                <td style="padding:20px 32px 0">
                  <div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:8px;padding:14px 16px">
                    <p style="margin:0;font-size:13px;font-weight:600;color:#166534;margin-bottom:4px">Notes</p>
                    <p style="margin:0;font-size:13px;color:#374151">${notes.trim()}</p>
                  </div>
                </td>
              </tr>` : ""}

              <!-- View Quotation Button -->
              <tr>
                <td style="padding:28px 32px 0;text-align:center">
                  <a href="${viewQuotationUrl}"
                    style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;
                    font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px">
                    View Quotation
                  </a>
                  <p style="color:#9ca3af;font-size:11px;margin:12px 0 0">
                    You can review the full details and respond directly from this page.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:28px 32px;text-align:center">
                  <p style="color:#374151;font-size:14px;margin:0 0 4px">Regards,</p>
                  <p style="color:#166534;font-weight:700;font-size:15px;margin:0">AADONA</p>
                </td>
              </tr>

            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;

    // 11. Send email to customer
    try {
        await transporter.sendMail({
            from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
            to: customer.email,
            subject: `Quotation #${quotationNumber} — AADONA Communication`,
            html: emailHtml,
        });
    } catch (err) {
        console.error("Customer quotation email failed:", err.message);
    }

    return res.status(201).json(salesQuotation);
  } catch (err) {
    console.error("Send sales quotation error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /sales-quotations ──
router.get("/sales-quotations", verifySalesToken, async (req, res) => {
  try {
    const quotations = await SalesQuotation.find({ salesRepUid: req.salesRep.uid })
      .populate("customer")
      .populate("sourceQuotation")
      .sort({ createdAt: -1 });

    return res.json(quotations);
  } catch (err) {
    console.error("Get sales quotations error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /sales-quotations/:id ──
router.get("/sales-quotations/:id", verifySalesToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid quotation ID" });
    }

    const quotation = await SalesQuotation.findById(req.params.id)
      .populate("customer")
      .populate("sourceQuotation");

    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    if (quotation.salesRepUid !== req.salesRep.uid) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.json(quotation);
  } catch (err) {
    console.error("Get sales quotation by id error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /sales-quotations/:id/accept-negotiation ──
router.post("/sales-quotations/:id/accept-negotiation", verifySalesToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid quotation ID" });
    }

    const quotation = await SalesQuotation.findById(id).populate("customer");
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    if (quotation.salesRepUid !== req.salesRep.uid) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (quotation.status !== "negotiation_requested") {
      return res.status(400).json({
        message: `Cannot accept negotiation from status "${quotation.status}"`,
      });
    }

    if (quotation.expectedBudget == null || !Number.isFinite(Number(quotation.expectedBudget))) {
      return res.status(400).json({ message: "No valid customer offer found to accept" });
    }

    // grandTotal is left untouched — it remains the audit trail of the original quotation.
    quotation.negotiatedAmount = quotation.expectedBudget;
    quotation.negotiatedAt = new Date();
    quotation.status = "accepted";
    quotation.acceptedAt = new Date();
    await quotation.save();

    try {
      if (quotation.customer?.email) {
        await transporter.sendMail({
          from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
          to: quotation.customer.email,
          subject: `Your Offer Has Been Accepted — #${quotation.quotationNumber}`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px;background:#f0fdf4">
              <h2 style="color:#166534">Your Offer Was Accepted ✅</h2>
              <p style="color:#374151;font-size:14px">
                Good news — your offer of <strong>₹${Number(quotation.negotiatedAmount).toFixed(2)}</strong>
                for quotation <strong>#${quotation.quotationNumber}</strong> has been accepted.
              </p>
              <p style="color:#374151;font-size:14px">Our team will reach out to you shortly with next steps.</p>
            </div>
          `,
        });
      }
    } catch (mailErr) {
      console.error("Accept-negotiation customer email failed:", mailErr.message);
    }

    return res.json({ message: "Customer offer accepted", quotation });
  } catch (err) {
    console.error("Accept negotiation error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /sales-quotations/:id/counter-offer ──
router.post("/sales-quotations/:id/counter-offer", verifySalesToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid quotation ID" });
    }

    const { counterOfferAmount, counterOfferMessage } = req.body;

    if (counterOfferAmount === undefined || counterOfferAmount === null || counterOfferAmount === "") {
      return res.status(400).json({ message: "Counter offer amount is required" });
    }
    const amount = Number(counterOfferAmount);
    if (!Number.isFinite(amount) || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Counter offer amount must be a valid number greater than 0" });
    }

    const quotation = await SalesQuotation.findById(id).populate("customer");
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    if (quotation.salesRepUid !== req.salesRep.uid) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!["negotiation_requested", "counter_offered"].includes(quotation.status)) {
      return res.status(400).json({
        message: `Cannot send counter offer from status "${quotation.status}"`,
      });
    }

    quotation.counterOfferAmount = amount;
    quotation.counterOfferMessage = (counterOfferMessage || "").trim();
    quotation.counterOfferAt = new Date();
    quotation.status = "counter_offered";
    await quotation.save();

    const viewQuotationUrl = `${FRONTEND_URL}/quotation/${quotation.publicToken}`;

    try {
      if (quotation.customer?.email) {
        await transporter.sendMail({
          from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
          to: quotation.customer.email,
          subject: `Counter Offer — Quotation #${quotation.quotationNumber}`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px;background:#fff7ed">
              <h2 style="color:#c2410c">We've Sent You a Counter Offer</h2>
              <p style="color:#374151;font-size:14px">
                For quotation <strong>#${quotation.quotationNumber}</strong>, our sales team has proposed
                a counter offer of <strong>₹${amount.toFixed(2)}</strong>.
              </p>
              ${quotation.counterOfferMessage ? `
              <p style="color:#374151;font-size:14px;white-space:pre-line">
                <strong>Message:</strong><br/>${quotation.counterOfferMessage}
              </p>` : ""}
              <div style="text-align:center;margin-top:20px">
                <a href="${viewQuotationUrl}"
                  style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;
                  font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px">
                  View Counter Offer
                </a>
              </div>
            </div>
          `,
        });
      }
    } catch (mailErr) {
      console.error("Counter-offer email failed:", mailErr.message);
    }

    return res.json({ message: "Counter offer sent", quotation });
  } catch (err) {
    console.error("Counter offer error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;