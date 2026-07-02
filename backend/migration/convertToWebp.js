/**
 * ONE-TIME — Convert every existing PNG/JPG/GIF/BMP/TIFF file under uploads/
 * to WebP, then rewrite the matching MongoDB URLs to point at the new files.
 *
 * Run on the VPS, from the backend/ directory:
 *   node migration/convertToWebp.js
 *
 * Two phases:
 *   1. Walk uploads/ (skipping the backup dir), convert each convertible
 *      image to .webp, MOVE the original into
 *      uploads/_pre-webp-backup/<same relative path> (not deleted — safe
 *      rollback), and record oldURL -> newURL.
 *   2. Rewrite every matching field in products / categories / blogs /
 *      inquiries from the old URL to the new .webp URL.
 *
 * Safe to re-run: files already converted (original no longer present)
 * are simply skipped in phase 1, and phase 2 only touches fields that
 * still match an old URL.
 *
 * PDFs (datasheets, some assemblyDiagram / attachmentUrl values) are never
 * touched — only file extensions in CONVERTIBLE_EXTS are processed.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const mongoose = require("mongoose");

const FRONTEND_URL = (process.env.FRONTEND_URL || "https://aadona.com").replace(/\/$/, "");
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");
const BACKUP_ROOT = path.join(UPLOAD_ROOT, "_pre-webp-backup");

const CONVERTIBLE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".tif"]);

const stats = { converted: 0, skippedAlready: 0, failed: [] };
const urlMap = new Map(); // oldURL -> newURL

// ── Phase 1: walk uploads/, convert, backup originals ──
const walkAndConvert = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (fullPath === BACKUP_ROOT) continue; // never touch the backup dir
      await walkAndConvert(fullPath);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!CONVERTIBLE_EXTS.has(ext)) continue;

    const relativePath = path.relative(UPLOAD_ROOT, fullPath); // e.g. products/123-abc-foo.png
    const newRelativePath = relativePath.slice(0, -ext.length) + ".webp";
    const newFullPath = path.join(UPLOAD_ROOT, newRelativePath);

    try {
      // Already converted in a previous run? skip.
      await fs.access(newFullPath);
      stats.skippedAlready++;
      urlMap.set(
        `${FRONTEND_URL}/uploads/${relativePath.split(path.sep).join("/")}`,
        `${FRONTEND_URL}/uploads/${newRelativePath.split(path.sep).join("/")}`
      );
      continue;
    } catch {
      // doesn't exist yet — proceed with conversion
    }

    try {
      const inputBuffer = await fs.readFile(fullPath);
      const webpBuffer = await sharp(inputBuffer).webp({ quality: 82 }).toBuffer();
      await fs.writeFile(newFullPath, webpBuffer);

      // Move original into backup dir, preserving folder structure
      const backupPath = path.join(BACKUP_ROOT, relativePath);
      await fs.mkdir(path.dirname(backupPath), { recursive: true });
      await fs.rename(fullPath, backupPath);

      urlMap.set(
        `${FRONTEND_URL}/uploads/${relativePath.split(path.sep).join("/")}`,
        `${FRONTEND_URL}/uploads/${newRelativePath.split(path.sep).join("/")}`
      );
      stats.converted++;
      console.log("Converted:", relativePath, "->", newRelativePath);
    } catch (err) {
      stats.failed.push({ file: relativePath, error: err.message });
      console.error("Failed to convert:", relativePath, "-", err.message);
    }
  }
};

// ── Phase 2: rewrite MongoDB URLs using urlMap ──
const remap = (value) => (urlMap.has(value) ? urlMap.get(value) : null);

const updateMongo = async () => {
  const dbStats = { scanned: 0, updated: 0 };
  const db = mongoose.connection.db;

  const products = await db.collection("products").find({}).toArray();
  for (const doc of products) {
    dbStats.scanned++;
    const update = {};
    for (const field of ["image", "datasheet", "assemblyDiagram"]) {
      const newUrl = remap(doc[field]);
      if (newUrl) update[field] = newUrl;
    }
    if (Object.keys(update).length) {
      await db.collection("products").updateOne({ _id: doc._id }, { $set: update });
      dbStats.updated++;
      console.log("Updated product:", doc.name || doc._id);
    }
  }

  const categories = await db.collection("categories").find({}).toArray();
  for (const doc of categories) {
    dbStats.scanned++;
    const newUrl = remap(doc.banner);
    if (newUrl) {
      await db.collection("categories").updateOne({ _id: doc._id }, { $set: { banner: newUrl } });
      dbStats.updated++;
      console.log("Updated category:", doc.name || doc._id);
    }
  }

  const blogs = await db.collection("blogs").find({}).toArray();
  for (const doc of blogs) {
    dbStats.scanned++;
    const update = {};

    const newImageUrl = remap(doc.image);
    if (newImageUrl) update.image = newImageUrl;

    let blocksChanged = false;
    const newBlocks = (doc.blocks || []).map((block) => {
      if (block.type !== "image") return block;
      const newUrl = remap(block.url);
      if (newUrl) {
        blocksChanged = true;
        return { ...block, url: newUrl };
      }
      return block;
    });
    if (blocksChanged) update.blocks = newBlocks;

    if (Object.keys(update).length) {
      await db.collection("blogs").updateOne({ _id: doc._id }, { $set: update });
      dbStats.updated++;
      console.log("Updated blog:", doc.title || doc._id);
    }
  }

  const inquiries = await db.collection("inquiries").find({}).toArray();
  for (const doc of inquiries) {
    dbStats.scanned++;
    const newUrl = remap(doc.formData?.attachmentUrl);
    if (newUrl) {
      await db
        .collection("inquiries")
        .updateOne({ _id: doc._id }, { $set: { "formData.attachmentUrl": newUrl } });
      dbStats.updated++;
    }
  }

  return dbStats;
};

const run = async () => {
  if (!process.env.MONGO_URL) {
    console.error("MONGO_URL not set in .env — aborting.");
    process.exit(1);
  }

  console.log("=== Phase 1: converting files to WebP ===\n");
  await fs.mkdir(BACKUP_ROOT, { recursive: true });
  await walkAndConvert(UPLOAD_ROOT);

  console.log("\n=== Phase 2: updating MongoDB URLs ===\n");
  await mongoose.connect(process.env.MONGO_URL);
  console.log("Connected to MongoDB:", mongoose.connection.name, "\n");
  const dbStats = await updateMongo();
  await mongoose.disconnect();

  console.log("\n=== Summary ===");
  console.log("Files converted:", stats.converted);
  console.log("Files already converted (skipped):", stats.skippedAlready);
  console.log("Files failed:", stats.failed.length);
  if (stats.failed.length) {
    console.log("\nFailed conversions (originals left untouched, re-run to retry):");
    stats.failed.forEach((f) => console.log(" -", f.file, "-", f.error));
  }
  console.log("\nMongo documents scanned:", dbStats.scanned);
  console.log("Mongo documents updated:", dbStats.updated);
  console.log(`\nOriginals backed up at: ${BACKUP_ROOT}`);
  console.log("Once verified everything looks good on the live site, you can delete that backup folder.");
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("convertToWebp crashed:", err);
    process.exit(1);
  });