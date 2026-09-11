import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'src', 'assets');
const SRC_DIR = path.join(ROOT, 'src');

const IMAGE_EXT = ['.png', '.jpg', '.jpeg'];
const CODE_EXT = ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.html'];
const AVIF_QUALITY = 55;

// ---- helpers -------------------------------------------------------------

async function walk(dir, exts) {
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
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      results = results.concat(await walk(full, exts));
    } else if (exts.includes(path.extname(entry.name).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

async function updateReferences(oldName, newName) {
  const codeFiles = await walk(SRC_DIR, CODE_EXT);
  let changed = 0;
  for (const file of codeFiles) {
    const content = await fs.readFile(file, 'utf8');
    if (content.includes(oldName)) {
      const updated = content.split(oldName).join(newName);
      if (updated !== content) {
        await fs.writeFile(file, updated, 'utf8');
        changed++;
      }
    }
  }
  return changed;
}

async function convertOne(filePath) {
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const dir = path.dirname(filePath);
  const avifPath = path.join(dir, `${base}.avif`);

  let alreadyConverted = false;
  try {
    await fs.access(avifPath);
    alreadyConverted = true;
  } catch {
  }

  if (!alreadyConverted) {
    await sharp(filePath).avif({ quality: AVIF_QUALITY }).toFile(avifPath);
    console.log(`✔ Converted: ${path.relative(ROOT, filePath)} -> ${path.basename(avifPath)}`);
  }

  const oldFileName = path.basename(filePath);
  const newFileName = path.basename(avifPath);
  const refsChanged = await updateReferences(oldFileName, newFileName);
  if (refsChanged) {
    console.log(`   ↳ Updated reference in ${refsChanged} file(s) (${oldFileName} -> ${newFileName})`);
  }

  try {
    await fs.unlink(filePath);
    console.log(`   ↳ Removed original: ${oldFileName}`);
  } catch (err) {
    console.warn(`   ⚠ Could not delete original (file may be open elsewhere): ${oldFileName}. Delete it manually later — conversion already succeeded.`);
  }
}

// ---- modes ----------------------------------------------------------------

async function runOnce() {
  const images = await walk(ASSETS_DIR, IMAGE_EXT);
  if (!images.length) {
    console.log('No new PNG/JPEG found in src/assets. Everything is already AVIF');
    return;
  }
  for (const img of images) {
    await convertOne(img);
  }
}

async function watchMode() {
  const { default: chokidar } = await import('chokidar');
  console.log(`👀 Watching ${path.relative(ROOT, ASSETS_DIR)} — new PNG/JPEG files will auto-convert to AVIF...`);
  const watcher = chokidar.watch(ASSETS_DIR, { ignoreInitial: true });
  watcher.on('add', (filePath) => {
    if (IMAGE_EXT.includes(path.extname(filePath).toLowerCase())) {
      setTimeout(() => convertOne(filePath).catch(console.error), 300);
    }
  });
}

const isWatch = process.argv.includes('--watch');
if (isWatch) {
  watchMode();
} else {
  runOnce().catch((err) => {
    console.error('Conversion failed:', err);
    process.exit(1);
  });
}
