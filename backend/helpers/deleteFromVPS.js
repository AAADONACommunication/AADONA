const fs = require("fs/promises");
const path = require("path");

// backend/uploads
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");
const BASE_URL = (process.env.FRONTEND_URL || "https://aadona.com").replace(/\/$/, "");

// Turns "https://aadona.com/uploads/products/167-abc.jpg"
// into   "<backend>/uploads/products/167-abc.jpg"
const getVPSPath = (url) => {
  const prefix = `${BASE_URL}/uploads/`;
  if (!url.startsWith(prefix)) return null;

  const relative = url.slice(prefix.length);
  const safeRelative = relative.split("/").filter(Boolean).join("/");

  // guard against path traversal via a malformed/malicious URL
  if (safeRelative.includes("..")) return null;

  return path.join(UPLOAD_ROOT, safeRelative);
};

/**
 * Drop-in replacement for deleteFromFirebase(url).
 * Silently no-ops on missing/invalid input, same as the original.
 * During the migration window some DB records may still hold old Firebase
 * URLs — those are skipped (nothing to delete locally) rather than errored.
 */
const deleteFromVPS = async (url) => {
  if (!url || typeof url !== "string") return;

  if (url.includes("firebasestorage.googleapis.com") || url.includes("firebasestorage.app")) {
    console.log("Skipping delete — still a Firebase URL (not migrated yet):", url);
    return;
  }

  const filePath = getVPSPath(url);
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
    console.log("VPS file deleted:", filePath);
  } catch (e) {
    if (e.code === "ENOENT") {
      console.log("File already gone:", filePath);
    } else {
      console.log("VPS delete failed:", e.code, "-", e.message);
    }
  }
};

module.exports = deleteFromVPS;