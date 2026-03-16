const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const admin = require("./firebaseAdmin");
const multer = require("multer");
const crypto = require("crypto");
const dns = require("dns").promises;
const transporter = require("./mailer");
const puppeteer = require("puppeteer-core");
require("dotenv").config();
const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const analyticsClient = new BetaAnalyticsDataClient();

const app = express();

/* =============================
   MULTER SETUP FOR FILE UPLOADS
============================= */

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

/* =============================
   EMAIL MX DOMAIN VALIDATOR
============================= */

const isEmailDomainValid = async (email) => {
  try {
    if (!email || !email.includes("@")) return false;
    const domain = email.split("@")[1];
    if (!domain) return false;
    const records = await dns.resolveMx(domain);
    return records && records.length > 0;
  } catch {
    return false;
  }
};

/* =============================
   FIREBASE STORAGE HELPER
============================= */

const getFirebasePath = (url) => {
  if (!url || typeof url !== "string") return null;
  try {
    const match = url.match(/\/o\/(.+?)(\?|$)/);
    if (!match) {
      console.log("Could not extract path from URL:", url);
      return null;
    }
    const path = decodeURIComponent(match[1]);
    return path;
  } catch (e) {
    console.log("getFirebasePath error:", e.message);
    return null;
  }
};

const deleteFromFirebase = async (url) => {
  if (!url || typeof url !== "string") return;
  if (!url.includes("firebasestorage.googleapis.com") && !url.includes("firebasestorage.app")) return;

  const path = getFirebasePath(url);
  if (!path) return;

  try {
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      console.log("FIREBASE_STORAGE_BUCKET not set in .env");
      return;
    }
    await admin.storage().bucket(bucketName).file(path).delete();
    console.log("Firebase deleted:", path);
  } catch (e) {
    if (e.code === 404) {
      console.log("File already gone:", path);
    } else {
      console.log("Firebase delete failed:", e.code, "-", e.message);
    }
  }
};

/* =============================
   FIREBASE UPLOAD HELPER
============================= */

const uploadToFirebase = async (file, folder) => {
  if (!file) return null;
  const bucket = admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
  const fileName = `${folder}/${Date.now()}-${file.originalname}`;
  const fileUpload = bucket.file(fileName);
  await fileUpload.save(file.buffer, {
    metadata: { contentType: file.mimetype },
  });
  await fileUpload.makePublic();
  return `https://firebasestorage.googleapis.com/v0/b/${process.env.FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(fileName)}?alt=media`;
};

/* =============================
   VERIFY TOKEN MIDDLEWARE
============================= */

const otpStore = new Map();

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("No token provided");
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);

    if (decodedToken.admin !== true) {
      console.log("Not Admin:", decodedToken.email);
      return res.status(403).json({ message: "Not authorized as admin" });
    }

    req.user = decodedToken;
    console.log("Admin Verified:", decodedToken.email);
    next();
  } catch (error) {
    console.log("TOKEN ERROR:", error.message);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

/* =============================
   MIDDLEWARE
============================= */

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

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
  })
  .catch((err) => {
    console.log("MongoDB Connection Error:", err.message);
  });

/* =============================
   MODELS
============================= */

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    features: { type: [String], default: [] },
    slug: { type: String, required: true, unique: true },
    image: { type: String, required: true },
    datasheet: { type: String },
    type: { type: String, required: true },
    category: { type: String, required: true },
    subCategory: { type: String, required: true },
    extraCategory: { type: String, default: null },
    model: { type: String },
    fullName: { type: String },
    series: { type: String },
    highlights: { type: [String], default: [] },
    overview: {
      title: { type: String, default: "Product Overview" },
      content: { type: String },
    },
    featuresDetail: [
      {
        iconType: { type: String },
        title: { type: String },
        description: { type: String },
      },
    ],
    specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", ProductSchema);

const RelatedProductSchema = new mongoose.Schema(
  {
    type: { type: String, default: null },
    category: { type: String, required: true },
    subCategory: { type: String, required: true },
    extraCategory: { type: String, default: null },
    relatedProducts: { type: [String], default: [] },
  },
  { timestamps: true }
);

const RelatedProduct = mongoose.model("RelatedProduct", RelatedProductSchema);

const CategorySchema = new mongoose.Schema(
  {
    type: { type: String, required: true, enum: ["active", "passive"] },
    name: { type: String, required: true },
    subCategories: [
      {
        name: { type: String, required: true },
        extraCategories: { type: [String], default: [] },
      },
    ],
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Category = mongoose.model("Category", CategorySchema);

const BlogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String, required: true },
    author: { type: String, default: "Pinakii Chatterje" },
    date: { type: String },
    readTime: { type: String, default: "3 min read" },
    image: { type: String, required: true },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
    blocks: [
      {
        type: { type: String, enum: ["text", "image"], required: true },
        content: { type: String },
        url: { type: String },
        caption: { type: String },
      },
    ],
    comments: [
      {
        name: { type: String, required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Blog = mongoose.model("Blog", BlogSchema);

const InquirySchema = new mongoose.Schema(
  {
    formType: { type: String, required: true },
    customerName: { type: String, default: "Unknown" },
    customerEmail: { type: String, default: "" },
    formData: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, enum: ["new", "read", "replied"], default: "new" },
    replies: [
      {
        message: { type: String, required: true },
        sentBy: { type: String },
        sentAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Inquiry = mongoose.model("Inquiry", InquirySchema);

/* =============================
   AUDIT LOG SCHEMA
============================= */

const AuditLogSchema = new mongoose.Schema({
  adminEmail: { type: String, required: true },
  action:     { type: String, required: true },
  entity:     { type: String, required: true },
  entityName: { type: String, default: "" },
  details:    { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

const AuditLog = mongoose.model("AuditLog", AuditLogSchema);

const logAction = (adminEmail, action, entity, entityName = "", details = {}) => {
  AuditLog.create({ adminEmail, action, entity, entityName, details })
    .catch(err => console.log("Audit log failed:", err.message));
};

/* =============================
   DIFF HELPER — compare two objects
============================= */

const getDiff = (oldObj, newObj, fields) => {
  const changes = {};
  fields.forEach(field => {
    const oldVal = oldObj[field];
    const newVal = newObj[field];
    if (newVal !== undefined && String(newVal) !== String(oldVal)) {
      changes[field] = { old: oldVal, new: newVal };
    }
  });
  return changes;
};

const getArrayDiff = (oldArr = [], newArr = []) => {
  const added = newArr.filter(x => !oldArr.includes(x));
  const removed = oldArr.filter(x => !newArr.includes(x));
  return { added, removed };
};

/* =============================
   SLUG GENERATOR
============================= */

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^\w]+/g, "");
};

/* =============================
   PDF BROCHURE HTML TEMPLATE
============================= */

const buildDatasheetHTML = (product) => {
  const companyLogoUrl = process.env.COMPANY_LOGO_URL || "";
  const companyName = process.env.COMPANY_NAME || "AADONA";
  const companyWebsite = process.env.COMPANY_WEBSITE || "www.aadona.online";
  const companyEmail = process.env.COMPANY_EMAIL || "";
  const primaryColor = process.env.PDF_PRIMARY_COLOR || "#166534";
  const accentColor = process.env.PDF_ACCENT_COLOR || "#16a34a";

  // Specifications table rows
  const specsHTML = product.specifications && Object.keys(product.specifications).length
    ? Object.entries(product.specifications).map(([section, specs]) => `
        <div class="spec-section">
          <div class="spec-section-title">${section}</div>
          <table class="spec-table">
            ${Object.entries(specs || {}).map(([key, value], i) => `
              <tr class="${i % 2 === 0 ? "spec-row-even" : "spec-row-odd"}">
                <td class="spec-key">${key}</td>
                <td class="spec-val">${value}</td>
              </tr>
            `).join("")}
          </table>
        </div>
      `).join("")
    : "<p style='color:#888;font-style:italic;'>No specifications available.</p>";

  // Features / highlights list
  const highlightsHTML = (product.highlights || []).length
    ? `<ul class="features-list">${(product.highlights || []).map(h => `<li>${h}</li>`).join("")}</ul>`
    : "<p style='color:#888;font-style:italic;'>No highlights listed.</p>";

  // featuresDetail cards
  const featureCardsHTML = (product.featuresDetail || []).length
    ? `<div class="feat-cards">${(product.featuresDetail || []).map(f => `
        <div class="feat-card">
          <div class="feat-card-title">${f.title || ""}</div>
          <div class="feat-card-desc">${f.description || ""}</div>
        </div>
      `).join("")}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${product.name} — Datasheet</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Arial', sans-serif;
      color: #1a1a1a;
      background: #fff;
      font-size: 12px;
    }

    /* ---- COVER HEADER ---- */
    .cover-header {
      background: ${primaryColor};
      color: #fff;
      padding: 32px 48px 28px 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .cover-logo {
      height: 52px;
      object-fit: contain;
    }

    .cover-company {
      font-size: 22px;
      font-weight: bold;
      letter-spacing: 3px;
      color: #fff;
    }

    .cover-tagline {
      font-size: 10px;
      color: rgba(255,255,255,0.7);
      margin-top: 4px;
      letter-spacing: 1px;
    }

    /* ---- PRODUCT HERO SECTION ---- */
    .hero {
      display: flex;
      padding: 36px 48px;
      gap: 36px;
      border-bottom: 3px solid ${accentColor};
      background: #f9fafb;
    }

    .hero-image-wrap {
      flex: 0 0 260px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 20px;
    }

    .hero-image {
      max-width: 220px;
      max-height: 200px;
      object-fit: contain;
    }

    .hero-info {
      flex: 1;
    }

    .hero-category {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${accentColor};
      font-weight: bold;
      margin-bottom: 8px;
    }

    .hero-name {
      font-size: 26px;
      font-weight: bold;
      color: ${primaryColor};
      line-height: 1.2;
      margin-bottom: 6px;
    }

    .hero-model {
      font-size: 14px;
      color: #555;
      margin-bottom: 12px;
      font-weight: 600;
    }

    .hero-desc {
      font-size: 12px;
      color: #444;
      line-height: 1.7;
      max-width: 520px;
    }

    .hero-badges {
      display: flex;
      gap: 10px;
      margin-top: 16px;
      flex-wrap: wrap;
    }

    .badge {
      background: ${primaryColor};
      color: #fff;
      font-size: 10px;
      padding: 4px 12px;
      border-radius: 20px;
      font-weight: bold;
      letter-spacing: 0.5px;
    }

    .badge-outline {
      border: 1.5px solid ${primaryColor};
      color: ${primaryColor};
      background: transparent;
      font-size: 10px;
      padding: 4px 12px;
      border-radius: 20px;
      font-weight: bold;
    }

    /* ---- CONTENT SECTIONS ---- */
    .content {
      padding: 0 48px 48px 48px;
    }

    .section {
      margin-top: 36px;
    }

    .section-title {
      font-size: 15px;
      font-weight: bold;
      color: ${primaryColor};
      border-left: 4px solid ${accentColor};
      padding-left: 10px;
      margin-bottom: 14px;
      letter-spacing: 0.5px;
    }

    /* ---- OVERVIEW ---- */
    .overview-box {
      background: #f0fdf4;
      border-radius: 8px;
      padding: 18px 22px;
      color: #374151;
      line-height: 1.8;
      font-size: 12px;
    }

    /* ---- FEATURES LIST ---- */
    .features-list {
      list-style: none;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
      padding: 0;
    }

    .features-list li {
      padding: 6px 10px 6px 22px;
      position: relative;
      font-size: 12px;
      color: #374151;
      line-height: 1.5;
      background: #f9fafb;
      border-radius: 4px;
    }

    .features-list li::before {
      content: "✔";
      position: absolute;
      left: 6px;
      color: ${accentColor};
      font-size: 10px;
      top: 7px;
    }

    /* ---- FEATURE DETAIL CARDS ---- */
    .feat-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-top: 4px;
    }

    .feat-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-top: 3px solid ${accentColor};
      border-radius: 6px;
      padding: 14px;
    }

    .feat-card-title {
      font-weight: bold;
      font-size: 12px;
      color: ${primaryColor};
      margin-bottom: 6px;
    }

    .feat-card-desc {
      font-size: 11px;
      color: #555;
      line-height: 1.5;
    }

    /* ---- SPECS TABLE ---- */
    .spec-section {
      margin-bottom: 20px;
    }

    .spec-section-title {
      font-size: 12px;
      font-weight: bold;
      color: #fff;
      background: ${primaryColor};
      padding: 7px 12px;
      border-radius: 4px 4px 0 0;
    }

    .spec-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #e5e7eb;
      border-top: none;
    }

    .spec-row-even { background: #f9fafb; }
    .spec-row-odd  { background: #fff; }

    .spec-key {
      padding: 7px 12px;
      font-weight: bold;
      color: #374151;
      width: 40%;
      font-size: 11px;
      border-right: 1px solid #e5e7eb;
    }

    .spec-val {
      padding: 7px 12px;
      color: #555;
      font-size: 11px;
    }

    /* ---- FOOTER ---- */
    .footer {
      background: ${primaryColor};
      color: rgba(255,255,255,0.85);
      padding: 18px 48px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      margin-top: 40px;
    }

    .footer-brand {
      font-weight: bold;
      font-size: 13px;
      color: #fff;
      letter-spacing: 2px;
    }

    .footer-info {
      text-align: right;
      line-height: 1.8;
    }

    /* ---- PAGE BREAK HELPER ---- */
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>

  <!-- COVER HEADER -->
  <div class="cover-header">
    ${companyLogoUrl
      ? `<img src="${companyLogoUrl}" class="cover-logo" alt="${companyName} Logo" />`
      : `<div class="cover-company">${companyName}</div>`
    }
    <div style="text-align:right;">
      <div class="cover-company">${companyName}</div>
      <div class="cover-tagline">PRODUCT DATASHEET</div>
    </div>
  </div>

  <!-- HERO SECTION -->
  <div class="hero">
    <div class="hero-image-wrap">
      ${product.image
        ? `<img src="${product.image}" class="hero-image" alt="${product.name}" />`
        : `<div style="color:#ccc;font-size:11px;text-align:center;">No Image</div>`
      }
    </div>
    <div class="hero-info">
      <div class="hero-category">${product.category} › ${product.subCategory}${product.extraCategory ? " › " + product.extraCategory : ""}</div>
      <div class="hero-name">${product.name}</div>
      ${product.model ? `<div class="hero-model">Model: ${product.model}</div>` : ""}
      ${product.series ? `<div style="font-size:11px;color:#888;margin-bottom:10px;">Series: ${product.series}</div>` : ""}
      <div class="hero-desc">${product.description}</div>
      <div class="hero-badges">
        <span class="badge">${product.type.toUpperCase()}</span>
        <span class="badge-outline">${product.category}</span>
        ${product.series ? `<span class="badge-outline">${product.series} Series</span>` : ""}
      </div>
    </div>
  </div>

  <!-- MAIN CONTENT -->
  <div class="content">

    <!-- OVERVIEW -->
    ${product.overview?.content ? `
    <div class="section">
      <div class="section-title">${product.overview?.title || "Product Overview"}</div>
      <div class="overview-box">${product.overview.content}</div>
    </div>
    ` : ""}

    <!-- KEY FEATURES -->
    ${(product.highlights || []).length ? `
    <div class="section">
      <div class="section-title">Key Features</div>
      ${highlightsHTML}
    </div>
    ` : ""}

    <!-- FEATURE DETAILS -->
    ${(product.featuresDetail || []).length ? `
    <div class="section">
      <div class="section-title">Feature Details</div>
      ${featureCardsHTML}
    </div>
    ` : ""}

    <!-- SPECIFICATIONS -->
    ${product.specifications && Object.keys(product.specifications).length ? `
    <div class="section page-break">
      <div class="section-title">Technical Specifications</div>
      ${specsHTML}
    </div>
    ` : ""}

  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div>
      <div class="footer-brand">${companyName}</div>
      <div style="margin-top:4px;">Product Datasheet — ${product.name}</div>
    </div>
    <div class="footer-info">
      <div>${companyWebsite}</div>
      ${companyEmail ? `<div>${companyEmail}</div>` : ""}
      <div>Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
    </div>
  </div>

</body>
</html>`;
};

/* =============================
   ROUTES
============================= */

app.get("/", (req, res) => {
  res.send("API Running 🚀");
});

/* =============================
   CATEGORY ROUTES
============================= */

app.get("/categories", async (req, res) => {
  try {
    const { type } = req.query;
    const query = type ? { type } : {};
    const categories = await Category.find(query).sort({ order: 1, createdAt: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/categories", verifyToken, async (req, res) => {
  try {
    const { type, name, subCategories, order } = req.body;
    if (!type || !name) return res.status(400).json({ message: "type and name are required" });

    const existing = await Category.findOne({ type, name });
    if (existing) return res.status(400).json({ message: "Category already exists" });

    const maxOrderDoc = await Category.findOne({ type }).sort({ order: -1 });
    const newOrder = maxOrderDoc ? maxOrderDoc.order + 1 : 0;

    const category = await Category.create({
      type,
      name,
      subCategories: subCategories || [],
      order: order !== undefined ? order : newOrder,
    });

    logAction(req.user.email, "CREATE", "Category", category.name, {
      changes: { type: { new: type }, name: { new: name } }
    });

    console.log("Category created:", category.name);
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/categories/reorder", verifyToken, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ message: "items array required" });

    await Promise.all(
      items.map(({ id, order }) =>
        Category.findByIdAndUpdate(id, { $set: { order } })
      )
    );

    logAction(req.user.email, "UPDATE", "Category", "Reorder", {
      changes: { reordered: { new: `${items.length} categories reordered` } }
    });

    console.log("Categories reordered:", items.length, "items");
    res.json({ message: "Reordered successfully" });
  } catch (err) {
    console.log("Reorder error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put("/categories/:id/rename", verifyToken, async (req, res) => {
  try {
    const { newName } = req.body;
    if (!newName || !newName.trim()) return res.status(400).json({ message: "newName is required" });

    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const oldName = category.name;
    const trimmedNew = newName.trim();
    if (oldName === trimmedNew) return res.json(category);

    category.name = trimmedNew;
    await category.save();

    await Product.updateMany({ category: oldName }, { $set: { category: trimmedNew } });
    await RelatedProduct.updateMany({ category: oldName }, { $set: { category: trimmedNew } });

    logAction(req.user.email, "UPDATE", "Category", trimmedNew, {
      changes: { name: { old: oldName, new: trimmedNew } }
    });

    console.log(`Category renamed: "${oldName}" to "${trimmedNew}"`);
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/categories/:id/subcategory/:subName/rename", verifyToken, async (req, res) => {
  try {
    const { newName } = req.body;
    if (!newName || !newName.trim()) return res.status(400).json({ message: "newName is required" });

    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const oldSubName = decodeURIComponent(req.params.subName);
    const trimmedNew = newName.trim();
    const sub = category.subCategories.find(s => s.name === oldSubName);
    if (!sub) return res.status(404).json({ message: "SubCategory not found" });
    if (oldSubName === trimmedNew) return res.json(category);

    sub.name = trimmedNew;
    await category.save();

    await Product.updateMany(
      { category: category.name, subCategory: oldSubName },
      { $set: { subCategory: trimmedNew } }
    );
    await RelatedProduct.updateMany(
      { category: category.name, subCategory: oldSubName },
      { $set: { subCategory: trimmedNew } }
    );

    logAction(req.user.email, "UPDATE", "Category", `${category.name} > ${trimmedNew}`, {
      changes: { subCategory: { old: oldSubName, new: trimmedNew } }
    });

    console.log(`SubCategory renamed: "${oldSubName}" to "${trimmedNew}"`);
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/categories/:id/subcategory/:subName/extra/rename", verifyToken, async (req, res) => {
  try {
    const { oldExtra, newExtra } = req.body;
    if (!oldExtra || !newExtra || !newExtra.trim()) return res.status(400).json({ message: "oldExtra and newExtra are required" });

    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const subName = decodeURIComponent(req.params.subName);
    const sub = category.subCategories.find(s => s.name === subName);
    if (!sub) return res.status(404).json({ message: "SubCategory not found" });

    const trimmedNew = newExtra.trim();
    const idx = sub.extraCategories.indexOf(oldExtra);
    if (idx === -1) return res.status(404).json({ message: "Extra category not found" });
    if (oldExtra === trimmedNew) return res.json(category);

    sub.extraCategories[idx] = trimmedNew;
    await category.save();

    await Product.updateMany(
      { category: category.name, subCategory: subName, extraCategory: oldExtra },
      { $set: { extraCategory: trimmedNew } }
    );
    await RelatedProduct.updateMany(
      { category: category.name, subCategory: subName, extraCategory: oldExtra },
      { $set: { extraCategory: trimmedNew } }
    );

    logAction(req.user.email, "UPDATE", "Category", `${category.name} > ${subName}`, {
      changes: { extraCategory: { old: oldExtra, new: trimmedNew } }
    });

    console.log(`ExtraCategory renamed: "${oldExtra}" to "${trimmedNew}"`);
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/categories/:id", verifyToken, async (req, res) => {
  try {
    const updated = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Category not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const deleteProductsCascade = async (query) => {
  const products = await Product.find(query);
  for (const product of products) {
    await deleteFromFirebase(product.image);
    await deleteFromFirebase(product.datasheet);
    await Product.findByIdAndDelete(product._id);
    console.log("Cascade deleted product:", product.name);
  }
  await RelatedProduct.deleteMany(query);
};

app.delete("/categories/:id", verifyToken, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    await deleteProductsCascade({ category: category.name });
    await Category.findByIdAndDelete(req.params.id);

    logAction(req.user.email, "DELETE", "Category", category.name, {
      changes: { deleted: { old: category.name, new: "DELETED" } }
    });

    console.log("Category + all products deleted:", category.name);
    res.json({ message: "Category and all its products deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/categories/:id/subcategory", verifyToken, async (req, res) => {
  try {
    const { name, extraCategories } = req.body;
    if (!name) return res.status(400).json({ message: "SubCategory name required" });

    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const exists = category.subCategories.find(s => s.name === name);
    if (exists) return res.status(400).json({ message: "SubCategory already exists" });

    category.subCategories.push({ name, extraCategories: extraCategories || [] });
    await category.save();

    logAction(req.user.email, "CREATE", "Category", `${category.name} > ${name}`, {
      changes: { subCategory: { new: name }, extraCategories: { new: (extraCategories || []).join(", ") || "none" } }
    });

    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/categories/:id/subcategory/reorder", verifyToken, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const { orderedNames } = req.body;
    if (!Array.isArray(orderedNames)) return res.status(400).json({ message: "orderedNames array required" });

    const reordered = orderedNames
      .map(name => category.subCategories.find(s => s.name === name))
      .filter(Boolean);

    const missing = category.subCategories.filter(s => !orderedNames.includes(s.name));
    category.subCategories = [...reordered, ...missing];

    await category.save();

    logAction(req.user.email, "UPDATE", "Category", category.name, {
      changes: { subCategoryReorder: { new: orderedNames.join(" → ") } }
    });

    console.log("SubCategories reordered for category:", category.name);
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/categories/:id/subcategory/:subName", verifyToken, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const sub = category.subCategories.find(s => s.name === req.params.subName);
    if (!sub) return res.status(404).json({ message: "SubCategory not found" });

    const changes = {};
    if (req.body.name && req.body.name !== sub.name) {
      changes.name = { old: sub.name, new: req.body.name };
      sub.name = req.body.name;
    }
    if (req.body.extraCategories !== undefined) {
      const diff = getArrayDiff(sub.extraCategories, req.body.extraCategories);
      if (diff.added.length || diff.removed.length) {
        changes.extraCategories = {
          old: sub.extraCategories.join(", ") || "none",
          new: req.body.extraCategories.join(", ") || "none",
          added: diff.added,
          removed: diff.removed,
        };
      }
      sub.extraCategories = req.body.extraCategories;
    }

    await category.save();

    if (Object.keys(changes).length > 0) {
      logAction(req.user.email, "UPDATE", "Category", `${category.name} > ${req.params.subName}`, { changes });
    }

    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/categories/:id/subcategory/:subName", verifyToken, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const subName = decodeURIComponent(req.params.subName);

    await deleteProductsCascade({ category: category.name, subCategory: subName });

    category.subCategories = category.subCategories.filter(s => s.name !== subName);
    await category.save();

    logAction(req.user.email, "DELETE", "Category", `${category.name} > ${subName}`, {
      changes: { deleted: { old: `${category.name} > ${subName}`, new: "DELETED" } }
    });

    console.log("SubCategory + all products deleted:", subName);
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =============================
   PRODUCT ROUTES
============================= */

app.put("/products/reorder", verifyToken, async (req, res) => {
  console.log("REORDER ROUTE HIT");
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Items must be an array" });
    }

    const validItems = items.filter(item =>
      item.id && mongoose.Types.ObjectId.isValid(item.id)
    );

    if (validItems.length === 0) {
      return res.status(400).json({ error: "No valid product IDs provided" });
    }

    const bulkOps = validItems.map(item => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(item.id) },
        update: { $set: { order: item.order } }
      }
    }));

    await Product.bulkWrite(bulkOps);

    logAction(req.user.email, "UPDATE", "Product", "Reorder", {
      changes: { reordered: { new: `${validItems.length} products reordered` } }
    });

    console.log("Products reordered:", validItems.length, "items");
    res.json({ message: "Products reordered successfully" });
  } catch (err) {
    console.log("Product reorder error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/products", async (req, res) => {
  try {
    const { sort } = req.query;
    const sortOption = sort === "order" ? { order: 1 } : { createdAt: -1 };
    const products = await Product.find().sort(sortOption);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/products/:slug", async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =============================
   DATASHEET PDF ROUTE (Puppeteer)
============================= */

app.get("/products/:slug/datasheet", async (req, res) => {
  try {

    const product = await Product.findOne({ slug: req.params.slug });

    if (!product)
      return res.status(404).json({ message: "Product not found" });

    const html = buildDatasheetHTML(product);

    const browser = await puppeteer.launch({
      executablePath: process.env.CHROME_PATH || "/usr/bin/chromium-browser",
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${product.slug}.pdf`
    );

    res.send(pdf);

  } catch (err) {

    console.log("PDF ERROR:", err.message);

    res.status(500).json({
      error: "Failed to generate PDF",
    });

  }
});

app.post("/products", verifyToken, async (req, res) => {
  try {
    let baseSlug = generateSlug(req.body.name);
    let slug = baseSlug;
    let counter = 1;

    while (await Product.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const lastProduct = await Product.findOne().sort({ order: -1 });
    const nextOrder = lastProduct ? lastProduct.order + 1 : 0;

    const newProduct = await Product.create({ ...req.body, slug, order: nextOrder });

    logAction(req.user.email, "CREATE", "Product", newProduct.name, {
      changes: {
        name: { new: newProduct.name },
        category: { new: newProduct.category },
        subCategory: { new: newProduct.subCategory },
        type: { new: newProduct.type },
        model: { new: newProduct.model || "-" },
      }
    });

    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/products/:id", verifyToken, async (req, res) => {
  console.log(":id route hit with id:", req.params.id);
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Product not found" });

    if (req.body.image && req.body.image !== existing.image) {
      await deleteFromFirebase(existing.image);
      console.log("Old product image deleted from Firebase");
    }

    if (req.body.datasheet && req.body.datasheet !== existing.datasheet) {
      await deleteFromFirebase(existing.datasheet);
      console.log("Old product datasheet deleted from Firebase");
    }

    const changes = getDiff(existing, req.body, [
      "name", "description", "category", "subCategory", "extraCategory",
      "type", "model", "fullName", "series"
    ]);

    if (req.body.highlights) {
      const diff = getArrayDiff(existing.highlights || [], req.body.highlights);
      if (diff.added.length || diff.removed.length) {
        changes.highlights = {
          old: (existing.highlights || []).join(", ") || "none",
          new: req.body.highlights.join(", ") || "none",
          added: diff.added,
          removed: diff.removed,
        };
      }
    }

    if (req.body.overview) {
      if (req.body.overview.title !== existing.overview?.title) {
        changes["overview.title"] = { old: existing.overview?.title, new: req.body.overview.title };
      }
      if (req.body.overview.content !== existing.overview?.content) {
        changes["overview.content"] = {
          old: (existing.overview?.content || "").substring(0, 80) + "...",
          new: (req.body.overview.content || "").substring(0, 80) + "...",
        };
      }
    }

    if (req.body.specifications) {
      const oldSpecStr = JSON.stringify(existing.specifications || {});
      const newSpecStr = JSON.stringify(req.body.specifications || {});
      if (oldSpecStr !== newSpecStr) {
        const oldKeys = Object.keys(existing.specifications || {});
        const newKeys = Object.keys(req.body.specifications || {});
        changes.specifications = {
          old: `${oldKeys.length} sections`,
          new: `${newKeys.length} sections`,
        };
      }
    }

    if (req.body.image && req.body.image !== existing.image) {
      changes.image = { old: "Previous image", new: "New image uploaded" };
    }

    if (req.body.datasheet && req.body.datasheet !== existing.datasheet) {
      changes.datasheet = { old: "Previous datasheet", new: "New datasheet uploaded" };
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    logAction(req.user.email, "UPDATE", "Product", updated.name, { changes });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/products/:id", verifyToken, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    await deleteFromFirebase(product.image);
    await deleteFromFirebase(product.datasheet);
    await Product.findByIdAndDelete(req.params.id);

    logAction(req.user.email, "DELETE", "Product", product.name, {
      changes: {
        name: { old: product.name, new: "DELETED" },
        category: { old: product.category, new: "DELETED" },
        subCategory: { old: product.subCategory, new: "DELETED" },
      }
    });

    console.log("Product deleted:", product.name);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =============================
   OTP ROUTES
============================= */

app.post("/send-otp", verifyToken, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 2 * 60 * 1000;
    otpStore.set(email, { otp, expiresAt });

    await transporter.sendMail({
      from: `"Admin System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Admin Account OTP",
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:30px;border:1px solid #e5e7eb;border-radius:12px">
          <h2 style="color:#166534;margin-bottom:8px">Admin Account Verification</h2>
          <p style="color:#374151;margin-bottom:20px">Use the OTP below to verify your email and create your admin account:</p>
          <div style="font-size:38px;font-weight:bold;letter-spacing:12px;color:#166534;text-align:center;padding:20px;background:#f0fdf4;border-radius:10px;margin-bottom:20px">
            ${otp}
          </div>
          <p style="color:#6b7280;font-size:13px">This OTP expires in <strong>2 minutes</strong>. Do not share it with anyone.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:16px">If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    console.log(`OTP sent to: ${email}`);
    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Send OTP error:", err.message);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

app.post("/verify-otp", verifyToken, async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    const record = otpStore.get(email);
    if (!record) return res.status(400).json({ message: "OTP not found. Please request a new one." });

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    if (record.otp !== otp.toString()) {
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }

    otpStore.delete(email);
    console.log(`OTP verified for: ${email}`);
    res.json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error("Verify OTP error:", err.message);
    res.status(500).json({ message: "Failed to verify OTP" });
  }
});

/* =============================
   ADMIN ROUTES
============================= */

app.post("/create-admin", verifyToken, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const user = await admin.auth().createUser({ email, password });
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });

    logAction(req.user.email, "CREATE", "Admin", email, {
      changes: { email: { new: email } }
    });

    console.log(`Admin created: ${email}`);
    res.json({ message: "New Admin Created ✅" });
  } catch (error) {
    console.error("Create admin error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get("/get-admins", verifyToken, async (req, res) => {
  try {
    const listResult = await admin.auth().listUsers(100);
    const admins = listResult.users
      .filter(user => user.customClaims?.admin === true)
      .map(user => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || null,
        lastSignIn: user.metadata.lastSignInTime || null,
        createdAt: user.metadata.creationTime || null,
      }));

    console.log(`Fetched ${admins.length} admins`);
    res.json({ admins });
  } catch (err) {
    console.error("Get admins error:", err.message);
    res.status(500).json({ message: "Failed to fetch admins" });
  }
});

app.delete("/delete-admin/:uid", verifyToken, async (req, res) => {
  try {
    const { uid } = req.params;

    if (uid === req.user.uid) {
      return res.status(400).json({ message: "You cannot remove your own admin access." });
    }

    const userRecord = await admin.auth().getUser(uid);
    if (!userRecord.customClaims?.admin) {
      return res.status(400).json({ message: "This user is not an admin." });
    }

    await admin.auth().deleteUser(uid);

    logAction(req.user.email, "DELETE", "Admin", userRecord.email, {
      changes: { email: { old: userRecord.email, new: "DELETED" } }
    });

    console.log(`Admin permanently deleted. UID: ${uid}, Email: ${userRecord.email}`);
    res.json({ message: "Admin removed successfully ✅" });

  } catch (err) {
    console.error("Delete admin error:", err.message);
    if (err.code === "auth/user-not-found") {
      return res.status(404).json({ message: "User not found in Firebase." });
    }
    res.status(500).json({ message: "Failed to remove admin" });
  }
});

/* =============================
   RELATED PRODUCTS ROUTES
============================= */

app.post("/save-related-products", verifyToken, async (req, res) => {
  console.log("/save-related-products HIT");

  try {
    const { type, category, subCategory, extraCategory, relatedProducts } = req.body;

    if (!category || !subCategory) {
      return res.status(400).json({ message: "category and subCategory are required" });
    }

    if (!relatedProducts || relatedProducts.length === 0) {
      return res.status(400).json({ message: "Select at least one related product" });
    }

    const filter = {
      category,
      subCategory,
      extraCategory: extraCategory || null,
      type: type || null,
    };

    const existing = await RelatedProduct.findOne(filter);
    const oldRelated = existing ? existing.relatedProducts : [];

    const result = await RelatedProduct.findOneAndUpdate(
      filter,
      {
        $set: {
          type: type || null,
          category,
          subCategory,
          extraCategory: extraCategory || null,
        },
        $addToSet: { relatedProducts: { $each: relatedProducts } },
      },
      { upsert: true, new: true }
    );

    const diff = getArrayDiff(oldRelated.map(String), relatedProducts.map(String));
    logAction(req.user.email, "UPDATE", "Product", `Related: ${category} > ${subCategory}`, {
      changes: {
        relatedProducts: {
          old: `${oldRelated.length} products`,
          new: `${relatedProducts.length} products`,
          added: `${diff.added.length} added`,
          removed: `${diff.removed.length} removed`,
        }
      }
    });

    console.log("Saved successfully:", result._id);
    res.json({ message: "Related products saved successfully ✅", result });
  } catch (err) {
    console.log("Save Related Products Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/related-products", async (req, res) => {
  try {
    const { category, subCategory, extraCategory, type } = req.query;

    const query = { category, subCategory };
    if (extraCategory) query.extraCategory = extraCategory;
    if (type) query.type = type;

    const related = await RelatedProduct.findOne(query);
    if (!related) return res.json({ relatedProducts: [] });

    const products = await Product.find({ _id: { $in: related.relatedProducts } });
    res.json({ relatedProducts: products });
  } catch (err) {
    console.log("Get Related Products Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/related-products/raw", verifyToken, async (req, res) => {
  try {
    const { category, subCategory, extraCategory, type } = req.query;

    if (!category || !subCategory) {
      return res.status(400).json({ message: "category and subCategory are required" });
    }

    const query = {
      category,
      subCategory,
      extraCategory: extraCategory || null,
      type: type || null,
    };

    const related = await RelatedProduct.findOne(query);
    res.json({ relatedProducts: related ? related.relatedProducts : [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/related-products/remove", verifyToken, async (req, res) => {
  try {
    const { category, subCategory, extraCategory, type, productId } = req.body;

    if (!category || !subCategory || !productId) {
      return res.status(400).json({ message: "category, subCategory, and productId are required" });
    }

    const filter = {
      category,
      subCategory,
      extraCategory: extraCategory || null,
      type: type || null,
    };

    const related = await RelatedProduct.findOne(filter);
    if (!related) return res.status(404).json({ message: "Related products entry not found" });

    const before = related.relatedProducts.length;
    related.relatedProducts = related.relatedProducts.filter(
      id => id.toString() !== productId.toString()
    );
    await related.save();

    logAction(req.user.email, "UPDATE", "Product", `Related: ${category} > ${subCategory}`, {
      changes: {
        relatedProducts: {
          old: `${before} products`,
          new: `${related.relatedProducts.length} products`,
          removed: `Product ID: ${productId}`,
        }
      }
    });

    console.log(`Removed product ${productId} from related list. ${before} → ${related.relatedProducts.length}`);
    res.json({
      message: "Product removed from related list ✅",
      relatedProducts: related.relatedProducts,
    });
  } catch (err) {
    console.log("Remove from related error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* =============================
   BLOG ROUTES
============================= */

app.get("/blogs", async (req, res) => {
  try {
    const blogs = await Blog.find({ published: true }).sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/blogs/slug/:slug", async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, published: true });
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/blogs/slug/:slug/view", async (req, res) => {
  try {
    const blog = await Blog.findOneAndUpdate(
      { slug: req.params.slug, published: true },
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    res.json({ views: blog.views });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/blogs/slug/:slug/like", async (req, res) => {
  try {
    const blog = await Blog.findOneAndUpdate(
      { slug: req.params.slug, published: true },
      { $inc: { likes: 1 } },
      { new: true }
    );
    if (!blog) return res.status(404).json({ error: "Blog not found" });

    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.COMPANY_EMAIL,
      subject: `New Like on: "${blog.title}"`,
      html: `<p>Someone liked your blog <b>"${blog.title}"</b>.</p><p>Total likes now: <b>${blog.likes}</b></p>`,
    }).catch(() => {});

    res.json({ likes: blog.likes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/blogs/slug/:slug/comment", async (req, res) => {
  try {
    const { name, text } = req.body;
    if (!name || !text) return res.status(400).json({ error: "Name and text required" });

    const blog = await Blog.findOneAndUpdate(
      { slug: req.params.slug, published: true },
      { $push: { comments: { name, text, createdAt: new Date() } } },
      { new: true }
    );
    if (!blog) return res.status(404).json({ error: "Blog not found" });

    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.COMPANY_EMAIL,
      subject: `New Comment on: "${blog.title}"`,
      html: `
        <h3>New comment on <b>"${blog.title}"</b></h3>
        <p><b>From:</b> ${name}</p>
        <p><b>Comment:</b> ${text}</p>
        <p><small>Total comments: ${blog.comments.length}</small></p>
      `,
    }).catch(() => {});

    res.json({ comments: blog.comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/blogs/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/blogs", verifyToken, async (req, res) => {
  try {
    let baseSlug = generateSlug(req.body.title);
    let finalSlug = baseSlug;
    let counter = 1;

    while (await Blog.findOne({ slug: finalSlug })) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const blog = await Blog.create({ ...req.body, slug: finalSlug });

    logAction(req.user.email, "CREATE", "Blog", blog.title, {
      changes: {
        title: { new: blog.title },
        author: { new: blog.author },
        published: { new: blog.published },
      }
    });

    res.status(201).json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/blogs/:id", verifyToken, async (req, res) => {
  try {
    const existing = await Blog.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Blog not found" });

    if (req.body.image && req.body.image !== existing.image) {
      await deleteFromFirebase(existing.image);
      console.log("Old blog hero image deleted from Firebase");
    }

    if (req.body.blocks) {
      const newBlockUrls = new Set(
        req.body.blocks
          .filter(b => b.type === "image" && b.url)
          .map(b => b.url)
      );
      const oldBlockImages = (existing.blocks || [])
        .filter(b => b.type === "image" && b.url && !newBlockUrls.has(b.url));

      for (const block of oldBlockImages) {
        await deleteFromFirebase(block.url);
        console.log("Old blog block image deleted from Firebase:", block.url);
      }
    }

    const changes = getDiff(existing, req.body, ["title", "excerpt", "author", "readTime", "published", "date"]);

    if (req.body.image && req.body.image !== existing.image) {
      changes.image = { old: "Previous image", new: "New image uploaded" };
    }

    if (req.body.blocks) {
      const oldCount = (existing.blocks || []).length;
      const newCount = req.body.blocks.length;
      if (oldCount !== newCount) {
        changes.blocks = { old: `${oldCount} blocks`, new: `${newCount} blocks` };
      }
    }

    const updated = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    logAction(req.user.email, "UPDATE", "Blog", updated.title, { changes });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/blogs/:id", verifyToken, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    await deleteFromFirebase(blog.image);

    const blockImages = (blog.blocks || []).filter(b => b.type === "image" && b.url);
    for (const block of blockImages) {
      await deleteFromFirebase(block.url);
      console.log("Blog block image deleted from Firebase");
    }

    await Blog.findByIdAndDelete(req.params.id);

    logAction(req.user.email, "DELETE", "Blog", blog.title, {
      changes: {
        title: { old: blog.title, new: "DELETED" },
        author: { old: blog.author, new: "DELETED" },
      }
    });

    console.log("Blog deleted:", blog.title);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =============================
   INQUIRY ROUTES
============================= */

app.get("/inquiries", verifyToken, async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 });
    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/inquiries/:id/read", verifyToken, async (req, res) => {
  try {
    const inquiry = await Inquiry.findByIdAndUpdate(
      req.params.id,
      { status: "read" },
      { new: true }
    );
    if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });
    res.json(inquiry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/inquiries/:id/reply", verifyToken, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: "Message is required" });

    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });
    if (!inquiry.customerEmail) return res.status(400).json({ message: "No customer email found" });

    await transporter.sendMail({
      from: `"AADONA Support" <${process.env.EMAIL_USER}>`,
      to: inquiry.customerEmail,
      subject: `Re: Your ${inquiry.formType} inquiry`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;border:1px solid #e5e7eb;border-radius:12px">
          <h2 style="color:#166534">AADONA Response</h2>
          <p>Dear ${inquiry.customerName},</p>
          <div style="background:#f0fdf4;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #16a34a">
            ${message}
          </div>
          <p style="color:#6b7280;font-size:13px">This is regarding your <b>${inquiry.formType}</b> inquiry submitted on ${new Date(inquiry.createdAt).toDateString()}.</p>
          <p style="color:#166534;font-weight:bold">Team AADONA</p>
        </div>
      `,
    });

    inquiry.replies.push({ message, sentBy: req.user.email, sentAt: new Date() });
    inquiry.status = "replied";
    await inquiry.save();

    console.log(`Reply sent to: ${inquiry.customerEmail}`);
    res.json({ message: "Reply sent successfully ✅", inquiry });
  } catch (err) {
    console.error("Reply error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/inquiries/:id", verifyToken, async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

    const attachmentUrl = inquiry.formData?.attachmentUrl;
    if (attachmentUrl) {
      await deleteFromFirebase(attachmentUrl);
      console.log("🗑️ Inquiry attachment deleted from Firebase");
    }

    await Inquiry.findByIdAndDelete(req.params.id);
    res.json({ message: "Inquiry deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =============================
   AUDIT LOG ROUTE
============================= */

app.get("/audit-logs", verifyToken, async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(500);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =============================
   ANALYTICS ROUTE
============================= */

app.get("/analytics/summary", verifyToken, async (req, res) => {
  try {
    const propertyId = process.env.GA_PROPERTY_ID;

    const { range } = req.query;

    let startDate, endDate, dailyRange, dailyDimension;
    endDate = "today";

    switch (range) {
      case "7days":
        startDate = "7daysAgo";
        dailyRange = "7daysAgo";
        dailyDimension = "date";
        break;
      case "30days":
        startDate = "30daysAgo";
        dailyRange = "30daysAgo";
        dailyDimension = "date";
        break;
      case "90days":
        startDate = "90daysAgo";
        dailyRange = "90daysAgo";
        dailyDimension = "yearWeek";
        break;
      case "6months":
        startDate = "180daysAgo";
        dailyRange = "180daysAgo";
        dailyDimension = "yearMonth";
        break;
      case "1year":
        startDate = "365daysAgo";
        dailyRange = "365daysAgo";
        dailyDimension = "yearMonth";
        break;
      default:
        startDate = "30daysAgo";
        dailyRange = "30daysAgo";
        dailyDimension = "date";
    }

    const dateRanges = [{ startDate, endDate }];

    const [
      [summaryReport],
      [topPagesReport],
      [devicesReport],
      [countriesReport],
      [citiesReport],
      [trafficSourceReport],
      [trendReport],
    ] = await Promise.all([
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: "totalUsers" },
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
          { name: "sessions" },
          { name: "bounceRate" },
          { name: "newUsers" },
        ],
      }),
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 8,
      }),
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "sessions" }],
      }),
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        dimensions: [{ name: "country" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 8,
      }),
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        dimensions: [{ name: "city" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 8,
      }),
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      }),
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: dailyRange, endDate }],
        dimensions: [{ name: dailyDimension }],
        metrics: [{ name: "sessions" }, { name: "totalUsers" }],
        orderBys: [{ dimension: { dimensionName: dailyDimension } }],
      }),
    ]);

    const metrics = summaryReport.rows?.[0]?.metricValues || [];

    res.json({
      range: range || "30days",
      totalUsers: metrics[0]?.value || "0",
      pageViews: metrics[1]?.value || "0",
      avgSessionDuration: Math.round(parseFloat(metrics[2]?.value || "0")) + "s",
      sessions: metrics[3]?.value || "0",
      bounceRate: (parseFloat(metrics[4]?.value || "0") * 100).toFixed(1) + "%",
      newUsers: metrics[5]?.value || "0",

      topPages: (topPagesReport.rows || []).map(r => ({
        page: r.dimensionValues[0].value,
        views: r.metricValues[0].value,
      })),

      devices: (devicesReport.rows || []).map(r => ({
        device: r.dimensionValues[0].value,
        sessions: r.metricValues[0].value,
      })),

      countries: (countriesReport.rows || []).map(r => ({
        country: r.dimensionValues[0].value,
        sessions: r.metricValues[0].value,
      })),

      cities: (citiesReport.rows || []).map(r => ({
        city: r.dimensionValues[0].value,
        sessions: r.metricValues[0].value,
      })),

      trafficSources: (trafficSourceReport.rows || []).map(r => ({
        source: r.dimensionValues[0].value,
        sessions: r.metricValues[0].value,
      })),

      trendData: (trendReport.rows || []).map(r => ({
        label: r.dimensionValues[0].value,
        sessions: r.metricValues[0].value,
        users: r.metricValues[1].value,
      })),
    });
  } catch (err) {
    console.error("GA Analytics Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* =============================
   FORM SUBMISSION ROUTES
============================= */

app.post("/submit-partner", async (req, res) => {
  const form = req.body;
  console.log("Partner form received:", form.email);

  const emailValid = await isEmailDomainValid(form.email);
  if (!emailValid) return res.status(400).json({ success: false, message: "Invalid email address. Please enter a real email." });

  try {
    await Inquiry.create({
      formType: "Partner Application",
      customerName: `${form.firstName} ${form.lastName}`,
      customerEmail: form.email,
      formData: form,
    });

    await transporter.sendMail({
      from: `"${form.firstName} ${form.lastName}" <${process.env.EMAIL_USER}>`,
      replyTo: form.email,
      to: process.env.COMPANY_EMAIL,
      subject: `New Partner Application - ${form.companyName || "Unknown"}`,
      html: `
        <h2 style="color:#166534">New Partner Application</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">
          <tr style="background:#f0fdf4"><td><b>Name</b></td><td>${form.firstName} ${form.lastName}</td></tr>
          <tr><td><b>Email</b></td><td>${form.email}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Phone</b></td><td>${form.phone || "-"}</td></tr>
          <tr><td><b>Company</b></td><td>${form.companyName || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Website</b></td><td>${form.websiteAddress || "-"}</td></tr>
          <tr><td><b>Address</b></td><td>${form.companyAddress || "-"}, ${form.companyCity || ""}, ${form.regionStateProvince || ""}, ${form.postalZip || ""}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Country</b></td><td>${form.country || "-"}</td></tr>
          <tr><td><b>Primary Interest</b></td><td>${form.primaryInterest || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Geographies Served</b></td><td>${form.geographiesServed || "-"}</td></tr>
          <tr><td><b>Annual Revenue</b></td><td>${form.revenueAnnual || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Verticals</b></td><td>${form.verticals || "-"}</td></tr>
          <tr><td><b>Revenue - Private Projects</b></td><td>${form.revenuePrivateProjects || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Revenue - Government</b></td><td>${form.revenueFromGovt || "-"}</td></tr>
          <tr><td><b>Best Describe You</b></td><td>${form.bestDescribeYou || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Details</b></td><td>${form.details || "-"}</td></tr>
        </table>
      `,
    });

    console.log("Partner email sent");
    res.json({ success: true, message: "Application submitted successfully" });
  } catch (err) {
    console.error("Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/submit-project-locking", async (req, res) => {
  const form = req.body;
  console.log("Project Locking form received:", form.email);

  const emailValid = await isEmailDomainValid(form.email);
  if (!emailValid) return res.status(400).json({ success: false, message: "Invalid email address. Please enter a real email." });

  try {
    await Inquiry.create({
      formType: "Project Locking",
      customerName: `${form.firstName} ${form.lastName}`,
      customerEmail: form.email,
      formData: form,
    });

    await transporter.sendMail({
      from: `"${form.firstName} ${form.lastName}" <${process.env.EMAIL_USER}>`,
      replyTo: form.email,
      to: process.env.COMPANY_EMAIL,
      subject: `New Project Locking Request - ${form.projectName || "Unknown"}`,
      html: `
        <h2 style="color:#166534">New Project Locking Request</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">
          <tr style="background:#f0fdf4"><td><b>Name</b></td><td>${form.firstName} ${form.lastName}</td></tr>
          <tr><td><b>Email</b></td><td>${form.email}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Phone</b></td><td>${form.phone || "-"}</td></tr>
          <tr><td><b>Company</b></td><td>${form.company || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Address</b></td><td>${form.streetAddress || "-"}, ${form.streetAddress2 || ""}, ${form.city || ""}, ${form.regionState || ""}, ${form.postalZip || ""}</td></tr>
          <tr><td><b>Country</b></td><td>${form.country || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Model</b></td><td>${form.modelName || "-"}</td></tr>
          <tr><td><b>Quantity</b></td><td>${form.quantity || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>AADONA Sales</b></td><td>${form.aadonaSales || "-"}</td></tr>
          <tr><td><b>Project Name</b></td><td>${form.projectName || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Project / Tender Name</b></td><td>${form.projectTenderName || "-"}</td></tr>
          <tr><td><b>End Customer Name</b></td><td>${form.endCustomerName || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>End Customer Contact</b></td><td>${form.endCustomerContact || "-"}</td></tr>
          <tr><td><b>Expected Closure</b></td><td>${form.expectedClosure || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>SI Partner Involved</b></td><td>${form.siPartner ? "Yes" : "No"}</td></tr>
        </table>
      `,
    });

    console.log("Project Locking email sent");
    res.json({ success: true, message: "Application submitted successfully" });
  } catch (err) {
    console.error("Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/submit-demo", async (req, res) => {
  const form = req.body;
  console.log("Demo request received:", form.email);

  const emailValid = await isEmailDomainValid(form.email);
  if (!emailValid) return res.status(400).json({ success: false, message: "Invalid email address. Please enter a real email." });

  try {
    await Inquiry.create({
      formType: "Demo Request",
      customerName: `${form.firstName} ${form.lastName}`,
      customerEmail: form.email,
      formData: form,
    });

    await transporter.sendMail({
      from: `"${form.firstName} ${form.lastName}" <${process.env.EMAIL_USER}>`,
      replyTo: form.email,
      to: process.env.COMPANY_EMAIL,
      subject: `New Demo Request - ${form.firstName} ${form.lastName}`,
      html: `
        <h2 style="color:#166534">New Demo Request</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">
          <tr style="background:#f0fdf4"><td><b>Name</b></td><td>${form.firstName} ${form.lastName}</td></tr>
          <tr><td><b>Email</b></td><td>${form.email}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Phone</b></td><td>${form.phone || "-"}</td></tr>
          <tr><td><b>Address</b></td><td>${form.streetAddress || "-"}, ${form.streetAddress2 || ""}, ${form.city || ""}, ${form.regionStateProvince || ""}, ${form.postalZipCode || ""}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Country</b></td><td>${form.country || "-"}</td></tr>
          <tr><td><b>Model Name</b></td><td>${form.modelName || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Customer Type</b></td><td>${(form.customerType || []).join(", ") || "-"}</td></tr>
          <tr><td><b>Comments</b></td><td>${form.comment || "-"}</td></tr>
        </table>
      `,
    });

    console.log("Demo request email sent");
    res.json({ success: true, message: "Demo request submitted successfully" });
  } catch (err) {
    console.error("Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/submit-training", async (req, res) => {
  const form = req.body;
  console.log("Training request received:", form.email);

  const emailValid = await isEmailDomainValid(form.email);
  if (!emailValid) return res.status(400).json({ success: false, message: "Invalid email address. Please enter a real email." });

  try {
    await Inquiry.create({
      formType: "Training Request",
      customerName: `${form.firstName} ${form.lastName}`,
      customerEmail: form.email,
      formData: form,
    });

    await transporter.sendMail({
      from: `"${form.firstName} ${form.lastName}" <${process.env.EMAIL_USER}>`,
      replyTo: form.email,
      to: process.env.COMPANY_EMAIL,
      subject: `New Training Request - ${form.firstName} ${form.lastName}`,
      html: `
        <h2 style="color:#166534">New Training Request</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">
          <tr style="background:#f0fdf4"><td><b>Name</b></td><td>${form.firstName} ${form.lastName}</td></tr>
          <tr><td><b>Email</b></td><td>${form.email}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Phone</b></td><td>${form.phone || "-"}</td></tr>
          <tr><td><b>Company</b></td><td>${form.company || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Number of Participants</b></td><td>${form.numberOfParticipants || "-"}</td></tr>
          <tr><td><b>Training Location</b></td><td>${form.streetAddress || "-"}, ${form.streetAddress2 || ""}, ${form.city || ""}, ${form.regionStateProvince || ""}, ${form.postalZipCode || ""}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Country</b></td><td>${form.country || "-"}</td></tr>
          <tr><td><b>Customer Type</b></td><td>${(form.customerType || []).join(", ") || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Comments</b></td><td>${form.comment || "-"}</td></tr>
        </table>
      `,
    });

    console.log("Training request email sent");
    res.json({ success: true, message: "Training request submitted successfully" });
  } catch (err) {
    console.error("Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/submit-warranty", upload.single("invoiceFile"), async (req, res) => {
  const form = req.body;
  console.log("Warranty check received:", form.email);

  const emailValid = await isEmailDomainValid(form.email);
  if (!emailValid) return res.status(400).json({ success: false, message: "Invalid email address. Please enter a real email." });

  try {
    const attachmentUrl = await uploadToFirebase(req.file, "warranty");
    await Inquiry.create({
      formType: "Warranty Check",
      customerName: form.email,
      customerEmail: form.email,
      formData: { ...form, attachmentUrl },
    });

    const mailOptions = {
      from: `"Warranty Request" <${process.env.EMAIL_USER}>`,
      replyTo: form.email,
      to: process.env.COMPANY_EMAIL,
      subject: `New Warranty Check - Serial: ${form.serialNumber || "Unknown"}`,
      html: `
        <h2 style="color:#166534">New Warranty Check Request</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">
          <tr style="background:#f0fdf4"><td><b>Email</b></td><td>${form.email}</td></tr>
          <tr><td><b>Phone</b></td><td>${form.phone || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Serial Number</b></td><td>${form.serialNumber || "-"}</td></tr>
          <tr><td><b>Purchase Date</b></td><td>${form.purchaseDate || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Place of Purchase</b></td><td>${form.placeOfPurchase || "-"}</td></tr>
        </table>
      `,
    };

    if (req.file) {
      mailOptions.attachments = [{ filename: req.file.originalname, content: req.file.buffer }];
    }

    await transporter.sendMail(mailOptions);
    console.log("Warranty check email sent");
    res.json({ success: true, message: "Warranty check submitted successfully" });
  } catch (err) {
    console.error("Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/submit-techsquad", upload.single("invoiceFile"), async (req, res) => {
  const form = req.body;
  console.log("Tech Squad request received:", form.email);

  const emailValid = await isEmailDomainValid(form.email);
  if (!emailValid) return res.status(400).json({ success: false, message: "Invalid email address. Please enter a real email." });

  try {
    const attachmentUrl = await uploadToFirebase(req.file, "techsquad");
    await Inquiry.create({
      formType: "Tech Squad",
      customerName: `${form.firstName} ${form.lastName}`,
      customerEmail: form.email,
      formData: { ...form, attachmentUrl },
    });

    const mailOptions = {
      from: `"${form.firstName} ${form.lastName}" <${process.env.EMAIL_USER}>`,
      replyTo: form.email,
      to: process.env.COMPANY_EMAIL,
      subject: `New Tech Squad Request - ${form.firstName} ${form.lastName}`,
      html: `
        <h2 style="color:#166534">New Tech Squad Request</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">
          <tr style="background:#f0fdf4"><td><b>Name</b></td><td>${form.firstName} ${form.lastName}</td></tr>
          <tr><td><b>Email</b></td><td>${form.email}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Phone</b></td><td>${form.phone || "-"}</td></tr>
          <tr><td><b>Address</b></td><td>${form.address || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Purchase Date</b></td><td>${form.purchaseDate || "-"}</td></tr>
          <tr><td><b>Service Type</b></td><td>${form.serviceType || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Issue Description</b></td><td>${form.issue || "-"}</td></tr>
        </table>
      `,
    };

    if (req.file) {
      mailOptions.attachments = [{ filename: req.file.originalname, content: req.file.buffer }];
    }

    await transporter.sendMail(mailOptions);
    console.log("Tech Squad email sent");
    res.json({ success: true, message: "Tech Squad request submitted successfully" });
  } catch (err) {
    console.error("Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/submit-doa", upload.single("invoiceFile"), async (req, res) => {
  const form = req.body;
  console.log("DOA request received:", form.email);

  const emailValid = await isEmailDomainValid(form.email);
  if (!emailValid) return res.status(400).json({ success: false, message: "Invalid email address. Please enter a real email." });

  try {
    const attachmentUrl = await uploadToFirebase(req.file, "doa");
    await Inquiry.create({
      formType: "DOA Request",
      customerName: `${form.firstName} ${form.lastName}`,
      customerEmail: form.email,
      formData: { ...form, attachmentUrl },
    });

    const mailOptions = {
      from: `"${form.firstName} ${form.lastName}" <${process.env.EMAIL_USER}>`,
      replyTo: form.email,
      to: process.env.COMPANY_EMAIL,
      subject: `New DOA Request - Serial: ${form.serialNumber || "Unknown"}`,
      html: `
        <h2 style="color:#166534">New DOA Request</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">
          <tr style="background:#f0fdf4"><td><b>Name</b></td><td>${form.firstName} ${form.lastName}</td></tr>
          <tr><td><b>Email</b></td><td>${form.email}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Phone</b></td><td>${form.phone || "-"}</td></tr>
          <tr><td><b>Address</b></td><td>${form.address || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Product Type</b></td><td>${form.productType || "-"}</td></tr>
          <tr><td><b>Purchase Date</b></td><td>${form.purchaseDate || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Warranty Year</b></td><td>${form.warrantyYear || "-"}</td></tr>
          <tr><td><b>Serial Number</b></td><td>${form.serialNumber || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Invoice Number</b></td><td>${form.invoiceNumber || "-"}</td></tr>
          <tr><td><b>DOA Auth Code</b></td><td>${form.doaAuthCode || "-"}</td></tr>
        </table>
      `,
    };

    if (req.file) {
      mailOptions.attachments = [{ filename: req.file.originalname, content: req.file.buffer }];
    }

    await transporter.sendMail(mailOptions);
    console.log("DOA request email sent");
    res.json({ success: true, message: "DOA request submitted successfully" });
  } catch (err) {
    console.error("Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/submit-product-support", async (req, res) => {
  const form = req.body;
  console.log("Product Support request received:", form.email);

  const emailValid = await isEmailDomainValid(form.email);
  if (!emailValid) return res.status(400).json({ success: false, message: "Invalid email address. Please enter a real email." });

  try {
    await Inquiry.create({
      formType: "Product Support",
      customerName: form.email,
      customerEmail: form.email,
      formData: form,
    });

    await transporter.sendMail({
      from: `"${form.productModel} - Support" <${process.env.EMAIL_USER}>`,
      replyTo: form.email,
      to: process.env.COMPANY_EMAIL,
      subject: `New Product Support Request - ${form.productModel || "Unknown"}`,
      html: `
        <h2 style="color:#166534">New Product Support Request</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">
          <tr style="background:#f0fdf4"><td><b>Product Model</b></td><td>${form.productModel || "-"}</td></tr>
          <tr><td><b>Email</b></td><td>${form.email}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Phone</b></td><td>${form.phone || "-"}</td></tr>
          <tr><td><b>Issue / Question</b></td><td>${form.details || "-"}</td></tr>
        </table>
      `,
    });

    console.log("Product Support email sent");
    res.json({ success: true, message: "Support request submitted successfully" });
  } catch (err) {
    console.error("Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/submit-product-registration", upload.single("invoiceFile"), async (req, res) => {
  const form = req.body;
  console.log("Product Registration received:", form.email);

  const emailValid = await isEmailDomainValid(form.email);
  if (!emailValid) return res.status(400).json({ success: false, message: "Invalid email address. Please enter a real email." });

  try {
    const attachmentUrl = await uploadToFirebase(req.file, "registrations");
    await Inquiry.create({
      formType: "Product Registration",
      customerName: `${form.firstName} ${form.lastName}`,
      customerEmail: form.email,
      formData: { ...form, attachmentUrl },
    });

    const mailOptions = {
      from: `"${form.firstName} ${form.lastName}" <${process.env.EMAIL_USER}>`,
      replyTo: form.email,
      to: process.env.COMPANY_EMAIL,
      subject: `New Product Registration - Serial: ${form.serialNumber || "Unknown"}`,
      html: `
        <h2 style="color:#166534">New Product Registration</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">
          <tr style="background:#f0fdf4"><td><b>Name</b></td><td>${form.firstName} ${form.lastName}</td></tr>
          <tr><td><b>Email</b></td><td>${form.email}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Phone</b></td><td>${form.phone || "-"}</td></tr>
          <tr><td><b>City</b></td><td>${form.companyCity || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Region/State</b></td><td>${form.regionStateProvince || "-"}</td></tr>
          <tr><td><b>Postal Code</b></td><td>${form.postalZipCode || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Country</b></td><td>${form.country || "-"}</td></tr>
          <tr><td><b>Serial Number</b></td><td>${form.serialNumber || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Invoice Number</b></td><td>${form.invoiceNumber || "-"}</td></tr>
          <tr><td><b>Purchased From</b></td><td>${form.purchasedFrom || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Purchase Date</b></td><td>${form.purchaseDate || "-"}</td></tr>
        </table>
      `,
    };

    if (req.file) {
      mailOptions.attachments = [{ filename: req.file.originalname, content: req.file.buffer }];
    }

    await transporter.sendMail(mailOptions);
    console.log("Product Registration email sent");
    res.json({ success: true, message: "Product registered successfully" });
  } catch (err) {
    console.error("Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/submit-contact", async (req, res) => {
  const form = req.body;
  console.log("Contact form received:", form.email);

  const emailValid = await isEmailDomainValid(form.email);
  if (!emailValid) return res.status(400).json({ success: false, message: "Invalid email address. Please enter a real email." });

  try {
    await Inquiry.create({
      formType: "Contact",
      customerName: `${form.firstName} ${form.lastName}`,
      customerEmail: form.email,
      formData: form,
    });

    await transporter.sendMail({
      from: `"${form.firstName} ${form.lastName}" <${process.env.EMAIL_USER}>`,
      replyTo: form.email,
      to: process.env.COMPANY_EMAIL,
      subject: `New Contact Message - ${form.subject || "Unknown"}`,
      html: `
        <h2 style="color:#166534">New Contact Message</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">
          <tr style="background:#f0fdf4"><td><b>Name</b></td><td>${form.firstName} ${form.lastName}</td></tr>
          <tr><td><b>Email</b></td><td>${form.email}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Phone</b></td><td>${form.phone || "-"}</td></tr>
          <tr><td><b>Subject</b></td><td>${form.subject || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Nature of Business</b></td><td>${form.natureOfBusiness || "-"}</td></tr>
          <tr><td><b>Message</b></td><td>${form.message || "-"}</td></tr>
        </table>
      `,
    });

    console.log("Contact email sent");
    res.json({ success: true, message: "Message sent successfully" });
  } catch (err) {
    console.error("Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/submit-apply", upload.single("resumeFile"), async (req, res) => {
  const form = req.body;
  console.log("Job application received:", form.email);

  const emailValid = await isEmailDomainValid(form.email);
  if (!emailValid) return res.status(400).json({ success: false, message: "Invalid email address. Please enter a real email." });

  try {
    const attachmentUrl = await uploadToFirebase(req.file, "resumes");
    await Inquiry.create({
      formType: "Job Application",
      customerName: `${form.firstName} ${form.lastName}`,
      customerEmail: form.email,
      formData: { ...form, attachmentUrl },
    });

    const mailOptions = {
      from: `"${form.firstName} ${form.lastName}" <${process.env.EMAIL_USER}>`,
      replyTo: form.email,
      to: process.env.COMPANY_EMAIL,
      subject: `New Job Application - ${form.firstName} ${form.lastName}`,
      html: `
        <h2 style="color:#166534">New Job Application</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">
          <tr style="background:#f0fdf4"><td><b>Name</b></td><td>${form.firstName} ${form.lastName}</td></tr>
          <tr><td><b>Email</b></td><td>${form.email}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Phone</b></td><td>${form.phone || "-"}</td></tr>
          <tr><td><b>Availability</b></td><td>${(form.availability || []).join(", ") || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>About</b></td><td>${form.about || "-"}</td></tr>
        </table>
      `,
    };

    if (req.file) {
      mailOptions.attachments = [{ filename: req.file.originalname, content: req.file.buffer }];
    }

    await transporter.sendMail(mailOptions);
    console.log("Job application email sent");
    res.json({ success: true, message: "Application submitted successfully" });
  } catch (err) {
    console.error("Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/submit-whistleblower", upload.single("attachmentFile"), async (req, res) => {
  const form = req.body;
  console.log("Whistle blower report received:", form.name || "Anonymous");

  if (form.email) {
    const emailValid = await isEmailDomainValid(form.email);
    if (!emailValid) return res.status(400).json({ success: false, message: "Invalid email address. Please enter a real email." });
  }

  try {
    const attachmentUrl = await uploadToFirebase(req.file, "whistleblower");
    await Inquiry.create({
      formType: "Whistleblower",
      customerName: form.name || "Anonymous",
      customerEmail: form.email || "",
      formData: { ...form, attachmentUrl },
    });

    const mailOptions = {
      from: `"${form.name || "Anonymous"} - Whistleblower" <${process.env.EMAIL_USER}>`,
      replyTo: form.email || process.env.EMAIL_USER,
      to: process.env.COMPANY_EMAIL,
      subject: `New Whistle Blower Report - ${form.name || "Anonymous"}`,
      html: `
        <h2 style="color:#166534">New Whistle Blower Report</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">
          <tr style="background:#f0fdf4"><td><b>Name</b></td><td>${form.name || "-"}</td></tr>
          <tr><td><b>Telephone</b></td><td>${form.telephone || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Comment</b></td><td>${form.comment || "-"}</td></tr>
        </table>
      `,
    };

    if (req.file) {
      mailOptions.attachments = [{ filename: req.file.originalname, content: req.file.buffer }];
    }

    await transporter.sendMail(mailOptions);
    console.log("Whistle blower email sent");
    res.json({ success: true, message: "Report submitted successfully" });
  } catch (err) {
    console.error("Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

/* =============================
   START
============================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});