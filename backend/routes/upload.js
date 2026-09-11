const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const { genericUpload } = require("../middleware/uploads");
const { uploadToVPS, ALLOWED_FOLDERS } = require("../helpers/uploadToVPS");

// Generic authenticated upload endpoint - frontend admin panel isko use karega
// (product image, datasheet, assembly diagram, blog hero/block image ke liye)
// Firebase client SDK ki jagah.
router.post("/upload/:folder", verifyToken, genericUpload.single("file"), async (req, res) => {
  try {
    const { folder } = req.params;
    if (!ALLOWED_FOLDERS.includes(folder)) {
      return res.status(400).json({ message: "Invalid upload folder" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }
    const url = await uploadToVPS(req.file, folder);
    res.json({ url });
  } catch (err) {
    console.log("Upload error:", err.message);
    res.status(500).json({ message: "Upload failed" });
  }
});

module.exports = router;
