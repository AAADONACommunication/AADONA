const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const { adminLimiter } = require("../middleware/rateLimiters");
const AuditLog = require("../models/AuditLog");

router.get("/audit-logs", verifyToken, adminLimiter, async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(500);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
