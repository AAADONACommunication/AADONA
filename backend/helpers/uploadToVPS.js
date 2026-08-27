const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");

const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");

const ALLOWED_FOLDERS = [
  "products",
  "datasheets",
  "category-banners",
  "blog-blocks",
  "blog-heroes",
  "assembly-diagrams",
  "newsletter-banners",
  "resumes",
  "warranty",
  "doa",
  "registrations",
  "whistleblower",
];

const BASE_URL = (process.env.FRONTEND_URL || "https://aadona.com").replace(/\/$/, "");

const sanitizeFileName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

const CONVERTIBLE_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/bmp",
  "image/tiff",
]);

const uploadToVPS = async (file, folder) => {
  if (!file) return null;
  if (!ALLOWED_FOLDERS.includes(folder)) {
    throw new Error(`Invalid upload folder: ${folder}`);
  }

  const folderPath = path.join(UPLOAD_ROOT, folder);
  await fsp.mkdir(folderPath, { recursive: true });

  const safeName = sanitizeFileName(file.originalname);
  const isConvertible = CONVERTIBLE_IMAGE_TYPES.has((file.mimetype || "").toLowerCase());

  let finalName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safeName}`;
  let bufferToWrite = file.buffer;

  if (isConvertible) {
    try {
      bufferToWrite = await sharp(file.buffer).webp({ quality: 82 }).toBuffer();
      finalName = finalName.replace(/\.(png|jpe?g|gif|bmp|tiff)$/i, ".webp");
    } catch (err) {
      // Agar sharp kisi wajah se fail ho jaye (corrupt image, unsupported
      // variant), toh original file hi save kar do - upload block nahi hona chahiye.
      console.error(`sharp conversion failed for ${safeName}, saving original:`, err.message);
      bufferToWrite = file.buffer;
    }
  }

  const filePath = path.join(folderPath, finalName);
  await fsp.writeFile(filePath, bufferToWrite);

  return `${BASE_URL}/uploads/${folder}/${finalName}`;
};

const saveBufferToVPS = async (buffer, folder, fileName) => {
  if (!ALLOWED_FOLDERS.includes(folder)) {
    throw new Error(`Invalid upload folder: ${folder}`);
  }

  const folderPath = path.join(UPLOAD_ROOT, folder);
  await fsp.mkdir(folderPath, { recursive: true });

  const filePath = path.join(folderPath, fileName);
  await fsp.writeFile(filePath, buffer);

  return `${BASE_URL}/uploads/${folder}/${fileName}`;
};

module.exports = { uploadToVPS, saveBufferToVPS, ALLOWED_FOLDERS, UPLOAD_ROOT };