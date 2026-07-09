const buildQuotationHTML = require("../pdf/buildQuotationHTML");
const { getBrowser } = require("../helpers/browserPool");

async function generateQuotationPdf(quotation, opts = {}) {
  const html = await buildQuotationHTML(quotation, opts);
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.evaluateHandle("document.fonts.ready");
    await new Promise((resolve) => setTimeout(resolve, 300));

    const pdfBuffer = await page.pdf({
      width: "794px",
      height: "1123px",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    
    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

module.exports = generateQuotationPdf;