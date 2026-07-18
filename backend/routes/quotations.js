const express = require("express");
const router = express.Router();

const QuotationRequest = require("../models/QuotationRequest");
const Customer = require("../models/Customer");
const SalesRep = require("../models/SalesRep");
const AdminQuotation = require("../models/AdminQuotation");
const EndCustomer = require("../models/EndCustomer");

const verifyToken = require("../middleware/verifyToken"); // admin middleware
const verifySalesToken = require("../middleware/verifySalesToken");
const transporter = require("../mailer");

/* =========================================================
   HELPER — generate a unique, human-readable request number
========================================================= */
const generateRequestNumber = async () => {
  const datePart = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, ""); // YYYYMMDD

  let requestNumber;
  let exists = true;

  while (exists) {
    const randomPart = Math.floor(1000 + Math.random() * 9000); // 4 digit
    requestNumber = `QR-${datePart}-${randomPart}`;
    exists = await QuotationRequest.findOne({ requestNumber });
  }

  return requestNumber;
};

/* =========================================================
   SALES REP — Send a product requirement to Admin
   (no pricing yet — admin will price it in Phase 3B)
========================================================= */
router.post("/quotation-requests", verifySalesToken, async (req, res) => {
  try {
    const { customer, endCustomer, items, notes } = req.body;

    if (!customer) {
      return res.status(400).json({ message: "Customer is required" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "At least one product item is required" });
    }

    for (const item of items) {
      if (!item.name || !item.name.trim()) {
        return res.status(400).json({ message: "Every item needs a product name" });
      }
      if (!item.quantity || Number(item.quantity) <= 0) {
        return res.status(400).json({ message: "Quantity must be greater than 0" });
      }
    }

    // Make sure the customer actually belongs to this sales rep
    const customerDoc = await Customer.findOne({
      _id: customer,
      salesRepUid: req.salesRep.uid,
    });
    if (!customerDoc) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // If an end customer (project lock) was supplied, make sure it belongs to this partner
    let endCustomerDoc = null;
    if (endCustomer) {
      endCustomerDoc = await EndCustomer.findOne({
        _id: endCustomer,
        partner: customerDoc._id,
      });
      if (!endCustomerDoc) {
        return res.status(404).json({ message: "End customer not found for this partner" });
      }
    }

    const salesRep = await SalesRep.findOne({ uid: req.salesRep.uid });

    const requestNumber = await generateRequestNumber();

    const quotationRequest = await QuotationRequest.create({
      requestNumber,
      salesRepUid: req.salesRep.uid,
      customer: customerDoc._id,
      endCustomer: endCustomerDoc ? endCustomerDoc._id : null,
      items: items.map((item) => ({
        product: item.product || null,
        name: item.name.trim(),
        description: item.description || "",
        quantity: Number(item.quantity),
      })),
      notes: notes || "",
    });

    // Email admin with the requirement (no prices — admin will price it)
    if (process.env.COMPANY_EMAIL) {
      const itemsRows = quotationRequest.items
        .map(
          (item, i) => `
            <tr style="${i % 2 === 0 ? "background:#f0fdf4" : ""}">
              <td style="padding:8px;border:1px solid #e5e7eb">${i + 1}</td>
              <td style="padding:8px;border:1px solid #e5e7eb">${item.name}</td>
              <td style="padding:8px;border:1px solid #e5e7eb">${item.description || "-"}</td>
              <td style="padding:8px;border:1px solid #e5e7eb">${item.quantity}</td>
            </tr>`
        )
        .join("");

      transporter
        .sendMail({
          from: `"AADONA Sales Portal" <${process.env.EMAIL_USER}>`,
          to: process.env.COMPANY_EMAIL,
          subject: `New Quotation Request — ${requestNumber}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:30px;border:1px solid #e5e7eb;border-radius:12px">
              <h2 style="color:#166534;margin-bottom:4px">New Quotation Request</h2>
              <p style="color:#6b7280;font-size:13px;margin-top:0">Request #: <b>${requestNumber}</b></p>

              <table border="0" cellpadding="6" cellspacing="0" style="width:100%;font-size:14px;margin-bottom:16px">
                <tr><td style="color:#6b7280;width:140px"><b>Sales Rep</b></td><td>${salesRep?.name || "-"} (${salesRep?.email || "-"})</td></tr>
                <tr><td style="color:#6b7280"><b>Sales Rep Contact</b></td><td>${salesRep?.phone || "-"}</td></tr>
                <tr><td style="color:#6b7280"><b>Partner</b></td><td>${customerDoc.personalName}${customerDoc.companyName ? ` — ${customerDoc.companyName}` : ""}</td></tr>
                <tr><td style="color:#6b7280"><b>Partner Email</b></td><td>${customerDoc.email}</td></tr>
                <tr><td style="color:#6b7280"><b>Partner Contact</b></td><td>${customerDoc.contactNumber || "-"}</td></tr>
                <tr><td style="color:#6b7280"><b>End Customer</b></td><td>${endCustomerDoc?.endCustomerName ? `${endCustomerDoc.endCustomerName}${endCustomerDoc.organizationName ? ` — ${endCustomerDoc.organizationName}` : ""}` : "-"}</td></tr>
              </table>

              <table border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
                <thead>
                  <tr style="background:#166534;color:#fff">
                    <th style="padding:8px;text-align:left">#</th>
                    <th style="padding:8px;text-align:left">Product</th>
                    <th style="padding:8px;text-align:left">Description</th>
                    <th style="padding:8px;text-align:left">Qty</th>
                  </tr>
                </thead>
                <tbody>${itemsRows}</tbody>
              </table>

              ${
                quotationRequest.notes
                  ? `<p style="color:#374151"><b>Notes:</b> ${quotationRequest.notes}</p>`
                  : ""
              }

              <p style="color:#6b7280;font-size:13px;margin-top:24px">
                Log in to the Admin Panel to price this requirement and send the quotation back.
              </p>
            </div>
          `,
        })
        .catch((err) => console.log("Quotation request email failed:", err.message));
    }

    res.status(201).json(quotationRequest);
  } catch (err) {
    console.log("Create quotation request error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   SALES REP — Get own quotation requests (status tracking)
========================================================= */
router.get("/quotation-requests", verifySalesToken, async (req, res) => {
  try {
    const requests = await QuotationRequest.find({ salesRepUid: req.salesRep.uid })
      .populate("customer")
      .populate("endCustomer")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   ADMIN — Get all pending/quoted requests (across all sales reps)
========================================================= */
router.get("/admin/quotation-requests", verifyToken, async (req, res) => {
  try {
    const { status } = req.query;

    const query =
      status && status !== "all"
        ? { status }
        : {};

    const requests = await QuotationRequest.find(query)
      .populate("customer")
      .populate("endCustomer")
      .sort({ createdAt: -1 });

    // Attach sales rep name/email/phone
    const salesReps = await SalesRep.find(
      {},
      { uid: 1, name: 1, email: 1, phone: 1 }
    );

    const repMap = {};
    salesReps.forEach((rep) => {
      repMap[rep.uid] = {
        name: rep.name,
        email: rep.email,
        phone: rep.phone,
      };
    });

    // Fetch AdminQuotation for every request in this result.
    // revisionHistory is already inside AdminQuotation.
    const adminQuotations = await AdminQuotation.find({
      quotationRequest: {
        $in: requests.map((r) => r._id),
      },
    });

    const quotationMap = {};
    adminQuotations.forEach((aq) => {
      quotationMap[aq.quotationRequest.toString()] = aq;
    });

    const enriched = requests.map((r) => ({
      ...r.toObject(),

      salesRep: repMap[r.salesRepUid] || null,

      // Contains:
      // - current/latest admin quotation
      // - revisionHistory[]
      adminQuotation:
        quotationMap[r._id.toString()] || null,
    }));

    res.json(enriched);
  } catch (err) {
    console.error(
      "Get admin quotation requests error:",
      err.message
    );

    res.status(500).json({
      error: err.message,
    });
  }
});

/* =========================================================
   ADMIN — Get single request detail
========================================================= */
router.get(
  "/admin/quotation-requests/:id",
  verifyToken,
  async (req, res) => {
    try {
      const request = await QuotationRequest.findById(
        req.params.id
      ).populate("customer").populate("endCustomer");

      if (!request) {
        return res.status(404).json({
          message: "Quotation request not found",
        });
      }

      const [salesRep, adminQuotation] = await Promise.all([
        SalesRep.findOne({
          uid: request.salesRepUid,
        }),

        AdminQuotation.findOne({
          quotationRequest: request._id,
        }),
      ]);

      res.json({
        ...request.toObject(),

        salesRep: salesRep
          ? {
              name: salesRep.name,
              email: salesRep.email,
              phone: salesRep.phone,
            }
          : null,

        // Original/current quotation + revisionHistory
        adminQuotation: adminQuotation || null,
      });
    } catch (err) {
      console.error(
        "Get single admin quotation request error:",
        err.message
      );

      res.status(500).json({
        error: err.message,
      });
    }
  }
);

module.exports = router;