const fs = require("fs");
const path = require("path");

// ─── Static PNG backgrounds (loaded once at startup) ────────────────────────
const coverBase64 = fs.readFileSync(
  path.resolve(__dirname, "../assets/cover.png")
).toString("base64");

const backBase64 = fs.readFileSync(
  path.resolve(__dirname, "../assets/back.png")
).toString("base64");

// ──────────────────────────────────────────────────────────────────────────
const buildDatasheetHTML = async (product) => {

  const logo = fs.readFileSync(
    path.resolve(__dirname, "../assets/logo.png")
  ).toString("base64");

  const fetchImageAsBase64 = async (imageUrl) => {
    try {
      const response = await fetch(imageUrl);
      const buffer   = await response.arrayBuffer();
      const base64   = Buffer.from(buffer).toString("base64");
      const mimeType = response.headers.get("content-type") || "image/jpeg";
      return `data:${mimeType};base64,${base64}`;
    } catch (err) {
      console.error("Product image fetch failed:", err);
      return "";
    }
  };

  const productImageBase64 = product.image
    ? await fetchImageAsBase64(product.image)
    : "";

  // ─── Highlights HTML ───────────────────────────────────────────────────
  const highlightsHTML = (product.features || [])
    .map(h => `
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
        <div style="width:7px;height:7px;min-width:7px;background:#25a86a;border-radius:50%;margin-top:5px;flex-shrink:0;"></div>
        <div style="font-size:13px;color:#444;line-height:1.7;text-align:justify;">${h}</div>
      </div>`)
    .join("");

  // ─── Features Detail HTML ──────────────────────────────────────────────
  const featuresDetailHTML = (product.featuresDetail || [])
    .map(item => {
      if (item._type === "subheading" || item.title) {
        return `
          <div style="margin-bottom:10px;">
            <div style="font-size:13px;font-weight:700;color:#1b7f4c;border-left:3px solid #25a86a;padding-left:10px;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">${item.title}</div>
            ${item.description ? `<div style="font-size:13px;color:#444;line-height:1.7;padding-left:13px;text-align:justify;">${item.description}</div>` : ""}
          </div>`;
      }
      return `
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">
          <div style="width:7px;height:7px;min-width:7px;background:#25a86a;border-radius:50%;margin-top:5px;flex-shrink:0;"></div>
          <div style="font-size:13px;color:#444;line-height:1.7;text-align:justify;">${item.description || ""}</div>
        </div>`;
    }).join("");

  // ─── Specs HTML ────────────────────────────────────────────────────────
  const specsHTML = Object.entries(product.specifications || {})
    .map(([section, specs]) => {
      const rows = Object.entries(specs || {})
        .map(([key, value], i) => {
          const values = Array.isArray(value)
            ? value.filter(Boolean)
            : value ? [value] : [];
          const isMultiple = values.length > 1;

          const valueCell = isMultiple
            ? `<ul style="margin:0;padding:0;list-style:none;">${
                values.map(point =>
                  `<li style="display:flex;align-items:flex-start;gap:7px;margin-bottom:4px;">
                    <span style="color:#25a86a;font-size:11px;margin-top:2px;flex-shrink:0;">•</span>
                    <span>${point}</span>
                  </li>`
                ).join("")
              }</ul>`
            : `${values[0] ?? ""}`;

          return `
          <tr>
            <td style="padding:9px 14px;font-size:12px;font-weight:600;color:#2d4a2d;background:${i % 2 === 0 ? "#f3f8f3" : "#eaf2ea"};border:0.5px solid #dde8dd;width:38%;vertical-align:middle;text-align:center;">${key}</td>
            <td style="padding:9px 14px;font-size:12px;color:#444;background:${i % 2 === 0 ? "#fff" : "#fafffe"};border:0.5px solid #dde8dd;vertical-align:middle;">${valueCell}</td>
          </tr>`;
        })
        .join("");

      return `
        <div style="margin-bottom:24px;padding-top:2px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding-top:10px;">
            <div style="width:4px;height:16px;min-width:4px;background:#25a86a;border-radius:2px;"></div>
            <div style="font-size:12px;font-weight:700;color:#1b7f4c;letter-spacing:0.8px;text-transform:uppercase;">${section}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;">${rows}</table>
        </div>`;
    }).join("");

  // ══════════════════════════════════════════════════════════════════════
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @page        { size: 794px 1123px; margin: 40px 0; }
  @page cover  { margin: 0; }
  @page back   { margin: 0; }

  * { box-sizing: border-box; margin: 0; padding: 0;
      -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { width: 794px; margin: 0; padding: 0;
               font-family: Arial, sans-serif; background: #fff; }

  .page-fixed {
    display: block;
    width: 794px;
    height: 1123px;
    page-break-after: always;
    break-after: page;
    position: relative;
    overflow: hidden;
  }
  .cover-page { page: cover; }
  .back-cover {
    page: back;
    page-break-before: always;
    break-before: page;
    page-break-after: avoid;
    break-after: avoid;
  }

  .page-bg {
    position: absolute;
    top: 0; left: 0;
    width: 794px;
    height: 1123px;
    object-fit: cover;
    display: block;
  }

  /* Content section — auto height, no repeat header */
  .content-section {
    display: block;
    width: 794px;
    background: #ffffff;
  }
</style>
</head>
<body>


<!-- ═══════════════════════════════════════
     PAGE 1 — COVER
═══════════════════════════════════════ -->
<div class="page-fixed cover-page">

  <img class="page-bg" src="data:image/png;base64,${coverBase64}" />

  ${product.series ? `
  <div style="position:absolute;top:240px;left:58px;right:60px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:4px;
      text-transform:uppercase;color:#25a86a;">
      ${product.series}
    </div>
  </div>` : ""}

  <div style="position:absolute;top:${product.series ? "262px" : "240px"};left:58px;right:60px;">
    <div style="font-size:34px;font-weight:900;color:#1b7f4c;
      line-height:1.05;letter-spacing:-1px;">
      ${product.model || product.name}
    </div>

    ${product.description ? `
    <div style="font-size:14.5px;color:#2d4a2d;margin-top:10px;
      line-height:1.6;max-width:520px;">
      ${product.description}
    </div>` : ""}

    <div style="display:flex;align-items:center;gap:10px;margin-top:16px;">
      <div style="width:52px;height:3px;background:#25a86a;border-radius:2px;"></div>
      <div style="width:14px;height:3px;background:rgba(37,168,106,0.4);border-radius:2px;"></div>
      <div style="width:7px;height:3px;background:rgba(37,168,106,0.2);border-radius:2px;"></div>
    </div>
  </div>

  <div style="position:absolute;top:300px;left:0;right:0;bottom:140px;
    display:flex;align-items:center;justify-content:center;">
    <img src="${productImageBase64}"
      style="max-width:480px;max-height:360px;width:auto;height:auto;object-fit:contain;" />
  </div>

</div>


<!-- ═══════════════════════════════════════
     PAGE 2 — CONTENT (auto height, no forced page break)
═══════════════════════════════════════ -->
<div class="page-content">
  <div style="height:5px;background:#25a86a;"></div>
  <!-- Sub-header — sticky at top of every content page -->
  <div style="width:794px;height:52px;background:#f4f9f4;border-bottom:1px solid #d8ead8;display:flex;align-items:center;padding:0 64px;">
    <div style="flex:1;">
      <img src="data:image/jpeg;base64,${logo}" style="height:28px;width:auto;opacity:0.85;" />
    </div>
    <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#1b7f4c;text-transform:uppercase;">${product.model || product.name}</div>
  </div>
  <div style="padding:40px 64px 60px 64px;">
    ${product.overview?.content ? `
    <div style="margin-bottom:32px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div style="width:4px;height:20px;min-width:4px;background:#25a86a;border-radius:2px;"></div>
        <div style="font-size:16px;font-weight:800;color:#1b7f4c;">Product Overview</div>
      </div>
      <div style="font-size:13.5px;line-height:1.9;color:#444;padding-left:14px;border-left:2px solid #d8ead8;text-align:justify;">${product.overview.content}</div>
    </div>` : ""}
    ${(product.features || []).length ? `
    <div style="margin-bottom:32px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div style="width:4px;height:20px;min-width:4px;background:#25a86a;border-radius:2px;"></div>
        <div style="font-size:16px;font-weight:800;color:#1b7f4c;">Key Features</div>
      </div>
      <div style="padding-left:14px;">${highlightsHTML}</div>
    </div>` : ""}
    ${(product.featuresDetail || []).length ? `
      <div style="margin-bottom:32px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
          <div style="width:4px;height:20px;min-width:4px;background:#25a86a;border-radius:2px;"></div>
          <div style="font-size:16px;font-weight:800;color:#1b7f4c;">Features</div>
        </div>
        <div style="padding-left:14px;">${featuresDetailHTML}</div>
      </div>` : ""}
    ${Object.keys(product.specifications || {}).length ? `
    <div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <div style="width:4px;height:20px;min-width:4px;background:#25a86a;border-radius:2px;"></div>
        <div style="font-size:16px;font-weight:800;color:#1b7f4c;">Technical Specifications</div>
      </div>
      ${specsHTML}
    </div>` : ""}
  </div>
  <!-- Bottom green bar with breathing room above it -->
  <div style="height:40px;"></div>
</div>

<!-- ═══════════════════════════════════════
     LAST PAGE — BACK COVER
═══════════════════════════════════════ -->
<div class="page-fixed back-cover">
  <img class="page-bg" src="data:image/png;base64,${backBase64}" />
</div>


</body>
</html>`;
};

module.exports = buildDatasheetHTML;