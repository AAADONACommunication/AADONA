const express = require("express");
const router = express.Router();
const Customer = require("../models/Customer");
const verifySalesToken = require("../middleware/verifySalesToken");

// ── GET ALL CUSTOMERS (apne sirf) ──
router.get("/customers", verifySalesToken, async (req, res) => {
  try {
    const customers = await Customer.find({ salesRepUid: req.salesRep.uid })
      .sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADD CUSTOMER ──
router.post("/customers", verifySalesToken, async (req, res) => {
  try {
    const { companyName, personalName, contactNumber, email, city, pinCode, address } = req.body;

    if (!personalName || !contactNumber || !email) {
      return res.status(400).json({ message: "Personal name, contact number and email are required" });
    }

    const customer = await Customer.create({
      salesRepUid: req.salesRep.uid,
      companyName: companyName || "",
      personalName,
      contactNumber,
      email,
      city: city || "",
      pinCode: pinCode || "",
      address: address || "",
      partnerType: partnerType || "",
      gstNumber: gstNumber || "",
    });

    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── UPDATE CUSTOMER ──
router.put("/customers/:id", verifySalesToken, async (req, res) => {
  try {
    // salesRepUid check — doosre ka customer update na ho sake
    const customer = await Customer.findOne({
      _id: req.params.id,
      salesRepUid: req.salesRep.uid,
    });

    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const { companyName, personalName, contactNumber, email, city, pinCode, address } = req.body;

    if (!personalName || !contactNumber || !email) {
      return res.status(400).json({ message: "Personal name, contact number and email are required" });
    }

    const updated = await Customer.findByIdAndUpdate(
      req.params.id,
      { companyName, personalName, contactNumber, email, city, pinCode, address, partnerType, gstNumber },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE CUSTOMER ──
router.delete("/customers/:id", verifySalesToken, async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      salesRepUid: req.salesRep.uid,
    });

    if (!customer) return res.status(404).json({ message: "Customer not found" });

    await Customer.findByIdAndDelete(req.params.id);
    res.json({ message: "Customer deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;