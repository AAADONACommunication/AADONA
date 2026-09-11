const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const startQuotationReminderCron = require("./cron/quotationReminders");
const { getBrowser, closeBrowser } = require("./helpers/browserPool");

const app = express();

/* =============================
   MIDDLEWARE
============================= */

app.use(
  cors({
    origin: [
      "https://aadona.co.in",
      "https://www.aadona.co.in",
      "https://aadona.com",
      "https://www.aadona.com",
      "https://aadona.online",
      "https://www.aadona.online",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));
app.use("/assets", express.static("assets"));
app.use("/uploads", express.static("uploads"));

/* =============================
   ROUTES
============================= */

// Existing / already-modular routes
app.use("/api", require("./routes/chatbot"));
app.use("/api", require("./routes/sales"));
app.use("/api", require("./routes/customers"));
app.use("/api", require("./routes/quotations"));
app.use("/api", require("./routes/adminQuotations"));
app.use("/api", require("./routes/salesQuotations"));
app.use("/api", require("./routes/projectLock"));
app.use("/api/public", require("./routes/publicQuotation"));
app.use("/api", require("./routes/adminApprovals"));
app.use("/api/admin/sales", require("./routes/adminSales"));
app.use("/api", require("./routes/salesOnlyProducts"));

// Newly split-out routes (see backend/routes/*.js)
app.use("/api", require("./routes/upload"));
app.use("/api", require("./routes/categories"));
app.use("/api", require("./routes/products"));
app.use("/api", require("./routes/otp"));
app.use("/api", require("./routes/adminAccounts"));
app.use("/api", require("./routes/relatedProducts"));
app.use("/api", require("./routes/blogs"));
app.use("/api", require("./routes/blogAutomation"));
app.use("/api", require("./routes/inquiries"));
app.use("/api", require("./routes/auditLogs"));
app.use("/api", require("./routes/analytics"));
app.use("/api", require("./routes/formSubmissions"));
app.use("/api", require("./routes/newsletter"));

// Root, test-mail, blog OG-preview share links (no /api prefix)
app.use("/", require("./routes/misc"));

// SEO / Security headers for all responses
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

/* =============================
   DATABASE CONNECTION
============================= */

if (!process.env.MONGO_URL) {
  console.log("MONGO_URL not found in .env");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("MongoDB VPS Connected");
    console.log("Connected Database:", mongoose.connection.name);
    startQuotationReminderCron();
  })
  .catch((err) => {
    console.log("MongoDB Connection Error:", err.message);
  });

/* =============================
   GRACEFUL SHUTDOWN
============================= */

process.on("SIGINT", async () => {
  await closeBrowser();
  console.log("Puppeteer browser closed");
  process.exit();
});

// Serve the built frontend (must stay LAST - catch-all fallback for SPA routing)
app.use(express.static(path.join(__dirname, "../dist")));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(__dirname, "../dist", "index.html"));
});

/* =============================
   START SERVER
============================= */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
