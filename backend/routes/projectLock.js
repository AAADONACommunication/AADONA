const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verifySalesToken = require("../middleware/verifySalesToken");
const Customer = require("../models/Customer"); // Customer collection = "Partner"
const EndCustomer = require("../models/EndCustomer");
const SalesQuotation = require("../models/SalesQuotation");

/* =========================================================
   HELPERS
========================================================= */

const STATUS_LABELS = {
  sent: "Pending",
  viewed: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  negotiation_requested: "Negotiation Running",
  awaiting_admin_approval: "Waiting Admin Approval",
  counter_offered: "Counter Offer",
  admin_revised: "Pending",
  admin_rejected_to_sales: "Rejected",
};

const mapStatusToLabel = (rawStatus) => STATUS_LABELS[rawStatus] || "Pending";

const findOwnedPartner = async (partnerId, salesRepUid) => {
  if (!mongoose.Types.ObjectId.isValid(partnerId)) return null;
  return Customer.findOne({ _id: partnerId, salesRepUid });
};

router.post("/project-lock", verifySalesToken, async (req, res) => {
  try {
    const { partnerId, endCustomer } = req.body;

    if (!partnerId) {
      return res.status(400).json({ message: "partnerId is required" });
    }
    if (!endCustomer || !endCustomer.endCustomerName?.trim()) {
      return res.status(400).json({ message: "endCustomer.endCustomerName is required" });
    }

    const partner = await findOwnedPartner(partnerId, req.salesRep.uid);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    const {
      endCustomerName,
      organizationName = "",
      customerAddress = "",
      city = "",
      state = "",
      contactPerson = "",
      designation = "",
      mobileNumber = "",
      emailId = "",
      industryVertical = "",
    } = endCustomer;

    const trimmedName = endCustomerName.trim();

    let endCustomerDoc = await EndCustomer.findOne({
      partner: partner._id,
      endCustomerName: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });

    if (endCustomerDoc) {
      endCustomerDoc.organizationName = organizationName || endCustomerDoc.organizationName;
      endCustomerDoc.customerAddress = customerAddress || endCustomerDoc.customerAddress;
      endCustomerDoc.city = city || endCustomerDoc.city;
      endCustomerDoc.state = state || endCustomerDoc.state;
      endCustomerDoc.contactPerson = contactPerson || endCustomerDoc.contactPerson;
      endCustomerDoc.designation = designation || endCustomerDoc.designation;
      endCustomerDoc.mobileNumber = mobileNumber || endCustomerDoc.mobileNumber;
      endCustomerDoc.emailId = emailId || endCustomerDoc.emailId;
      endCustomerDoc.industryVertical = industryVertical || endCustomerDoc.industryVertical;
      await endCustomerDoc.save();
    } else {
      endCustomerDoc = await EndCustomer.create({
        partner: partner._id,
        endCustomerName: trimmedName,
        organizationName,
        customerAddress,
        city,
        state,
        contactPerson,
        designation,
        mobileNumber,
        emailId,
        industryVertical,
        createdBy: req.salesRep.uid,
      });
    }

    return res.status(201).json({
      partner,
      endCustomer: endCustomerDoc,
      endCustomerId: endCustomerDoc._id,
    });
  } catch (err) {
    console.error("Project lock error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/project-lock/partners/:partnerId/history", verifySalesToken, async (req, res) => {
  try {
    const { partnerId } = req.params;

    const partner = await findOwnedPartner(partnerId, req.salesRep.uid);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    const quotations = await SalesQuotation.find({ customer: partner._id })
      .populate("endCustomer")
      .sort({ createdAt: -1 });

    const analytics = {
      totalProjects: quotations.length,
      accepted: 0,
      pending: 0,
      rejected: 0,
      negotiation: 0,
      counterOffer: 0,
      totalBusiness: 0,
      lastProjectDate: quotations[0]?.createdAt || null,
    };

    const history = quotations.map((q) => {
      const label = mapStatusToLabel(q.status);

      switch (label) {
        case "Accepted":
          analytics.accepted += 1;
          analytics.totalBusiness += Number(q.negotiatedAmount ?? q.grandTotal) || 0;
          break;
        case "Rejected":
          analytics.rejected += 1;
          break;
        case "Negotiation Running":
          analytics.negotiation += 1;
          break;
        case "Counter Offer":
          analytics.counterOffer += 1;
          break;
        default:
          analytics.pending += 1;
      }

      return {
        quotationNumber: q.quotationNumber,
        endCustomer: q.endCustomer || null,
        products: q.items.map((i) => i.name),
        amount: q.negotiatedAmount ?? q.grandTotal,
        status: label,
        date: q.createdAt,
      };
    });

    return res.json({ analytics, history });
  } catch (err) {
    console.error("Partner history error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/project-lock/partners/:partnerId/end-customers", verifySalesToken, async (req, res) => {
  try {
    const { partnerId } = req.params;

    const partner = await findOwnedPartner(partnerId, req.salesRep.uid);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    const endCustomers = await EndCustomer.find({ partner: partner._id }).sort({
      createdAt: -1,
    });

    return res.json(endCustomers);
  } catch (err) {
    console.error("Partner end-customers error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;