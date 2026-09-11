const multer = require("multer");

const storage = multer.memoryStorage();

// General upload - forms, mail attachments ke liye (PDF + sabhi images)
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "image/bmp",
      "image/tiff",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF and images allowed."), false);
    }
  },
});

const uploadBanner = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max - banner 100-200KB hoga
  fileFilter: (req, file, cb) => {
    const allowed = ["image/avif", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only AVIF/WebP allowed."), false);
    }
  },
});

// Generic authenticated upload endpoint - frontend admin panel isko use karega
// (product image, datasheet, assembly diagram, blog hero/block image ke liye)
// Firebase client SDK ki jagah.
const genericUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

module.exports = { upload, uploadBanner, genericUpload };
