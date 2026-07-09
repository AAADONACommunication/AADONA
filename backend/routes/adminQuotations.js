const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verifyToken = require("../middleware/verifyToken");
const verifySalesToken = require("../middleware/verifySalesToken");
const transporter = require("../mailer");
const AdminQuotation = require("../models/AdminQuotation");
const SalesRep = require("../models/SalesRep");
const Customer = require("../models/Customer");
const QuotationRequest = require("../models/QuotationRequest");
const SalesQuotation = require("../models/SalesQuotation");

// ── POST /admin/quotation-requests/:id/price ──
router.post("/admin/quotation-requests/:id/price", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { items, notes } = req.body;

    // 1. Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }

    // 2. Find QuotationRequest
    const quotationRequest = await QuotationRequest.findById(id);
    if (!quotationRequest) {
      return res.status(404).json({ message: "Quotation request not found" });
    }

    const existingQuotation = await AdminQuotation.findOne({
        quotationRequest: quotationRequest._id,
    });

    if (existingQuotation) {
        return res.status(400).json({
            message: "Quotation already sent for this request.",
        });
    }

    // 3. Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items array is required and cannot be empty" });
    }

    for (const item of items) {
      if (!item.name || !item.name.trim()) {
        return res.status(400).json({ message: "Every item must have a name" });
      }
      const unitPrice = Number(item.unitPrice);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            return res.status(400).json({
                message: `Invalid price for item: ${item.name}`,
            });
        }
      if (!item.quantity || Number(item.quantity) <= 0) {
        return res.status(400).json({ message: `Invalid quantity for item: ${item.name}` });
      }
    }

    // 4. Fetch SalesRep
    const salesRep = await SalesRep.findOne({ uid: quotationRequest.salesRepUid });
    if (!salesRep) {
      return res.status(404).json({ message: "Sales representative not found" });
    }

    // 5. Fetch Customer
    const customer = await Customer.findById(quotationRequest.customer);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // 6. Calculate per item — NO GST
    const calculatedItems = items.map((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const total = parseFloat((quantity * unitPrice).toFixed(2));

      return {
        name: item.name.trim(),
        description: item.description || "",
        quantity,
        unitPrice,
        total,
      };
    });

    // 7. Calculate subtotal
    const subtotal = parseFloat(
      calculatedItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)
    );

    // 8. Valid till — 30 days from now
    const validTill = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // 9. Create AdminQuotation
    const adminQuotation = await AdminQuotation.create({
      quotationRequest: quotationRequest._id,
      salesRepUid: quotationRequest.salesRepUid,
      customer: customer._id,
      items: calculatedItems,
      subtotal,
      remarks: notes?.trim() || "",
      validTill,
      status: "sent",
    });

    // 10. Update QuotationRequest status
    quotationRequest.status = "quoted";
    await quotationRequest.save();

    // 11. Build email HTML — only for Sales Rep, no GST
    const requestNumber = quotationRequest.requestNumber;

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
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;color:#166534;text-align:right">
          ₹${item.total.toFixed(2)}
        </td>
      </tr>
    `).join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"/></head>
      <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0">
          <tr><td align="center">
            <table width="620" cellpadding="0" cellspacing="0" 
              style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#166534,#16a34a);padding:32px;text-align:center">
                  <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800">AADONA Communication</h1>
                  <p style="color:#bbf7d0;margin:6px 0 0;font-size:13px">Internal Pricing — Sales Use Only</p>
                </td>
              </tr>

              <!-- Info -->
              <tr>
                <td style="padding:28px 32px 0">
                  <h2 style="color:#166534;font-size:18px;margin:0 0 16px">
                    Pricing Ready for Request #${requestNumber}
                  </h2>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px">Request Number</td>
                      <td style="padding:4px 0;color:#111827;font-weight:600;font-size:13px">#${requestNumber}</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:#6b7280;font-size:13px">Customer</td>
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
                      <td style="padding:4px 0;color:#6b7280;font-size:13px">Valid Till</td>
                      <td style="padding:4px 0;color:#111827;font-weight:600;font-size:13px">
                        ${validTill.toLocaleDateString("en-IN")}
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
                        <th style="padding:10px 12px;border:1px solid #166534;color:#fff;text-align:left;font-size:13px">
                          Product
                        </th>
                        <th style="padding:10px 12px;border:1px solid #166534;color:#fff;text-align:center;font-size:13px">
                          Qty
                        </th>
                        <th style="padding:10px 12px;border:1px solid #166534;color:#fff;text-align:right;font-size:13px">
                          Unit Price
                        </th>
                        <th style="padding:10px 12px;border:1px solid #166534;color:#fff;text-align:right;font-size:13px">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemRowsHtml}
                    </tbody>
                  </table>
                </td>
              </tr>

              <!-- Subtotal -->
              <tr>
                <td style="padding:16px 32px 0">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="text-align:right;padding:4px 0;color:#166534;font-weight:800;font-size:16px">
                        Subtotal
                      </td>
                      <td style="text-align:right;padding:4px 0 4px 24px;color:#166534;font-weight:800;font-size:16px;width:120px">
                        ₹${subtotal.toFixed(2)}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Remarks -->
              ${notes && notes.trim() ? `
              <tr>
                <td style="padding:20px 32px 0">
                  <div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:8px;padding:14px 16px">
                    <p style="margin:0;font-size:13px;font-weight:600;color:#166534;margin-bottom:4px">
                      Admin Notes
                    </p>
                    <p style="margin:0;font-size:13px;color:#374151">${notes.trim()}</p>
                  </div>
                </td>
              </tr>` : ""}

              <!-- Notice -->
              <tr>
                <td style="padding:20px 32px 0">
                  <div style="background:#fefce8;border-left:4px solid #eab308;border-radius:8px;padding:14px 16px">
                    <p style="margin:0;font-size:12px;color:#854d0e">
                      ⚠️ This is an internal pricing document for sales use only. 
                      Do NOT share this email with the customer. 
                      You may add your own markup, GST, and discount before sending the final quotation to the customer.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:28px 32px;text-align:center">
                  <p style="color:#9ca3af;font-size:12px;margin:0">
                    Please log in to your Sales Portal to create and send the customer quotation.
                  </p>
                </td>
              </tr>

            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;

    // 12. Send email to Sales Rep only
    try {
        await transporter.sendMail({
        from: `"AADONA Admin" <${process.env.EMAIL_USER}>`,
        to: salesRep.email,
        subject: `Pricing Ready — Request #${requestNumber} | ${customer.personalName}`,
        html: emailHtml,
        });
    } catch (err) {
    console.error("Quotation email failed:", err.message);
    }

    return res.status(201).json(adminQuotation);
  } catch (err) {
    console.error("Price quotation error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /admin-quotations ──
router.get("/admin-quotations", verifySalesToken, async (req, res) => {
  try {
    const quotations = await AdminQuotation.find({ salesRepUid: req.salesRep.uid })
      .populate("customer")
      .populate("quotationRequest")
      .sort({ createdAt: -1 });

    const salesQuotations = await SalesQuotation.find({
      sourceQuotation: { $in: quotations.map((q) => q._id) },
    });

    const salesMap = {};
    salesQuotations.forEach((sq) => {
      salesMap[sq.sourceQuotation.toString()] = sq;
    });

    const enriched = quotations.map((q) => ({
      ...q.toObject(),
      salesQuotation: salesMap[q._id.toString()] || null,
    }));

    return res.json(enriched);
  } catch (err) {
    console.error("Get admin quotations error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /admin-quotations/:id ──
router.get("/admin-quotations/:id", verifySalesToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid quotation ID" });
    }

    const quotation = await AdminQuotation.findById(req.params.id)
      .populate("customer")
      .populate("quotationRequest");

    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    if (quotation.salesRepUid !== req.salesRep.uid) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.json(quotation);
  } catch (err) {
    console.error("Get admin quotation by id error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;