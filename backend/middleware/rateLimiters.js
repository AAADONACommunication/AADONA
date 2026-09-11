const rateLimit = require("express-rate-limit");

// Public form submissions - 10 requests per 15 min per IP
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});

// Datasheet PDF route - 30 per 15 min
const pdfLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many PDF requests. Please try again later." },
});

// Analytics / admin routes - 60 per 15 min
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
});

module.exports = { formLimiter, pdfLimiter, adminLimiter };
