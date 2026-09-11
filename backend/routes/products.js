const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const { pdfLimiter } = require("../middleware/rateLimiters");
const Product = require("../models/Product");
const logAction = require("../utils/auditLog");
const { getDiff } = require("../utils/diff");
const generateSlug = require("../utils/slug");
const { uploadToFirebase, deleteFromFirebase } = require("../utils/storageAliases");
const { generateAndUploadDatasheet } = require("../utils/datasheet");

/* =============================
   PRODUCT ROUTES
============================= */

router.put("/products/reorder", verifyToken, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items))
      return res.status(400).json({ error: "Items must be an array" });

    const validItems = items.filter(
      (item) => item.id && mongoose.Types.ObjectId.isValid(item.id)
    );
    if (validItems.length === 0)
      return res.status(400).json({ error: "No valid product IDs provided" });

    const bulkOps = validItems.map((item) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(item.id) },
        update: { $set: { order: item.order } },
      },
    }));
    await Product.bulkWrite(bulkOps);

    logAction(req.user.email, "UPDATE", "Product", "Reorder", {
      changes: { reordered: { new: `${validItems.length} products reordered` } },
    });

    res.json({ message: "Products reordered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/products", async (req, res) => {
  try {
    const { sort, fields } = req.query;
    const sortOption = sort === "order" ? { order: 1 } : { createdAt: -1 };

    const projection = fields === "list"
      ? { name: 1, description: 1, features: 1, slug: 1, image: 1,
          category: 1, subCategory: 1, extraCategory: 1, order: 1 }
      : {};

    const products = await Product.find({}, projection).sort(sortOption);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/products/models-list", async (req, res) => {
  try {
    const products = await Product.find({}, { name: 1, model: 1, _id: 0 })
      .sort({ order: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/products/:slug", async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product)
      return res.status(404).json({ message: "Product not found" });

    // SEO-friendly cache headers for product pages
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =============================
   DATASHEET PDF ROUTE (Puppeteer + Cache)
============================= */

router.get("/products/:slug/datasheet", pdfLimiter, async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product)
      return res.status(404).json({ message: "Product not found" });

    // If product already has a stored datasheet URL, redirect to it
    if (product.datasheet) {
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.redirect(302, product.datasheet);
    }

    // Fallback: generate on the fly
    const html = await buildDatasheetHTML(product);
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 60000 });

    const pdf = await page.pdf({ format: "A4", printBackground: true });
    await page.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${product.slug}.pdf`
    );
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(pdf);
  } catch (err) {
    console.log("PDF ERROR:", err.message);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

router.post("/products", verifyToken, async (req, res) => {
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

    const datasheetUrl = await generateAndUploadDatasheet(newProduct);
    if (datasheetUrl) {
      newProduct.datasheet = datasheetUrl;
      await newProduct.save();
      console.log("Datasheet saved to product:", newProduct.slug);
    }

    logAction(req.user.email, "CREATE", "Product", newProduct.name, {
      changes: {
        name: { new: newProduct.name },
        category: { new: newProduct.category },
        subCategory: { new: newProduct.subCategory },
        type: { new: newProduct.type },
        model: { new: newProduct.model || "-" },
      },
    });

    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/products/:id", verifyToken, async (req, res) => {
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing)
      return res.status(404).json({ message: "Product not found" });

    if (req.body.image && req.body.image !== existing.image) {
      await deleteFromFirebase(existing.image);
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    // Delete old datasheet (both from Firebase and cache)
    if (existing.datasheet) {
      await deleteFromFirebase(existing.datasheet);
    }
    pdfCache.delete(existing.slug); // invalidate cache on update

    // FIX: datasheetUrl declared outside if block (was a ReferenceError before)
    let datasheetUrl = null;
    if (
      req.body.name ||
      req.body.description ||
      req.body.features ||
      req.body.specifications
    ) {
      datasheetUrl = await generateAndUploadDatasheet(updated);
    }

    if (datasheetUrl) {
      updated.datasheet = datasheetUrl;
      await updated.save();
      console.log("Datasheet regenerated for:", updated.slug);
    }

    // Log changes
    const changes = getDiff(existing, req.body, [
      "name", "description", "category", "subCategory", "type", "model",
    ]);
    logAction(req.user.email, "UPDATE", "Product", updated.name, { changes });

    res.json(updated);
  } catch (err) {
    console.log("Product update error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/products/:id", verifyToken, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ message: "Product not found" });

    await deleteFromFirebase(product.image);
    await deleteFromFirebase(product.datasheet);
    await deleteFromFirebase(product.assemblyDiagram); 
    pdfCache.delete(product.slug);
    await Product.findByIdAndDelete(req.params.id);

    logAction(req.user.email, "DELETE", "Product", product.name, {
      changes: {
        name: { old: product.name, new: "DELETED" },
        category: { old: product.category, new: "DELETED" },
        subCategory: { old: product.subCategory, new: "DELETED" },
      },
    });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
