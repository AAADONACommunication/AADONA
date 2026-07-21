const express = require("express");
const router = express.Router();
const transporter = require("../mailer");
const SalesQuotation = require("../models/SalesQuotation");
const AdminQuotation = require("../models/AdminQuotation");
const SalesRep = require("../models/SalesRep");
const generateQuotationPdf = require("../utils/generateQuotationPdf");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const FRONTEND_URL = process.env.FRONTEND_URL || "https://aadona.com";

// ── Helper: strip internal/admin-only fields before sending to customer ──
const toPublicQuotation = (quotation, salesRep) => ({
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
  rejectedBy: quotation.rejectedBy,
  rejectReason: quotation.rejectReason,
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
  salesRep: salesRep ? { name: salesRep.name, email: salesRep.email, phone: salesRep.phone } : null,
});

// ── GET /quotation/:publicToken ── (NO AUTH — customer facing)
router.get("/quotation/:publicToken", async (req, res) => {
  try {
    const { publicToken } = req.params;

    const quotation = await SalesQuotation.findOne({ publicToken })
      .populate("customer")
      .populate("endCustomer")
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

    const salesRep = await SalesRep.findOne({ uid: quotation.salesRepUid });

    return res.json(toPublicQuotation(quotation, salesRep));
  } catch (err) {
    console.error("Get public quotation error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /quotation/:publicToken/pdf ── (NO AUTH — always-available download of current state)
router.get("/quotation/:publicToken/pdf", async (req, res) => {
  try {
    const { publicToken } = req.params;

    const quotation = await SalesQuotation.findOne({ publicToken })
      .populate("customer")
      .populate("endCustomer")
      .populate("sourceQuotation");

    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    const salesRep = await SalesRep.findOne({ uid: quotation.salesRepUid });

    let finalAmount = Number(quotation.grandTotal);
    let items = quotation.items;
    let label = "Total Quotation Amount";

    if (quotation.status === "accepted") {
      finalAmount =
        quotation.negotiatedAmount != null ? Number(quotation.negotiatedAmount) : Number(quotation.grandTotal);
      if (
        quotation.negotiatedAmount != null &&
        quotation.negotiatedAmount === quotation.counterOfferAmount &&
        quotation.counterOfferItems?.length
      ) {
        items = quotation.counterOfferItems;
      }
      label = "Final Accepted Amount";
    }

    const pdfBuffer = await generateQuotationPdf(quotation, {
      finalAmount,
      items,
      salesRep,
      label,
      copyLabel: "Partner's Copy",
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Quotation-${quotation.quotationNumber}.pdf`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("Quotation PDF download error:", err.message);
    return res.status(500).json({ error: "Failed to generate PDF" });
  }
});

// ── POST /quotation/:publicToken/accept ── (NO AUTH)
router.post("/quotation/:publicToken/accept", async (req, res) => {
  try {
    const { publicToken } = req.params;

    const quotation = await SalesQuotation.findOne({ publicToken }).populate("customer").populate("endCustomer");
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

    // Notify customer, sales rep, and admin — each gets their own labeled copy of the PDF
    try {
      const salesRep = await SalesRep.findOne({ uid: quotation.salesRepUid });

      const makeAttachment = async (copyLabel) => [
        {
          filename: `Quotation-${quotation.quotationNumber}.pdf`,
          content: await generateQuotationPdf(quotation, {
            finalAmount: quotation.grandTotal,
            salesRep,
            copyLabel,
          }),
          contentType: "application/pdf",
        },
      ];

      const partnerAttachments = await makeAttachment("Partner's Copy");
      const salesAttachments = await makeAttachment("Sales Copy");
      const adminAttachments = await makeAttachment("AADONA Copy");

      if (quotation.customer?.email) {
        await transporter.sendMail({
          from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
          to: quotation.customer.email,
          subject: `Quotation Confirmed — #${quotation.quotationNumber}`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px;background:#f0fdf4">
              <h2 style="color:#166534">Your Quotation Is Confirmed </h2>
              <p style="color:#374151;font-size:14px">
                Thank you for confirming quotation <strong>#${quotation.quotationNumber}</strong> for
                <strong>₹${Number(quotation.grandTotal).toFixed(2)}</strong>.
              </p>
              <p style="color:#374151;font-size:14px">The final quotation is attached as a PDF for your records.</p>
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
          subject: `Quotation Accepted — #${quotation.quotationNumber}`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px;background:#f0fdf4">
              <h2 style="color:#166534">Quotation Accepted </h2>
              <p style="color:#374151;font-size:14px"><strong>Partner:</strong> ${quotation.customer?.personalName || "—"}</p>
              <p style="color:#374151;font-size:14px"><strong>End Customer:</strong> ${quotation.endCustomer?.endCustomerName || "—"}</p>
              <p style="color:#374151;font-size:14px">
                <strong>${quotation.customer?.personalName || "Customer"}</strong> has accepted
                quotation <strong>#${quotation.quotationNumber}</strong> for
                <strong>₹${Number(quotation.grandTotal).toFixed(2)}</strong>.
              </p>
              <p style="color:#374151;font-size:14px">Final PDF attached. Please log in to the Sales Portal to proceed.</p>
            </div>
          `,
          attachments: salesAttachments,
        });
      }

      if (ADMIN_EMAIL) {
        await transporter.sendMail({
          from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
          to: ADMIN_EMAIL,
          subject: `Quotation Accepted — #${quotation.quotationNumber}`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px;background:#f0fdf4">
              <h2 style="color:#166534">Quotation Accepted </h2>
              <p style="color:#374151;font-size:14px"><strong>Sales Representative:</strong> ${salesRep?.name || "—"} ${salesRep?.phone ? `(${salesRep.phone})` : ""}</p>
              <p style="color:#374151;font-size:14px"><strong>Partner:</strong> ${quotation.customer?.personalName || "—"}</p>
              <p style="color:#374151;font-size:14px"><strong>End Customer:</strong> ${quotation.endCustomer?.endCustomerName || "—"}</p>
              <p style="color:#374151;font-size:14px">
                Quotation <strong>#${quotation.quotationNumber}</strong> has been confirmed by
                <strong>${quotation.customer?.personalName || "the customer"}</strong> for
                <strong>₹${Number(quotation.grandTotal).toFixed(2)}</strong>.
              </p>
              <p style="color:#374151;font-size:14px">Final PDF attached for your records.</p>
            </div>
          `,
          attachments: adminAttachments,
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
      .populate("endCustomer")
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
                <p style="color:#374151;font-size:14px"><strong>Partner:</strong> ${quotation.customer?.personalName || "—"}</p>
                <p style="color:#374151;font-size:14px"><strong>End Customer:</strong> ${quotation.endCustomer?.endCustomerName || "—"}</p>
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

      // ── FYI copy to admin — informational only, no action needed from admin here ──
      try {
        if (ADMIN_EMAIL) {
          await transporter.sendMail({
            from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
            to: ADMIN_EMAIL,
            subject: `[FYI] Negotiation (within rep authority) — #${quotation.quotationNumber}`,
            html: `
              <div style="font-family:Arial,sans-serif;padding:24px;background:#fff7ed">
                <h2 style="color:#c2410c">Customer Requested Negotiation</h2>
                <p style="color:#374151;font-size:14px"><strong>Quotation:</strong> #${quotation.quotationNumber}</p>
                <p style="color:#374151;font-size:14px"><strong>Partner:</strong> ${quotation.customer?.personalName || "—"}</p>
                <p style="color:#374151;font-size:14px"><strong>End Customer:</strong> ${quotation.endCustomer?.endCustomerName || "—"}</p>
                <p style="color:#374151;font-size:14px"><strong>Sales Rep:</strong> ${salesRep?.name || quotation.salesRepUid}</p>
                <p style="color:#374151;font-size:14px"><strong>Sales Rep Contact:</strong> ${salesRep?.phone || "—"}</p>
                <p style="color:#374151;font-size:14px"><strong>Admin Price:</strong> ₹${adminSubtotal.toFixed(2)}</p>
                <p style="color:#374151;font-size:14px"><strong>Current Quotation Total:</strong> ₹${Number(quotation.grandTotal).toFixed(2)}</p>
                <p style="color:#374151;font-size:14px"><strong>Customer Expected Total:</strong> ₹${expected.toFixed(2)}</p>
                <p style="color:#374151;font-size:14px;white-space:pre-line"><strong>Message:</strong><br/>${combinedMessage}</p>
                <p style="color:#6b7280;font-size:12px">This is within the sales rep's pricing authority — no action needed from you. Shared for visibility only.</p>
              </div>
            `,
          });
        }
      } catch (mailErr) {
        console.error("Admin FYI negotiation email failed:", mailErr.message);
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
            <tr><td style="padding:4px 12px 4px 0"><strong>Partner</strong></td><td>${quotation.customer?.personalName || "—"}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><strong>End Customer</strong></td><td>${quotation.endCustomer?.endCustomerName || "—"}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><strong>Sales Representative</strong></td><td>${salesRep?.name || quotation.salesRepUid}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><strong>Sales Rep Contact</strong></td><td>${salesRep?.phone || "—"}</td></tr>
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

    const quotation = await SalesQuotation.findOne({ publicToken }).populate("customer").populate("endCustomer");
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

      const itemsForReport = quotation.counterOfferItems?.length
        ? quotation.counterOfferItems
        : quotation.items;

      const makeAttachment = async (copyLabel) => [
        {
          filename: `Quotation-${quotation.quotationNumber}.pdf`,
          content: await generateQuotationPdf(quotation, {
            finalAmount: quotation.negotiatedAmount,
            items: itemsForReport,
            salesRep,
            copyLabel,
          }),
          contentType: "application/pdf",
        },
      ];

      const partnerAttachments = await makeAttachment("Partner's Copy");
      const salesAttachments = await makeAttachment("Sales Copy");
      const adminAttachments = await makeAttachment("AADONA Copy");

      const itemRowsHtml = itemsForReport.map((item, i) => `
        <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f0fdf4"}">
          <td style="padding:8px 10px;border:1px solid #e5e7eb;color:#374151">${item.name}</td>
          <td style="padding:8px 10px;border:1px solid #e5e7eb;color:#374151;text-align:center">${item.quantity}</td>
          <td style="padding:8px 10px;border:1px solid #e5e7eb;color:#374151;text-align:right">₹${Number(item.unitPrice).toFixed(2)}</td>
          <td style="padding:8px 10px;border:1px solid #e5e7eb;color:#374151;text-align:right">${item.gst}%</td>
          <td style="padding:8px 10px;border:1px solid #e5e7eb;color:#374151;text-align:right">${item.discount}%</td>
          <td style="padding:8px 10px;border:1px solid #e5e7eb;font-weight:600;color:#166534;text-align:right">₹${Number(item.total).toFixed(2)}</td>
        </tr>
      `).join("");

      const productTableHtml = `
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
      `;

      // ── Partner-facing copy — no internal admin info, includes their sales contact ──
      const partnerHtml = `
        <div style="font-family:Arial,sans-serif;padding:24px;background:#f0fdf4">
          <h2 style="color:#166534">Counter Offer Accepted </h2>
          <p style="color:#374151;font-size:14px">
            <strong>${quotation.customer?.personalName || "Customer"}</strong> has accepted the
            counter offer for quotation <strong>#${quotation.quotationNumber}</strong>.
          </p>
          ${productTableHtml}
          <div style="margin-top:20px;padding:14px 16px;background:#ffffff;border-radius:8px;border-left:4px solid #16a34a">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.5px">Your Sales Contact</p>
            <p style="margin:0;font-size:13px;color:#374151">${salesRep?.name || "AADONA Sales Team"}</p>
            ${salesRep?.phone ? `<p style="margin:2px 0 0;font-size:13px;color:#374151"> ${salesRep.phone}</p>` : ""}
            ${salesRep?.email ? `<p style="margin:2px 0 0;font-size:13px;color:#374151"> ${salesRep.email}</p>` : ""}
          </div>
        </div>
      `;

      // ── Sales Rep / Admin copy — includes Partner, End Customer, Sales Rep identity ──
      const reportHtml = `
        <div style="font-family:Arial,sans-serif;padding:24px;background:#f0fdf4">
          <h2 style="color:#166534">Counter Offer Accepted </h2>
          <p style="color:#374151;font-size:14px"><strong>Sales Representative:</strong> ${salesRep?.name || quotation.salesRepUid} ${salesRep?.phone ? `(${salesRep.phone})` : ""}</p>
          <p style="color:#374151;font-size:14px"><strong>Partner:</strong> ${quotation.customer?.personalName || "—"}</p>
          <p style="color:#374151;font-size:14px"><strong>End Customer:</strong> ${quotation.endCustomer?.endCustomerName || "—"}</p>
          <p style="color:#374151;font-size:14px">
            <strong>${quotation.customer?.personalName || "Customer"}</strong> has accepted the
            counter offer for quotation <strong>#${quotation.quotationNumber}</strong>.
          </p>
          ${productTableHtml}
        </div>
      `;

      if (quotation.customer?.email) {
        await transporter.sendMail({
          from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
          to: quotation.customer.email,
          subject: `Quotation Confirmed — #${quotation.quotationNumber}`,
          html: partnerHtml + `<div style="padding:0 24px 24px;font-family:Arial,sans-serif"><p style="color:#374151;font-size:14px">The final quotation is attached as a PDF for your records.</p></div>`,
          attachments: partnerAttachments,
        });
      }

      if (salesRep?.email) {
        await transporter.sendMail({
          from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
          to: salesRep.email,
          subject: `Counter Offer Accepted — #${quotation.quotationNumber}`,
          html: reportHtml + `<div style="padding:0 24px 24px;font-family:Arial,sans-serif"><p style="color:#374151;font-size:14px">Final PDF attached. Please log in to the Sales Portal to proceed.</p></div>`,
          attachments: salesAttachments,
        });
      }

      if (ADMIN_EMAIL) {
        await transporter.sendMail({
          from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
          to: ADMIN_EMAIL,
          subject: `Counter Offer Accepted — #${quotation.quotationNumber}`,
          html: reportHtml,
          attachments: adminAttachments,
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

// ── POST /quotation/:publicToken/reject ──
router.post("/quotation/:publicToken/reject", async (req, res) => {
  try {
    const { publicToken } = req.params;
    const { reason } = req.body;
    const rejectReason = reason && reason.trim() ? reason.trim() : "";

    const quotation = await SalesQuotation.findOne({ publicToken })
      .populate("customer")
      .populate("endCustomer");

    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    if (quotation.status === "accepted") {
      return res.status(400).json({ message: "Cannot reject an already accepted quotation" });
    }
    if (quotation.status === "rejected") {
      return res.status(400).json({ message: "Quotation is already rejected" });
    }

    quotation.status = "rejected";
    quotation.rejectedBy = "partner";
    quotation.rejectReason = rejectReason;
    quotation.rejectedAt = new Date();
    await quotation.save();

    // ── Notify Sales Representative only ──
    try {
      const salesRep = await SalesRep.findOne({ uid: quotation.salesRepUid });

      if (salesRep?.email) {
        await transporter.sendMail({
          from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
          to: salesRep.email,
          subject: `Quotation Rejected — #${quotation.quotationNumber}`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px;background:#fef2f2">
              <h2 style="color:#b91c1c">Quotation Rejected by Partner</h2>
              <p style="color:#374151;font-size:14px"><strong>Quotation:</strong> #${quotation.quotationNumber}</p>
              <p style="color:#374151;font-size:14px"><strong>Partner:</strong> ${quotation.customer?.personalName || "—"}</p>
              ${quotation.rejectReason ? `<p style="color:#374151;font-size:14px"><strong>Reason:</strong> ${quotation.rejectReason}</p>` : ""}
              <p style="color:#374151;font-size:14px"><strong>Grand Total:</strong> ₹${Number(quotation.grandTotal).toFixed(2)}</p>
              <p style="color:#374151;font-size:14px"><strong>Rejected At:</strong> ${quotation.rejectedAt.toLocaleString("en-IN", {timeZone: "Asia/Kolkata"})}</p>
            </div>
          `,
        });
      }
    } catch (mailErr) {
      console.error("Partner-reject notification email failed:", mailErr.message);
    }

    return res.json({ message: "Quotation rejected", status: quotation.status });
  } catch (err) {
    console.error("Reject quotation error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;