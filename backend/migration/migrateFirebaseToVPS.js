/**
 * STEP 1 — Download every object from Firebase Storage to the VPS.
 *
 * Run on the VPS, from the backend/ directory:
 *   node migration/migrateFirebaseToVPS.js
 *
 * - Streams each file directly to disk (never buffers a whole file in memory)
 * - Preserves the bucket's folder structure under uploads/
 * - Skips files that already exist locally (safe to re-run / resume)
 * - Logs failures to migration/failed-downloads.log instead of crashing the run
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { pipeline } = require("stream/promises");
const admin = require("../firebaseAdmin");

const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");
const FAILED_LOG = path.join(__dirname, "failed-downloads.log");
const CONCURRENCY = 5; // parallel downloads — safe default for a VPS's egress

const bucket = admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET);

const appendFailedLog = async (line) => {
  await fsp.appendFile(FAILED_LOG, `${new Date().toISOString()} ${line}\n`);
};

const fileExistsLocally = async (filePath) => {
  try {
    const stat = await fsp.stat(filePath);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
};

const downloadOne = async (gcsFile, index, total) => {
  const remoteName = gcsFile.name; // e.g. "products/1234-abc.jpg"

  // Skip folder-placeholder objects some tools create
  if (remoteName.endsWith("/")) return;

  const localPath = path.join(UPLOAD_ROOT, remoteName);

  if (await fileExistsLocally(localPath)) {
    console.log(`[${index}/${total}] SKIP (already exists): ${remoteName}`);
    return;
  }

  await fsp.mkdir(path.dirname(localPath), { recursive: true });

  // Write to a .part file first so a crash mid-download never looks like
  // a "completed" file to the resume check above.
  const tmpPath = `${localPath}.part`;

  try {
    await pipeline(gcsFile.createReadStream(), fs.createWriteStream(tmpPath));
    await fsp.rename(tmpPath, localPath);
    console.log(`[${index}/${total}] OK: ${remoteName}`);
  } catch (err) {
    await fsp.rm(tmpPath, { force: true }).catch(() => {});
    console.error(`[${index}/${total}] FAILED: ${remoteName} — ${err.message}`);
    await appendFailedLog(`FAILED ${remoteName} — ${err.message}`);
  }
};

const run = async () => {
  if (!process.env.FIREBASE_STORAGE_BUCKET) {
    console.error("FIREBASE_STORAGE_BUCKET not set in .env — aborting.");
    process.exit(1);
  }

  console.log("Fetching file list from bucket:", process.env.FIREBASE_STORAGE_BUCKET);
  const [files] = await bucket.getFiles();
  console.log(`Found ${files.length} objects in bucket.\n`);

  await fsp.mkdir(UPLOAD_ROOT, { recursive: true });

  let cursor = 0;
  const worker = async () => {
    while (cursor < files.length) {
      const i = cursor++;
      await downloadOne(files[i], i + 1, files.length);
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log("\nMigration download pass complete.");
  console.log(`If any files failed, see: ${FAILED_LOG}`);
  console.log("Re-run this script any time — completed files are skipped automatically.");
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration script crashed:", err);
    process.exit(1);
  });