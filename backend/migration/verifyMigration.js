require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");

const FRONTEND_URL = (process.env.FRONTEND_URL || "https://aadona.com").replace(/\/$/, "");
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");
const FAILED_LOG = path.join(__dirname, "failed-downloads.log");

const issues = {
  brokenFirebaseUrls: [],
  missingLocalFiles: [],
  missingRequiredFields: [],
};

const isFirebaseUrl = (url) =>
  typeof url === "string" &&
  (url.includes("firebasestorage.googleapis.com") || url.includes("firebasestorage.app"));

const isVPSUrl = (url) => typeof url === "string" && url.startsWith(`${FRONTEND_URL}/uploads/`);

const checkField = async (label, docId, docLabel, value, required = false) => {
  if (!value) {
    if (required) {
      issues.missingRequiredFields.push(`${label} — ${docLabel} (${docId}): field is empty`);
    }
    return;
  }

  if (isFirebaseUrl(value)) {
    issues.brokenFirebaseUrls.push(`${label} — ${docLabel} (${docId}): ${value}`);
    return;
  }

  if (isVPSUrl(value)) {
    const relative = value.slice(`${FRONTEND_URL}/uploads/`.length);
    const localPath = path.join(UPLOAD_ROOT, relative);
    try {
      await fs.access(localPath);
    } catch {
      issues.missingLocalFiles.push(
        `${label} — ${docLabel} (${docId}): ${value} (expected at ${localPath})`
      );
    }
  }
};

const run = async () => {
  if (!process.env.MONGO_URL) {
    console.error("MONGO_URL not set in .env — aborting.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URL);
  console.log("Connected to MongoDB:", mongoose.connection.name);
  const db = mongoose.connection.db;

  const products = await db.collection("products").find({}).toArray();
  for (const doc of products) {
    const name = doc.name || doc._id;
    await checkField("Product", doc._id, name, doc.image, true);
    await checkField("Product", doc._id, name, doc.datasheet, false);
    await checkField("Product", doc._id, name, doc.assemblyDiagram, false);
  }

  const categories = await db.collection("categories").find({}).toArray();
  for (const doc of categories) {
    await checkField("Category", doc._id, doc.name || doc._id, doc.banner, false);
  }

  const blogs = await db.collection("blogs").find({}).toArray();
  for (const doc of blogs) {
    const name = doc.title || doc._id;
    await checkField("Blog", doc._id, name, doc.image, true);
    for (const [i, block] of (doc.blocks || []).entries()) {
      if (block.type === "image") {
        await checkField(`Blog block #${i}`, doc._id, name, block.url, false);
      }
    }
  }

  const inquiries = await db.collection("inquiries").find({}).toArray();
  for (const doc of inquiries) {
    await checkField("Inquiry", doc._id, doc.formType || doc._id, doc.formData?.attachmentUrl, false);
  }

  let failedDownloadsCount = 0;
  try {
    const logContent = await fs.readFile(FAILED_LOG, "utf-8");
    failedDownloadsCount = logContent.trim().split("\n").filter(Boolean).length;
  } catch {
    // no log file = no recorded failures
  }

  console.log("\n========== VERIFICATION REPORT ==========\n");

  console.log(`Broken Firebase URLs (not yet migrated): ${issues.brokenFirebaseUrls.length}`);
  issues.brokenFirebaseUrls.forEach((l) => console.log("  -", l));

  console.log(`\nMissing local files (DB → /uploads/ but file absent): ${issues.missingLocalFiles.length}`);
  issues.missingLocalFiles.forEach((l) => console.log("  -", l));

  console.log(`\nMissing required fields: ${issues.missingRequiredFields.length}`);
  issues.missingRequiredFields.forEach((l) => console.log("  -", l));

  console.log(`\nFailed downloads recorded during migration: ${failedDownloadsCount}`);
  if (failedDownloadsCount > 0) console.log(`  See: ${FAILED_LOG}`);

  const totalIssues =
    issues.brokenFirebaseUrls.length +
    issues.missingLocalFiles.length +
    issues.missingRequiredFields.length +
    failedDownloadsCount;

  console.log("\n===========================================");
  console.log(totalIssues === 0 ? "✅ All checks passed." : `⚠️  ${totalIssues} issue(s) found — review above.`);

  await mongoose.disconnect();
  process.exit(totalIssues === 0 ? 0 : 1);
};

run().catch((err) => {
  console.error("verifyMigration crashed:", err);
  process.exit(1);
});