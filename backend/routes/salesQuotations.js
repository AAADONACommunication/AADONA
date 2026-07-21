const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verifySalesToken = require("../middleware/verifySalesToken");
const transporter = require("../mailer");
const SalesQuotation = require("../models/SalesQuotation");
const AdminQuotation = require("../models/AdminQuotation");
const Customer = require("../models/Customer");
const EndCustomer = require("../models/EndCustomer");
const SalesRep = require("../models/SalesRep");
const crypto = require("crypto");

const FRONTEND_URL = process.env.FRONTEND_URL || "https://aadona.com";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const generateQuotationPdf = require("../utils/generateQuotationPdf");

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

    // 5.5 Fetch End Customer (optional — old requests may not have one)
    const endCustomerDoc = adminQuotation.endCustomer
      ? await EndCustomer.findById(adminQuotation.endCustomer)
      : null;

    // 5.6 Fetch Sales Rep — shown to the Partner as their point of contact
    const salesRepForEmail = await SalesRep.findOne({ uid: req.salesRep.uid });

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
    const gstOnSubtotal = rawSubtotal * (gstPercent / 100);
    const totalBeforeDiscount = rawSubtotal + gstOnSubtotal;

    const effectiveDiscountPercent =
      totalBeforeDiscount <= 0
        ? 0
        : discountType === "flat"
        ? Math.min((discountValue / totalBeforeDiscount) * 100, 100)
        : Math.min(discountValue, 100);

    const calculatedItems = rawItems.map((item) => {
      const itemGst = parseFloat((item.baseAmount * (gstPercent / 100)).toFixed(2));
      const itemTotalBeforeDiscount = item.baseAmount + itemGst;
      const itemDiscount = parseFloat((itemTotalBeforeDiscount * (effectiveDiscountPercent / 100)).toFixed(2));
      const total = parseFloat((itemTotalBeforeDiscount - itemDiscount).toFixed(2));

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
    const subtotal = parseFloat(rawSubtotal.toFixed(2));
    const gstAmount = parseFloat(gstOnSubtotal.toFixed(2));
    const discountAmount = parseFloat(
      calculatedItems.reduce((sum, item, i) => {
        const itemTotalBeforeDiscount = rawItems[i].baseAmount + (rawItems[i].baseAmount * gstPercent) / 100;
        return sum + itemTotalBeforeDiscount * (item.discount / 100);
      }, 0).toFixed(2)
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
    const initialSentAt = new Date();
    const salesQuotation = await SalesQuotation.create({
      sourceQuotation: adminQuotation._id,
      customer: customer._id,
      endCustomer: adminQuotation.endCustomer || null, // carried over from AdminQuotation, may be null for old records
      salesRepUid: req.salesRep.uid,
      quotationNumber,
      publicToken,

      items: calculatedItems,
      subtotal,
      discountAmount,
      gstAmount,
      grandTotal,

      originalSnapshot: {
        items: calculatedItems.map((i) => ({
          name: i.name,
          description: i.description || "",
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          gst: i.gst,
          discount: i.discount,
          total: i.total,
        })),
        subtotal,
        discountAmount,
        gstAmount,
        grandTotal,
        sentAt: initialSentAt,
      },

      notes: notes?.trim() || "",
      status: "sent",
      sentAt: initialSentAt,
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

              <!-- Sales Contact -->
              <tr>
                <td style="padding:20px 32px 0">
                  <div style="background:#f9fafb;border-left:4px solid #16a34a;border-radius:8px;padding:14px 16px">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.5px">Your Sales Contact</p>
                    <p style="margin:0;font-size:13px;color:#374151">${salesRepForEmail?.name || "AADONA Sales Team"}</p>
                    ${salesRepForEmail?.phone ? `<p style="margin:2px 0 0;font-size:13px;color:#374151"> ${salesRepForEmail.phone}</p>` : ""}
                    ${salesRepForEmail?.email ? `<p style="margin:2px 0 0;font-size:13px;color:#374151"> ${salesRepForEmail.email}</p>` : ""}
                  </div>
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
      .populate("customer").populate("endCustomer")
      .populate("sourceQuotation")
      .sort({ createdAt: -1 });

    return res.json(quotations);
  } catch (err) {
    console.error("Get sales quotations error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /sales-quotations/:id ─
router.get("/sales-quotations/:id", verifySalesToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid quotation ID" });
    }

    const quotation = await SalesQuotation.findById(req.params.id)
      .populate("customer").populate("endCustomer")
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

    const quotation = await SalesQuotation.findById(id).populate("customer").populate("endCustomer");
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

    // ── Notify customer, sales rep, and admin — all get the final quotation as a PDF ──
    try {
      const salesRep = await SalesRep.findOne({ uid: req.salesRep.uid });

      const makeAttachment = async (copyLabel) => [
        {
          filename: `Quotation-${quotation.quotationNumber}.pdf`,
          content: await generateQuotationPdf(quotation, {
            finalAmount: quotation.negotiatedAmount,
            salesRep,
            copyLabel,
          }),
          contentType: "application/pdf",
        },
      ];

      const partnerAttachments = await makeAttachment("Partner's Copy");
      const salesAttachments = await makeAttachment("Sales Copy");
      const adminAttachments = await makeAttachment("AADONA Copy");

      const itemRowsHtml = quotation.items.map((item, i) => `
        <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f0fdf4"}">
          <td style="padding:8px 10px;border:1px solid #e5e7eb;color:#374151">${item.name}</td>
          <td style="padding:8px 10px;border:1px solid #e5e7eb;color:#374151;text-align:center">${item.quantity}</td>
          <td style="padding:8px 10px;border:1px solid #e5e7eb;color:#374151;text-align:right">₹${Number(item.unitPrice).toFixed(2)}</td>
          <td style="padding:8px 10px;border:1px solid #e5e7eb;color:#374151;text-align:right">${item.gst}%</td>
          <td style="padding:8px 10px;border:1px solid #e5e7eb;color:#374151;text-align:right">${item.discount}%</td>
          <td style="padding:8px 10px;border:1px solid #e5e7eb;font-weight:600;color:#166534;text-align:right">₹${Number(item.total).toFixed(2)}</td>
        </tr>
      `).join("");

      const reportHtml = `
        <div style="font-family:Arial,sans-serif;padding:24px;background:#f0fdf4">
          <h2 style="color:#166534">Negotiated Offer Accepted </h2>
          <p style="color:#374151;font-size:14px"><strong>Sales Representative:</strong> ${salesRep?.name || quotation.salesRepUid}</p>
          <p style="color:#374151;font-size:14px"><strong>Partner:</strong> ${quotation.customer?.personalName || "—"}</p>
          <p style="color:#374151;font-size:14px"><strong>End Customer:</strong> ${quotation.endCustomer?.endCustomerName || "—"}</p>
          <p style="color:#374151;font-size:14px"><strong>Original Quotation Total:</strong> ₹${Number(quotation.grandTotal).toFixed(2)}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0">
            <thead>
              <tr style="background:#166534">
                <th style="padding:8px 10px;border:1px solid #166534;color:#fff;font-size:12px;text-align:left">Product</th>
                <th style="padding:8px 10px;border:1px solid #166534;color:#fff;font-size:12px">Qty</th>
                <th style="padding:8px 10px;border:1px solid #166534;color:#fff;font-size:12px;text-align:right">Unit Price</th>
                <th style="padding:8px 10px;border:1px solid #166534;color:#fff;font-size:12px;text-align:right">GST</th>
                <th style="padding:8px 10px;border:1px solid #166534;color:#fff;font-size:12px;text-align:right">Discount</th>
                <th style="padding:8px 10px;border:1px solid #166534;color:#fff;font-size:12px;text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>${itemRowsHtml}</tbody>
          </table>
          <p style="color:#166534;font-size:16px;font-weight:800;text-align:right">
            Final Accepted Amount: ₹${Number(quotation.negotiatedAmount).toFixed(2)}
          </p>
        </div>
      `;

      if (quotation.customer?.email) {
        await transporter.sendMail({
          from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
          to: quotation.customer.email,
          subject: `Your Offer Has Been Accepted — #${quotation.quotationNumber}`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px;background:#f0fdf4">
              <h2 style="color:#166534">Your Offer Was Accepted </h2>
              <p style="color:#374151;font-size:14px">
                Good news — your offer of <strong>₹${Number(quotation.negotiatedAmount).toFixed(2)}</strong>
                for quotation <strong>#${quotation.quotationNumber}</strong> has been accepted.
              </p>
              <p style="color:#374151;font-size:14px">The final quotation is attached as a PDF. Our team will reach out to you shortly.</p>
              <div style="margin-top:20px;padding:14px 16px;background:#ffffff;border-radius:8px;border-left:4px solid #16a34a">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.5px">Your Sales Contact</p>
                <p style="margin:0;font-size:13px;color:#374151">${salesRep?.name || "AADONA Sales Team"}</p>
                ${salesRep?.phone ? `<p style="margin:2px 0 0;font-size:13px;color:#374151"> ${salesRep.phone}</p>` : ""}
                ${salesRep?.email ? `<p style="margin:2px 0 0;font-size:13px;color:#374151"> ${salesRep.email}</p>` : ""}
              </div>
            </div>
          `,
          attachments: partnerAttachments,
        });
      }

      if (salesRep?.email) {
        await transporter.sendMail({
          from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
          to: salesRep.email,
          subject: `Negotiated Offer Accepted — #${quotation.quotationNumber}`,
          html: reportHtml,
          attachments: salesAttachments,
        });
      }

      if (ADMIN_EMAIL) {
        await transporter.sendMail({
          from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
          to: ADMIN_EMAIL,
          subject: `Negotiated Offer Accepted — #${quotation.quotationNumber}`,
          html: reportHtml,
          attachments: adminAttachments,
        });
      }
    } catch (mailErr) {
      console.error("Accept-negotiation notification email failed:", mailErr.message);
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

    const { items, gstRate, discount, counterOfferMessage } = req.body;

    const quotation = await SalesQuotation.findById(id).populate("customer").populate("endCustomer");
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

    // ── Validate items — same shape/order as the original quotation, quantity LOCKED ──
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items array is required and cannot be empty" });
    }
    if (items.length !== quotation.items.length) {
      return res.status(400).json({ message: "Items mismatch with original quotation" });
    }

    // ── Validate GST + discount (same rules as /sales-quotations/send) ──
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

    // ── Build items — quantity/name/description LOCKED from the original quotation ──
    const rawItems = quotation.items.map((originalItem, index) => {
      const incoming = items[index] || {};
      const unitPrice = Number(incoming.unitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        throw new Error(`Invalid unit price for item: ${originalItem.name}`);
      }
      const quantity = originalItem.quantity;
      const baseAmount = quantity * unitPrice;
      const gstAmt = parseFloat((baseAmount * (gstPercent / 100)).toFixed(2));
      const totalWithGst = parseFloat((baseAmount + gstAmt).toFixed(2));

      return { name: originalItem.name, description: originalItem.description || "", quantity, unitPrice, baseAmount, gstAmt, totalWithGst };
    });

    // discount is now a % (or flat) of the (base + GST) total, not the base alone
    const rawTotalWithGst = rawItems.reduce((sum, i) => sum + i.totalWithGst, 0);

    const effectiveDiscountPercent =
      rawTotalWithGst <= 0
        ? 0
        : discountType === "flat"
        ? Math.min((discountValue / rawTotalWithGst) * 100, 100)
        : Math.min(discountValue, 100);

    const calculatedItems = rawItems.map((item) => {
      const discountAmt = parseFloat((item.totalWithGst * (effectiveDiscountPercent / 100)).toFixed(2));
      const total = parseFloat((item.totalWithGst - discountAmt).toFixed(2));

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

    const subtotal = parseFloat(
      calculatedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2)
    );

    const gstAmount = parseFloat(
      rawItems.reduce((sum, item) => sum + item.gstAmt, 0).toFixed(2)
    );

    const discountAmount = parseFloat(
      ((subtotal + gstAmount) * (effectiveDiscountPercent / 100)).toFixed(2)
    );

    const grandTotal = parseFloat((subtotal + gstAmount - discountAmount).toFixed(2));

    quotation.counterOfferItems = calculatedItems;
    quotation.counterOfferSubtotal = subtotal;
    quotation.counterOfferDiscountAmount = discountAmount;
    quotation.counterOfferGstAmount = gstAmount;
    quotation.counterOfferAmount = grandTotal;
    quotation.counterOfferMessage = (counterOfferMessage || "").trim();
    quotation.counterOfferAt = new Date();
    quotation.status = "counter_offered";
    await quotation.save();

    const salesRepForEmail = await SalesRep.findOne({ uid: req.salesRep.uid });

    const viewQuotationUrl = `${FRONTEND_URL}/quotation/${quotation.publicToken}`;

    const itemRowsHtml = calculatedItems.map((item, i) => `
      <tr style="background:${i % 2 === 0 ? "#ffffff" : "#fff7ed"}">
        <td style="padding:8px 10px;border:1px solid #fed7aa;color:#374151;font-size:13px">${item.name}</td>
        <td style="padding:8px 10px;border:1px solid #fed7aa;color:#374151;font-size:13px;text-align:center">${item.quantity}</td>
        <td style="padding:8px 10px;border:1px solid #fed7aa;color:#374151;font-size:13px;text-align:right">₹${item.unitPrice.toFixed(2)}</td>
        <td style="padding:8px 10px;border:1px solid #fed7aa;color:#374151;font-size:13px;text-align:right">${item.gst}%</td>
        <td style="padding:8px 10px;border:1px solid #fed7aa;color:#374151;font-size:13px;text-align:right">${item.discount}%</td>
        <td style="padding:8px 10px;border:1px solid #fed7aa;font-weight:600;color:#c2410c;font-size:13px;text-align:right">₹${item.total.toFixed(2)}</td>
      </tr>
    `).join("");

    try {
      if (quotation.customer?.email) {
        await transporter.sendMail({
          from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
          to: quotation.customer.email,
          subject: `Counter Offer — Quotation #${quotation.quotationNumber}`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px;background:#fff7ed">
              <h2 style="color:#c2410c;margin:0 0 16px">We've Sent You a Counter Offer</h2>
              <p style="color:#374151;font-size:14px;margin:0 0 16px">
                Quotation <strong>#${quotation.quotationNumber}</strong> — revised pricing below.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px">
                <thead>
                  <tr style="background:#ea580c">
                    <th style="padding:8px 10px;border:1px solid #ea580c;color:#fff;font-size:12px;text-align:left">Product</th>
                    <th style="padding:8px 10px;border:1px solid #ea580c;color:#fff;font-size:12px">Qty</th>
                    <th style="padding:8px 10px;border:1px solid #ea580c;color:#fff;font-size:12px;text-align:right">Unit Price</th>
                    <th style="padding:8px 10px;border:1px solid #ea580c;color:#fff;font-size:12px;text-align:right">GST</th>
                    <th style="padding:8px 10px;border:1px solid #ea580c;color:#fff;font-size:12px;text-align:right">Discount</th>
                    <th style="padding:8px 10px;border:1px solid #ea580c;color:#fff;font-size:12px;text-align:right">Total</th>
                  </tr>
                </thead>
                <tbody>${itemRowsHtml}</tbody>
              </table>
              <p style="color:#c2410c;font-size:16px;font-weight:800;text-align:right;margin:0 0 16px">
                Grand Total: ₹${grandTotal.toFixed(2)}
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
              <div style="margin-top:20px;padding:14px 16px;background:#ffffff;border-radius:8px;border-left:4px solid #ea580c">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#c2410c;text-transform:uppercase;letter-spacing:0.5px">Your Sales Contact</p>
                <p style="margin:0;font-size:13px;color:#374151">${salesRepForEmail?.name || "AADONA Sales Team"}</p>
                ${salesRepForEmail?.phone ? `<p style="margin:2px 0 0;font-size:13px;color:#374151"> ${salesRepForEmail.phone}</p>` : ""}
                ${salesRepForEmail?.email ? `<p style="margin:2px 0 0;font-size:13px;color:#374151"> ${salesRepForEmail.email}</p>` : ""}
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

// ── POST /sales-quotations/:id/resend-revised ──
router.post("/sales-quotations/:id/resend-revised", verifySalesToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid quotation ID" });
    }

    const { items, gstRate, discount } = req.body;

    const quotation = await SalesQuotation.findById(id)
      .populate("customer").populate("endCustomer")
      .populate("sourceQuotation");
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    if (quotation.salesRepUid !== req.salesRep.uid) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (
      ![
        "admin_revised",
        "admin_rejected_to_sales",
      ].includes(quotation.status)
    ) {
      return res.status(400).json({
        message: `Cannot resend from status "${quotation.status}"`,
      });
    }
    if (
      quotation.status === "admin_revised" &&
      quotation.pricingRevisionType !== "item_price_revised"
    ) {
      return res.status(400).json({
        message:
          "This quotation was approved via discount adjustment — use send-approved instead",
      });
    }

    const adminQuotation = await AdminQuotation.findById(quotation.sourceQuotation._id);
    if (!adminQuotation) {
      return res.status(404).json({ message: "Source admin quotation not found" });
    }

    if (!items || !Array.isArray(items) || items.length !== adminQuotation.items.length) {
      return res.status(400).json({ message: "Items array must match the revised admin quotation" });
    }

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

    // ── Build items — quantity locked, unit price cannot be below the REVISED admin price ──
    const rawItems = adminQuotation.items.map((adminItem, index) => {
      const incoming = items[index] || {};
      const unitPrice = Number(incoming.unitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(`Invalid unit price for item: ${adminItem.name}`);
      }
      if (unitPrice < adminItem.unitPrice) {
        throw new Error(
          `Price for "${adminItem.name}" cannot be lower than the revised admin price (₹${adminItem.unitPrice})`
        );
      }
      const quantity = adminItem.quantity;
      return {
        name: adminItem.name,
        description: adminItem.description || "",
        quantity,
        unitPrice,
        baseAmount: quantity * unitPrice,
      };
    });

    const rawSubtotal = rawItems.reduce((sum, i) => sum + i.baseAmount, 0);
    const gstOnSubtotal = rawSubtotal * (gstPercent / 100);
    const totalBeforeDiscount = rawSubtotal + gstOnSubtotal;

    const effectiveDiscountPercent =
      totalBeforeDiscount <= 0
        ? 0
        : discountType === "flat"
        ? Math.min((discountValue / totalBeforeDiscount) * 100, 100)
        : Math.min(discountValue, 100);

    const calculatedItems = rawItems.map((item) => {
      const itemGst = parseFloat((item.baseAmount * (gstPercent / 100)).toFixed(2));
      const itemTotalBeforeDiscount = item.baseAmount + itemGst;
      const itemDiscount = parseFloat((itemTotalBeforeDiscount * (effectiveDiscountPercent / 100)).toFixed(2));
      const total = parseFloat((itemTotalBeforeDiscount - itemDiscount).toFixed(2));

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

    const subtotal = parseFloat(rawSubtotal.toFixed(2));
    const gstAmount = parseFloat(gstOnSubtotal.toFixed(2));
    const discountAmount = parseFloat(
      calculatedItems.reduce((sum, item, i) => {
        const itemTotalBeforeDiscount = rawItems[i].baseAmount + (rawItems[i].baseAmount * gstPercent) / 100;
        return sum + itemTotalBeforeDiscount * (item.discount / 100);
      }, 0).toFixed(2)
    );
    const grandTotal = parseFloat(
      calculatedItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)
    );

    const revisionEntry =
      quotation.status === "admin_revised"
        ? [...(quotation.negotiationHistory || [])]
            .reverse()
            .find(
              (h) =>
                h.adminRevisedItems?.length &&
                !h.revisedSalesSentAt
            )
        : null;

    if (revisionEntry) {
      revisionEntry.revisedSalesItems = calculatedItems.map((i) => ({
        name: i.name,
        description: i.description || "",
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        gst: i.gst,
        discount: i.discount,
        total: i.total,
      }));

      revisionEntry.revisedSalesSubtotal = subtotal;
      revisionEntry.revisedSalesDiscountAmount = discountAmount;
      revisionEntry.revisedSalesGstAmount = gstAmount;
      revisionEntry.revisedSalesGrandTotal = grandTotal;
      revisionEntry.revisedSalesSentAt = new Date();
    }

    // ── Preserve rejected customer negotiation before clearing fields ──
    if (quotation.status === "admin_rejected_to_sales") {
      quotation.negotiationHistory.push({
        expectedBudget: quotation.expectedBudget,
        customerMessage: quotation.customerMessage,
        customerRespondedAt: quotation.customerRespondedAt,

        revisedSalesItems: calculatedItems.map((i) => ({
          name: i.name,
          description: i.description || "",
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          gst: i.gst,
          discount: i.discount,
          total: i.total,
        })),

        revisedSalesSubtotal: subtotal,
        revisedSalesDiscountAmount: discountAmount,
        revisedSalesGstAmount: gstAmount,
        revisedSalesGrandTotal: grandTotal,
        revisedSalesSentAt: new Date(),

        recordedAt: new Date(),
      });
    }

    // ── Apply new pricing, reset negotiation fields for a fresh cycle ──
    quotation.items = calculatedItems;
    quotation.subtotal = subtotal;
    quotation.discountAmount = discountAmount;
    quotation.gstAmount = gstAmount;
    quotation.grandTotal = grandTotal;
    quotation.status = "sent";
    quotation.sentAt = new Date();
    quotation.viewedAt = null;
    quotation.expectedBudget = null;
    quotation.customerMessage = "";
    quotation.customerRespondedAt = null;
    quotation.adminApprovedAmount = adminQuotation.subtotal;
    await quotation.save();

    const salesRepForEmail = await SalesRep.findOne({ uid: req.salesRep.uid });

    const viewQuotationUrl = `${FRONTEND_URL}/quotation/${quotation.publicToken}`;
    const itemRowsHtml = calculatedItems.map((item, i) => `
      <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f0fdf4"}">
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151">${item.name}</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;text-align:center">${item.quantity}</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;text-align:right">₹${item.unitPrice.toFixed(2)}</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;text-align:right">${item.gst}%</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;text-align:right">${item.discount}%</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;color:#166534;text-align:right">₹${item.total.toFixed(2)}</td>
      </tr>
    `).join("");

    try {
      if (quotation.customer?.email) {
        await transporter.sendMail({
          from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
          to: quotation.customer.email,
          subject: `Revised Quotation #${quotation.quotationNumber} — AADONA Communication`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px;background:#f0fdf4">
              <h2 style="color:#166534">We've Revised Your Quotation</h2>
              <p style="color:#374151;font-size:14px">Quotation <strong>#${quotation.quotationNumber}</strong> — updated pricing below.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0">
                <thead>
                  <tr style="background:#166534">
                    <th style="padding:10px 12px;border:1px solid #166534;color:#fff;font-size:13px;text-align:left">Product</th>
                    <th style="padding:10px 12px;border:1px solid #166534;color:#fff;font-size:13px">Qty</th>
                    <th style="padding:10px 12px;border:1px solid #166534;color:#fff;font-size:13px;text-align:right">Unit Price</th>
                    <th style="padding:10px 12px;border:1px solid #166534;color:#fff;font-size:13px;text-align:right">GST</th>
                    <th style="padding:10px 12px;border:1px solid #166534;color:#fff;font-size:13px;text-align:right">Discount</th>
                    <th style="padding:10px 12px;border:1px solid #166534;color:#fff;font-size:13px;text-align:right">Total</th>
                  </tr>
                </thead>
                <tbody>${itemRowsHtml}</tbody>
              </table>
              <p style="color:#166534;font-size:16px;font-weight:800;text-align:right">Grand Total: ₹${grandTotal.toFixed(2)}</p>
              <div style="text-align:center;margin-top:20px">
                <a href="${viewQuotationUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px">
                  View Revised Quotation
                </a>
              </div>
              <div style="margin-top:20px;padding:14px 16px;background:#ffffff;border-radius:8px;border-left:4px solid #16a34a">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.5px">Your Sales Contact</p>
                <p style="margin:0;font-size:13px;color:#374151">${salesRepForEmail?.name || "AADONA Sales Team"}</p>
                ${salesRepForEmail?.phone ? `<p style="margin:2px 0 0;font-size:13px;color:#374151"> ${salesRepForEmail.phone}</p>` : ""}
                ${salesRepForEmail?.email ? `<p style="margin:2px 0 0;font-size:13px;color:#374151"> ${salesRepForEmail.email}</p>` : ""}
              </div>
            </div>
          `,
        });
      }
    } catch (mailErr) {
      console.error("Resend-revised email failed:", mailErr.message);
    }

    return res.json({ message: "Revised quotation sent to customer", quotation });
  } catch (err) {
    console.error("Resend revised quotation error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /sales-quotations/:id/send-approved ──
// For the "Approve As-Is" (discount_applied) flow — item price/GST/discount/grandTotal
// were already finalized by the admin. This just re-sends the quotation email to the customer.
router.post("/sales-quotations/:id/send-approved", verifySalesToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid quotation ID" });
    }

    const quotation = await SalesQuotation.findById(id).populate("customer").populate("endCustomer");
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    if (quotation.salesRepUid !== req.salesRep.uid) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (quotation.status !== "admin_revised") {
      return res.status(400).json({
        message: `Cannot send from status "${quotation.status}"`,
      });
    }
    if (quotation.pricingRevisionType !== "discount_applied") {
      return res.status(400).json({
        message: "This quotation requires manual pricing — use resend-revised instead",
      });
    }

    const revisionEntry = [...quotation.negotiationHistory]
      .reverse()
      .find(
        (h) =>
          h.adminRevisedItems?.length &&
          !h.revisedSalesSentAt
      );

    if (revisionEntry) {
      revisionEntry.revisedSalesItems = quotation.items.map((i) => ({
        name: i.name,
        description: i.description || "",
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        gst: i.gst,
        discount: i.discount,
        total: i.total,
      }));

      revisionEntry.revisedSalesSubtotal = quotation.subtotal;
      revisionEntry.revisedSalesDiscountAmount = quotation.discountAmount;
      revisionEntry.revisedSalesGstAmount = quotation.gstAmount;
      revisionEntry.revisedSalesGrandTotal = quotation.grandTotal;
      revisionEntry.revisedSalesSentAt = new Date();
    }

    quotation.status = "sent";
    quotation.sentAt = new Date();
    quotation.viewedAt = null;
    quotation.expectedBudget = null;
    quotation.customerMessage = "";
    quotation.customerRespondedAt = null;
    await quotation.save();

    const salesRepForEmail = await SalesRep.findOne({ uid: req.salesRep.uid });

    const viewQuotationUrl = `${FRONTEND_URL}/quotation/${quotation.publicToken}`;
    const itemRowsHtml = quotation.items.map((item, i) => `
      <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f0fdf4"}">
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151">${item.name}</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;text-align:center">${item.quantity}</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;text-align:right">₹${item.unitPrice.toFixed(2)}</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;text-align:right">${item.gst}%</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;text-align:right">${item.discount}%</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;color:#166534;text-align:right">₹${item.total.toFixed(2)}</td>
      </tr>
    `).join("");

    try {
      if (quotation.customer?.email) {
        await transporter.sendMail({
          from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
          to: quotation.customer.email,
          subject: `Updated Quotation #${quotation.quotationNumber} — AADONA Communication`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px;background:#f0fdf4">
              <h2 style="color:#166534">We've Approved Your Requested Price</h2>
              <p style="color:#374151;font-size:14px">Quotation <strong>#${quotation.quotationNumber}</strong> — updated pricing below.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0">
                <thead>
                  <tr style="background:#166534">
                    <th style="padding:10px 12px;border:1px solid #166534;color:#fff;font-size:13px;text-align:left">Product</th>
                    <th style="padding:10px 12px;border:1px solid #166534;color:#fff;font-size:13px">Qty</th>
                    <th style="padding:10px 12px;border:1px solid #166534;color:#fff;font-size:13px;text-align:right">Unit Price</th>
                    <th style="padding:10px 12px;border:1px solid #166534;color:#fff;font-size:13px;text-align:right">GST</th>
                    <th style="padding:10px 12px;border:1px solid #166534;color:#fff;font-size:13px;text-align:right">Discount</th>
                    <th style="padding:10px 12px;border:1px solid #166534;color:#fff;font-size:13px;text-align:right">Total</th>
                  </tr>
                </thead>
                <tbody>${itemRowsHtml}</tbody>
              </table>
              <p style="color:#166534;font-size:16px;font-weight:800;text-align:right">Grand Total: ₹${Number(quotation.grandTotal).toFixed(2)}</p>
              <div style="text-align:center;margin-top:20px">
                <a href="${viewQuotationUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px">
                  View Quotation
                </a>
              </div>
              <div style="margin-top:20px;padding:14px 16px;background:#ffffff;border-radius:8px;border-left:4px solid #16a34a">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.5px">Your Sales Contact</p>
                <p style="margin:0;font-size:13px;color:#374151">${salesRepForEmail?.name || "AADONA Sales Team"}</p>
                ${salesRepForEmail?.phone ? `<p style="margin:2px 0 0;font-size:13px;color:#374151"> ${salesRepForEmail.phone}</p>` : ""}
                ${salesRepForEmail?.email ? `<p style="margin:2px 0 0;font-size:13px;color:#374151"> ${salesRepForEmail.email}</p>` : ""}
              </div>
            </div>
          `,
        });
      }
    } catch (mailErr) {
      console.error("Send-approved email failed:", mailErr.message);
    }

    return res.json({ message: "Approved quotation sent to customer", quotation });
  } catch (err) {
    console.error("Send-approved quotation error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /sales-quotations/:id/send-approved-edited ──
// For the "Approve As-Is" (discount_applied) flow, but the rep wants to tweak
// GST/discount before sending instead of sending admin's pricing as-is.
// Item unitPrice cannot go below what admin already locked in.
router.post("/sales-quotations/:id/send-approved-edited", verifySalesToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid quotation ID" });
    }

    const { items, gstRate, discount } = req.body;

    const quotation = await SalesQuotation.findById(id).populate("customer").populate("endCustomer");
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    if (quotation.salesRepUid !== req.salesRep.uid) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (quotation.status !== "admin_revised") {
      return res.status(400).json({
        message: `Cannot send from status "${quotation.status}"`,
      });
    }
    if (quotation.pricingRevisionType !== "discount_applied") {
      return res.status(400).json({
        message: "This quotation requires the item-price revise flow — use resend-revised instead",
      });
    }

    if (!items || !Array.isArray(items) || items.length !== quotation.items.length) {
      return res.status(400).json({ message: "Items array must match the current quotation" });
    }

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

    // ── Build items — quantity locked, unit price cannot go below admin's approved floor ──
    const rawItems = quotation.items.map((currentItem, index) => {
      const incoming = items[index] || {};
      const unitPrice = Number(incoming.unitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(`Invalid unit price for item: ${currentItem.name}`);
      }
      if (unitPrice < currentItem.unitPrice) {
        throw new Error(
          `Price for "${currentItem.name}" cannot be lower than the admin-approved price (₹${currentItem.unitPrice})`
        );
      }
      const quantity = currentItem.quantity;
      return {
        name: currentItem.name,
        description: currentItem.description || "",
        quantity,
        unitPrice,
        baseAmount: quantity * unitPrice,
      };
    });

    const rawSubtotal = rawItems.reduce((sum, i) => sum + i.baseAmount, 0);
    const gstOnSubtotal = rawSubtotal * (gstPercent / 100);
    const totalBeforeDiscount = rawSubtotal + gstOnSubtotal;

    const effectiveDiscountPercent =
      totalBeforeDiscount <= 0
        ? 0
        : discountType === "flat"
        ? Math.min((discountValue / totalBeforeDiscount) * 100, 100)
        : Math.min(discountValue, 100);

    const calculatedItems = rawItems.map((item) => {
      const itemGst = parseFloat((item.baseAmount * (gstPercent / 100)).toFixed(2));
      const itemTotalBeforeDiscount = item.baseAmount + itemGst;
      const itemDiscount = parseFloat((itemTotalBeforeDiscount * (effectiveDiscountPercent / 100)).toFixed(2));
      const total = parseFloat((itemTotalBeforeDiscount - itemDiscount).toFixed(2));

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

    const subtotal = parseFloat(rawSubtotal.toFixed(2));
    const gstAmount = parseFloat(gstOnSubtotal.toFixed(2));
    const discountAmount = parseFloat(
      calculatedItems.reduce((sum, item, i) => {
        const itemTotalBeforeDiscount = rawItems[i].baseAmount + (rawItems[i].baseAmount * gstPercent) / 100;
        return sum + itemTotalBeforeDiscount * (item.discount / 100);
      }, 0).toFixed(2)
    );
    const grandTotal = parseFloat(
      calculatedItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)
    );

    const revisionEntry = [...(quotation.negotiationHistory || [])]
      .reverse()
      .find(
        (h) =>
          h.adminRevisedItems?.length &&
          !h.revisedSalesSentAt
      );

    if (revisionEntry) {
      revisionEntry.revisedSalesItems = calculatedItems.map((i) => ({
        name: i.name,
        description: i.description || "",
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        gst: i.gst,
        discount: i.discount,
        total: i.total,
      }));

      revisionEntry.revisedSalesSubtotal = subtotal;
      revisionEntry.revisedSalesDiscountAmount = discountAmount;
      revisionEntry.revisedSalesGstAmount = gstAmount;
      revisionEntry.revisedSalesGrandTotal = grandTotal;
      revisionEntry.revisedSalesSentAt = new Date();
    }

    quotation.items = calculatedItems;
    quotation.subtotal = subtotal;
    quotation.discountAmount = discountAmount;
    quotation.gstAmount = gstAmount;
    quotation.grandTotal = grandTotal;
    quotation.status = "sent";
    quotation.sentAt = new Date();
    quotation.viewedAt = null;
    quotation.expectedBudget = null;
    quotation.customerMessage = "";
    quotation.customerRespondedAt = null;
    await quotation.save();

    const salesRepForEmail = await SalesRep.findOne({ uid: req.salesRep.uid });

    const viewQuotationUrl = `${FRONTEND_URL}/quotation/${quotation.publicToken}`;
    const itemRowsHtml = calculatedItems.map((item, i) => `
      <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f0fdf4"}">
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151">${item.name}</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;text-align:center">${item.quantity}</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;text-align:right">₹${item.unitPrice.toFixed(2)}</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;text-align:right">${item.gst}%</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;text-align:right">${item.discount}%</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;color:#166534;text-align:right">₹${item.total.toFixed(2)}</td>
      </tr>
    `).join("");

    try {
      if (quotation.customer?.email) {
        await transporter.sendMail({
          from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
          to: quotation.customer.email,
          subject: `Updated Quotation #${quotation.quotationNumber} — AADONA Communication`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px;background:#f0fdf4">
              <h2 style="color:#166534">We've Updated Your Quotation</h2>
              <p style="color:#374151;font-size:14px">Quotation <strong>#${quotation.quotationNumber}</strong> — updated pricing below.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0">
                <thead>
                  <tr style="background:#166534">
                    <th style="padding:10px 12px;border:1px solid #166534;color:#fff;font-size:13px;text-align:left">Product</th>
                    <th style="padding:10px 12px;border:1px solid #166534;color:#fff;font-size:13px">Qty</th>
                    <th style="padding:10px 12px;border:1px solid #166534;color:#fff;font-size:13px;text-align:right">Unit Price</th>
                    <th style="padding:10px 12px;border:1px solid #166534;color:#fff;font-size:13px;text-align:right">GST</th>
                    <th style="padding:10px 12px;border:1px solid #166534;color:#fff;font-size:13px;text-align:right">Discount</th>
                    <th style="padding:10px 12px;border:1px solid #166534;color:#fff;font-size:13px;text-align:right">Total</th>
                  </tr>
                </thead>
                <tbody>${itemRowsHtml}</tbody>
              </table>
              <p style="color:#166534;font-size:16px;font-weight:800;text-align:right">Grand Total: ₹${grandTotal.toFixed(2)}</p>
              <div style="text-align:center;margin-top:20px">
                <a href="${viewQuotationUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px">
                  View Quotation
                </a>
              </div>
              <div style="margin-top:20px;padding:14px 16px;background:#ffffff;border-radius:8px;border-left:4px solid #16a34a">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.5px">Your Sales Contact</p>
                <p style="margin:0;font-size:13px;color:#374151">${salesRepForEmail?.name || "AADONA Sales Team"}</p>
                ${salesRepForEmail?.phone ? `<p style="margin:2px 0 0;font-size:13px;color:#374151"> ${salesRepForEmail.phone}</p>` : ""}
                ${salesRepForEmail?.email ? `<p style="margin:2px 0 0;font-size:13px;color:#374151"> ${salesRepForEmail.email}</p>` : ""}
              </div>
            </div>
          `,
        });
      }
    } catch (mailErr) {
      console.error("Send-approved-edited email failed:", mailErr.message);
    }

    return res.json({ message: "Edited quotation sent to customer", quotation });
  } catch (err) {
    console.error("Send-approved-edited error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;