const { saveBufferToVPS } = require("../helpers/uploadToVPS");
const buildDatasheetHTML = require("../pdf/buildDatasheet");
const { getBrowser } = require("../helpers/browserPool");

// ─── PDF Cache: slug → { url, generatedAt } ───────────────────────────────
const pdfCache = new Map();
const PDF_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const generateAndUploadDatasheet = async (product) => {
  try {
    // Check in-memory cache first
    const cached = pdfCache.get(product.slug);
    if (cached && Date.now() - cached.generatedAt < PDF_CACHE_TTL_MS) {
      console.log("PDF cache hit for:", product.slug);
      return cached.url;
    }

    const html = await buildDatasheetHTML(product);
    const browser = await getBrowser();
    const page = await browser.newPage();

    // Match HTML page width exactly (794px = A4 width at 96dpi)
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Wait for fonts + images to fully load
    await page.evaluateHandle("document.fonts.ready");
    await new Promise((resolve) => setTimeout(resolve, 500));

    const pdfBuffer = await page.pdf({
      width: "794px",
      height: "1123px",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await page.close();

    const fileName = `${product.slug}.pdf`;
    const url = await saveBufferToVPS(pdfBuffer, "datasheets", fileName);
    console.log("Datasheet saved to VPS:", url);

    // Store in memory cache
    pdfCache.set(product.slug, { url, generatedAt: Date.now() });

    return url;
  } catch (err) {
    console.log("Datasheet generation failed:", err.message);
    return null;
  }
};

module.exports = { generateAndUploadDatasheet, pdfCache, PDF_CACHE_TTL_MS };
