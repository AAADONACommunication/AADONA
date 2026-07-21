const SalesQuotation = require("../models/SalesQuotation");

// ── GET /admin/sales/:uid/insights ──
router.get("/:uid/insights", verifyAdminToken, async (req, res) => {
  try {
    const { uid } = req.params;

    const quotations = await SalesQuotation.find({ salesRepUid: uid })
      .populate("customer")
      .populate("endCustomer")
      .sort({ createdAt: -1 });

    res.json(quotations);
  } catch (err) {
    console.error("Admin sales insights error:", err);
    res.status(500).json({ message: "Failed to load insights" });
  }
});