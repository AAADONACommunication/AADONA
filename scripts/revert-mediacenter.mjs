import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TARGET_DIR = path.join(ROOT, 'src', 'assets', 'Media-Center');

async function walk(dir) {
  let results = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(await walk(full));
    } else if (path.extname(entry.name).toLowerCase() === '.avif') {
      results.push(full);
    }
  }
  return results;
}

async function revertOne(avifPath) {
  const dir = path.dirname(avifPath);
  const base = path.basename(avifPath, '.avif');

  const image = sharp(avifPath);
  const meta = await image.metadata();
  const hasAlpha = !!meta.hasAlpha;

  const outExt = hasAlpha ? '.png' : '.jpg';
  const outPath = path.join(dir, `${base}${outExt}`);

  if (hasAlpha) {
    await image.png({ quality: 90 }).toFile(outPath);
  } else {
    await image.jpeg({ quality: 90 }).toFile(outPath);
  }

  console.log(`✔ Reverted: ${path.relative(ROOT, avifPath)} -> ${path.basename(outPath)}`);

  try {
    await fs.unlink(avifPath);
  } catch (err) {
    console.warn(`   ⚠ Could not delete ${path.basename(avifPath)} (file may be open elsewhere). Delete it manually later.`);
  }
}

async function run() {
  const avifFiles = await walk(TARGET_DIR);
  if (!avifFiles.length) {
    console.log('No AVIF files found under Media-Center. Nothing to revert.');
    return;
  }
  for (const file of avifFiles) {
    await revertOne(file);
  }
  console.log(`\nDone. Reverted ${avifFiles.length} file(s).`);
}

run().catch((err) => {
  console.error('Revert failed:', err);
  process.exit(1);
});