/**
 * STEP 5 — Rewrite every Firebase Storage URL stored in MongoDB to point at
 * the VPS instead. Run this only AFTER migrateFirebaseToVPS.js has finished
 * (so the files it's about to point at already exist on disk).
 *
 * Run on the VPS, from the backend/ directory:
 *   node migration/updateMongoUrls.js
 *
 * Only touches documents that actually contain a Firebase URL — everything
 * else is left untouched. Safe to re-run (already-converted docs are skipped).
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");

const FRONTEND_URL = (process.env.FRONTEND_URL || "https://aadona.com").replace(/\/$/, "");

const isFirebaseUrl = (url) =>
  typeof url === "string" &&
  (url.includes("firebasestorage.googleapis.com") || url.includes("firebasestorage.app"));

// "https://firebasestorage.googleapis.com/v0/b/<bucket>/o/products%2F167-abc.jpg?alt=media"
//   -> decode "/o/...?..." segment -> "products/167-abc.jpg"
//   -> "<FRONTEND_URL>/uploads/products/167-abc.jpg"
const convertFirebaseUrl = (url) => {
  const match = url.match(/\/o\/(.+?)(\?|$)/);
  if (!match) return null;
  const decodedPath = decodeURIComponent(match[1]);
  return `${FRONTEND_URL}/uploads/${decodedPath}`;
};

const stats = { scanned: 0, updated: 0, skipped: 0, unparsable: [] };

const convertField = (value) => {
  if (!isFirebaseUrl(value)) return { changed: false, value };
  const converted = convertFirebaseUrl(value);
  if (!converted) {
    stats.unparsable.push(value);
    return { changed: false, value };
  }
  return { changed: true, value: converted };
};

const run = async () => {
  if (!process.env.MONGO_URL) {
    console.error("MONGO_URL not set in .env — aborting.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URL);
  console.log("Connected to MongoDB:", mongoose.connection.name, "\n");
  const db = mongoose.connection.db;

  // ── Products: image, datasheet, assemblyDiagram ──
  const products = await db.collection("products").find({}).toArray();
  for (const doc of products) {
    stats.scanned++;
    const update = {};
    for (const field of ["image", "datasheet", "assemblyDiagram"]) {
      const { changed, value } = convertField(doc[field]);
      if (changed) update[field] = value;
    }
    if (Object.keys(update).length) {
      await db.collection("products").updateOne({ _id: doc._id }, { $set: update });
      stats.updated++;
      console.log("Updated product:", doc.name || doc._id);
    } else {
      stats.skipped++;
    }
  }

  // ── Categories: banner ──
  const categories = await db.collection("categories").find({}).toArray();
  for (const doc of categories) {
    stats.scanned++;
    const { changed, value } = convertField(doc.banner);
    if (changed) {
      await db.collection("categories").updateOne({ _id: doc._id }, { $set: { banner: value } });
      stats.updated++;
      console.log("Updated category:", doc.name || doc._id);
    } else {
      stats.skipped++;
    }
  }

  // ── Blogs: image, blocks[].url ──
  const blogs = await db.collection("blogs").find({}).toArray();
  for (const doc of blogs) {
    stats.scanned++;
    const update = {};

    const imgResult = convertField(doc.image);
    if (imgResult.changed) update.image = imgResult.value;

    let blocksChanged = false;
    const newBlocks = (doc.blocks || []).map((block) => {
      if (block.type !== "image") return block;
      const { changed, value } = convertField(block.url);
      if (changed) {
        blocksChanged = true;
        return { ...block, url: value };
      }
      return block;
    });
    if (blocksChanged) update.blocks = newBlocks;

    if (Object.keys(update).length) {
      await db.collection("blogs").updateOne({ _id: doc._id }, { $set: update });
      stats.updated++;
      console.log("Updated blog:", doc.title || doc._id);
    } else {
      stats.skipped++;
    }
  }

  // ── Inquiries: formData.attachmentUrl (warranty/doa/registration/whistleblower forms) ──
  const inquiries = await db.collection("inquiries").find({}).toArray();
  for (const doc of inquiries) {
    stats.scanned++;
    const attachmentUrl = doc.formData?.attachmentUrl;
    const { changed, value } = convertField(attachmentUrl);
    if (changed) {
      await db
        .collection("inquiries")
        .updateOne({ _id: doc._id }, { $set: { "formData.attachmentUrl": value } });
      stats.updated++;
    } else {
      stats.skipped++;
    }
  }

  console.log("\n=== Summary ===");
  console.log("Documents scanned:", stats.scanned);
  console.log("Documents updated:", stats.updated);
  console.log("Documents skipped (no Firebase URL found):", stats.skipped);
  if (stats.unparsable.length) {
    console.log("\nUnparsable Firebase URLs (left untouched — check manually):");
    stats.unparsable.forEach((u) => console.log(" -", u));
  }

  await mongoose.disconnect();
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("updateMongoUrls crashed:", err);
    process.exit(1);
  });