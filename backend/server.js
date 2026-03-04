const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const admin = require("./firebaseAdmin");
const PDFDocument = require("pdfkit");
const multer = require("multer");
const crypto = require("crypto");
const dns = require("dns").promises;
const transporter = require("./mailer");
require("dotenv").config();

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
    // Firebase URL: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH%2FFILE.jpg?alt=media&token=xxx
    const match = url.match(/\/o\/(.+?)(\?|$)/);
    if (!match) {
      console.log("⚠️ Could not extract path from URL:", url);
      return null;
    }
    const path = decodeURIComponent(match[1]);
    return path;
  } catch (e) {
    console.log("⚠️ getFirebasePath error:", e.message);
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
      console.log("⚠️ FIREBASE_STORAGE_BUCKET not set in .env");
      return;
    }

    await admin.storage().bucket(bucketName).file(path).delete();
    console.log("✅ Firebase deleted:", path);
  } catch (e) {
    if (e.code === 404) {
      console.log("ℹ️ File already gone:", path);
    } else {
      console.log("⚠️ Firebase delete failed:", e.code, "-", e.message);
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
  return `https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET}/${fileName}`;
};

/* =============================
   VERIFY TOKEN MIDDLEWARE
============================= */

// In-memory OTP store { email -> { otp, expiresAt } }
const otpStore = new Map();

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("❌ No token provided");
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);

    if (decodedToken.admin !== true) {
      console.log("❌ Not Admin:", decodedToken.email);
      return res.status(403).json({ message: "Not authorized as admin" });
    }

    req.user = decodedToken;
    console.log("✅ Admin Verified:", decodedToken.email);
    next();
  } catch (error) {
    console.log("❌ TOKEN ERROR:", error.message);
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
  console.log("❌ MONGO_URL not found in .env");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("✅ MongoDB Atlas Connected");
    console.log("📂 Connected Database:", mongoose.connection.name);
  })
  .catch((err) => {
    console.log("❌ MongoDB Connection Error:", err.message);
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

/* =============================
   CATEGORY SCHEMA
============================= */

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

/* =============================
   BLOG SCHEMA
============================= */

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

/* =============================
   INQUIRY SCHEMA — Admin Inbox
============================= */

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
   ROUTES
============================= */

app.get("/", (req, res) => {
  res.send("API Running 🚀");
});

/* =============================
   CATEGORY ROUTES
   ⚠️ ORDER MATTERS: specific routes MUST come before /:id param routes
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

    console.log("✅ Category created:", category.name);
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ⚠️ MUST be before PUT /categories/:id */
app.put("/categories/reorder", verifyToken, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ message: "items array required" });

    await Promise.all(
      items.map(({ id, order }) =>
        Category.findByIdAndUpdate(id, { $set: { order } })
      )
    );

    console.log("✅ Categories reordered:", items.length, "items");
    res.json({ message: "Reordered successfully" });
  } catch (err) {
    console.log("❌ Reorder error:", err.message);
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

    const productResult = await Product.updateMany({ category: oldName }, { $set: { category: trimmedNew } });
    await RelatedProduct.updateMany({ category: oldName }, { $set: { category: trimmedNew } });

    console.log(`✅ Category renamed: "${oldName}" to "${trimmedNew}", ${productResult.modifiedCount} products updated`);
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

    const productResult = await Product.updateMany(
      { category: category.name, subCategory: oldSubName },
      { $set: { subCategory: trimmedNew } }
    );
    await RelatedProduct.updateMany(
      { category: category.name, subCategory: oldSubName },
      { $set: { subCategory: trimmedNew } }
    );

    console.log(`✅ SubCategory renamed: "${oldSubName}" to "${trimmedNew}", ${productResult.modifiedCount} products updated`);
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

    const productResult = await Product.updateMany(
      { category: category.name, subCategory: subName, extraCategory: oldExtra },
      { $set: { extraCategory: trimmedNew } }
    );
    await RelatedProduct.updateMany(
      { category: category.name, subCategory: subName, extraCategory: oldExtra },
      { $set: { extraCategory: trimmedNew } }
    );

    console.log(`✅ ExtraCategory renamed: "${oldExtra}" to "${trimmedNew}", ${productResult.modifiedCount} products updated`);
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
    console.log("🗑️ Cascade deleted product:", product.name);
  }
  await RelatedProduct.deleteMany(query);
};

app.delete("/categories/:id", verifyToken, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    await deleteProductsCascade({ category: category.name });
    await Category.findByIdAndDelete(req.params.id);

    console.log("🗑️ Category + all products deleted:", category.name);
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

    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ⚠️ MUST be before PUT /categories/:id/subcategory/:subName */
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
    console.log("✅ SubCategories reordered for category:", category.name);
    res.json(category);
  } catch (err) {
    console.log("❌ SubCategory reorder error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put("/categories/:id/subcategory/:subName", verifyToken, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const sub = category.subCategories.find(s => s.name === req.params.subName);
    if (!sub) return res.status(404).json({ message: "SubCategory not found" });

    if (req.body.name) sub.name = req.body.name;
    if (req.body.extraCategories !== undefined) sub.extraCategories = req.body.extraCategories;

    await category.save();
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

    console.log("🗑️ SubCategory + all products deleted:", subName);
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =============================
   PRODUCT ROUTES
   ⚠️ CRITICAL: Specific routes MUST come before parameterized routes
============================= */

app.put("/products/reorder", verifyToken, async (req, res) => {
  console.log("🎯 REORDER ROUTE HIT");
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
    console.log("✅ Products reordered:", validItems.length, "items");
    res.json({ message: "Products reordered successfully" });
  } catch (err) {
    console.log("❌ Product reorder error:", err.message);
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

app.get("/products/:slug/datasheet", async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${product.slug}-datasheet.pdf`);
    doc.pipe(res);

    doc.fontSize(22).font("Helvetica-Bold").text(product.name, { align: "center" });
    doc.moveDown(2);
    doc.fontSize(16).font("Helvetica-Bold").text("Product Overview");
    doc.moveDown(0.5);
    doc.fontSize(12).font("Helvetica").text(product.overview?.content || product.description, { align: "justify" });
    doc.moveDown(1.5);

    if (product.highlights?.length) {
      doc.fontSize(16).font("Helvetica-Bold").text("Features");
      doc.moveDown(0.5);
      product.highlights.forEach((item) => {
        doc.fontSize(12).font("Helvetica").text("• " + item);
      });
      doc.moveDown(1.5);
    }

    if (product.specifications && Object.keys(product.specifications).length) {
      doc.fontSize(16).font("Helvetica-Bold").text("Specifications");
      doc.moveDown(0.5);
      Object.entries(product.specifications).forEach(([category, specs]) => {
        doc.fontSize(14).font("Helvetica-Bold").text(category);
        doc.moveDown(0.3);
        Object.entries(specs || {}).forEach(([key, value]) => {
          doc.fontSize(12).font("Helvetica").text(`${key}: ${value}`);
        });
        doc.moveDown(1);
      });
    }

    doc.moveDown(2);
    doc.fontSize(10).fillColor("gray").text("Generated automatically from AADONA Product System", { align: "center" });
    doc.end();
  } catch (err) {
    console.log("PDF ERROR:", err.message);
    res.status(500).json({ error: "Failed to generate PDF" });
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
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/products/:id", verifyToken, async (req, res) => {
  console.log("🔍 :id route hit with id:", req.params.id);
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Product not found" });

    if (req.body.image && req.body.image !== existing.image) {
      await deleteFromFirebase(existing.image);
      console.log("🗑️ Old product image deleted from Firebase");
    }

    if (req.body.datasheet && req.body.datasheet !== existing.datasheet) {
      await deleteFromFirebase(existing.datasheet);
      console.log("🗑️ Old product datasheet deleted from Firebase");
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
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

    console.log("🗑️ Product deleted:", product.name);
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

    console.log(`✅ OTP sent to: ${email}`);
    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("❌ Send OTP error:", err.message);
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
    console.log(`✅ OTP verified for: ${email}`);
    res.json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error("❌ Verify OTP error:", err.message);
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

    console.log(`✅ Admin created: ${email}`);
    res.json({ message: "New Admin Created ✅" });
  } catch (error) {
    console.error("❌ Create admin error:", error.message);
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

    console.log(`✅ Fetched ${admins.length} admins`);
    res.json({ admins });
  } catch (err) {
    console.error("❌ Get admins error:", err.message);
    res.status(500).json({ message: "Failed to fetch admins" });
  }
});

app.delete("/delete-admin/:uid", verifyToken, async (req, res) => {
  try {
    const { uid } = req.params;

    if (uid === req.user.uid) {
      return res.status(400).json({ message: "You cannot remove your own admin access." });
    }

    await admin.auth().setCustomUserClaims(uid, { admin: false });

    console.log(`✅ Admin access removed for UID: ${uid}`);
    res.json({ message: "Admin access removed successfully" });
  } catch (err) {
    console.error("❌ Delete admin error:", err.message);
    res.status(500).json({ message: "Failed to remove admin" });
  }
});

/* =============================
   RELATED PRODUCTS ROUTES
============================= */

app.post("/save-related-products", verifyToken, async (req, res) => {
  console.log("📦 /save-related-products HIT");

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

    const result = await RelatedProduct.findOneAndUpdate(
      filter,
      {
        $set: {
          type: type || null,
          category,
          subCategory,
          extraCategory: extraCategory || null,
          relatedProducts,
        },
      },
      { upsert: true, new: true }
    );

    console.log("✅ Saved successfully:", result._id);
    res.json({ message: "Related products saved successfully ✅", result });
  } catch (err) {
    console.log("❌ Save Related Products Error:", err.message);
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
    console.log("❌ Get Related Products Error:", err.message);
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

    console.log(`✅ Removed product ${productId} from related list. ${before} → ${related.relatedProducts.length}`);
    res.json({
      message: "Product removed from related list ✅",
      relatedProducts: related.relatedProducts,
    });
  } catch (err) {
    console.log("❌ Remove from related error:", err.message);
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
      subject: `❤️ New Like on: "${blog.title}"`,
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
      subject: `💬 New Comment on: "${blog.title}"`,
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
      console.log("🗑️ Old blog hero image deleted from Firebase");
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
        console.log("🗑️ Old blog block image deleted from Firebase:", block.url);
      }
    }

    const updated = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
      console.log("🗑️ Blog block image deleted from Firebase");
    }

    await Blog.findByIdAndDelete(req.params.id);

    console.log("🗑️ Blog deleted:", blog.title);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =============================
   INQUIRY ROUTES — Admin Inbox
============================= */

// GET all inquiries
app.get("/inquiries", verifyToken, async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 });
    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark as read
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

// Reply to inquiry — email customer + save in DB
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

    console.log(`✅ Reply sent to: ${inquiry.customerEmail}`);
    res.json({ message: "Reply sent successfully ✅", inquiry });
  } catch (err) {
    console.error("❌ Reply error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete inquiry
app.delete("/inquiries/:id", verifyToken, async (req, res) => {
  try {
    await Inquiry.findByIdAndDelete(req.params.id);
    res.json({ message: "Inquiry deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =============================
   FORM SUBMISSION ROUTES
   ✅ Email MX verified before saving
   ✅ All forms saved to MongoDB as Inquiry
============================= */

app.post("/submit-partner", async (req, res) => {
  const form = req.body;
  console.log("📧 Partner form received:", form.email);

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

    console.log("✅ Partner email sent");
    res.json({ success: true, message: "Application submitted successfully" });
  } catch (err) {
    console.error("❌ Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/submit-project-locking", async (req, res) => {
  const form = req.body;
  console.log("📧 Project Locking form received:", form.email);

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

    console.log("✅ Project Locking email sent");
    res.json({ success: true, message: "Application submitted successfully" });
  } catch (err) {
    console.error("❌ Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/submit-demo", async (req, res) => {
  const form = req.body;
  console.log("📧 Demo request received:", form.email);

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

    console.log("✅ Demo request email sent");
    res.json({ success: true, message: "Demo request submitted successfully" });
  } catch (err) {
    console.error("❌ Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/submit-training", async (req, res) => {
  const form = req.body;
  console.log("📧 Training request received:", form.email);

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

    console.log("✅ Training request email sent");
    res.json({ success: true, message: "Training request submitted successfully" });
  } catch (err) {
    console.error("❌ Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/submit-warranty", upload.single("invoiceFile"), async (req, res) => {
  const form = req.body;
  console.log("📧 Warranty check received:", form.email);

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
    console.log("✅ Warranty check email sent");
    res.json({ success: true, message: "Warranty check submitted successfully" });
  } catch (err) {
    console.error("❌ Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/submit-techsquad", upload.single("invoiceFile"), async (req, res) => {
  const form = req.body;
  console.log("📧 Tech Squad request received:", form.email);

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
    console.log("✅ Tech Squad email sent");
    res.json({ success: true, message: "Tech Squad request submitted successfully" });
  } catch (err) {
    console.error("❌ Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/submit-doa", upload.single("invoiceFile"), async (req, res) => {
  const form = req.body;
  console.log("📧 DOA request received:", form.email);

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
    console.log("✅ DOA request email sent");
    res.json({ success: true, message: "DOA request submitted successfully" });
  } catch (err) {
    console.error("❌ Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/submit-product-support", async (req, res) => {
  const form = req.body;
  console.log("📧 Product Support request received:", form.email);

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

    console.log("✅ Product Support email sent");
    res.json({ success: true, message: "Support request submitted successfully" });
  } catch (err) {
    console.error("❌ Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/submit-product-registration", upload.single("invoiceFile"), async (req, res) => {
  const form = req.body;
  console.log("📧 Product Registration received:", form.email);

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
    console.log("✅ Product Registration email sent");
    res.json({ success: true, message: "Product registered successfully" });
  } catch (err) {
    console.error("❌ Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/submit-contact", async (req, res) => {
  const form = req.body;
  console.log("📧 Contact form received:", form.email);

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

    console.log("✅ Contact email sent");
    res.json({ success: true, message: "Message sent successfully" });
  } catch (err) {
    console.error("❌ Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/submit-apply", upload.single("resumeFile"), async (req, res) => {
  const form = req.body;
  console.log("📧 Job application received:", form.email);

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
    console.log("✅ Job application email sent");
    res.json({ success: true, message: "Application submitted successfully" });
  } catch (err) {
    console.error("❌ Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/submit-whistleblower", upload.single("attachmentFile"), async (req, res) => {
  const form = req.body;
  console.log("📧 Whistle blower report received:", form.name || "Anonymous");

  // Whistleblower email optional — verify only if provided
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
    console.log("✅ Whistle blower email sent");
    res.json({ success: true, message: "Report submitted successfully" });
  } catch (err) {
    console.error("❌ Mail error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

/* =============================
   START
============================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});