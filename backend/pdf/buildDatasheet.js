const fs = require("fs");
const path = require("path");

const buildDatasheetHTML = async (product) => {

  const logo = fs.readFileSync(
    path.resolve(__dirname, "../assets/logo.png")
  ).toString("base64");

  const bg = fs.readFileSync(
    path.resolve(__dirname, "../assets/bg.jpeg")
  ).toString("base64");

  const makeIndia = fs.readFileSync(
    path.resolve(__dirname, "../assets/MakeIndia.png")
  ).toString("base64");

  const fetchImageAsBase64 = async (imageUrl) => {
    try {
      const response = await fetch(imageUrl);
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
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

  const highlightsHTML = (product.highlights || [])
    .map(h => `
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
        <div style="width:7px;height:7px;min-width:7px;background:#25a86a;border-radius:50%;margin-top:5px;flex-shrink:0;"></div>
        <div style="font-size:13px;color:#444;line-height:1.7;text-align:justify;">${h}</div>
      </div>`)
    .join("");

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
        <div style="margin-bottom:24px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:4px;height:16px;min-width:4px;background:#25a86a;border-radius:2px;"></div>
            <div style="font-size:12px;font-weight:700;color:#1b7f4c;letter-spacing:0.8px;text-transform:uppercase;">${section}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;">${rows}</table>
        </div>`;
    }).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @page { size: 794px 1123px; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { width: 794px; margin: 0; padding: 0; font-family: Arial, sans-serif; background: #fff; }

  .page-fixed {
    display: block;
    width: 794px;
    height: 1123px;
    page-break-after: always;
    break-after: page;
    position: relative;
    overflow: hidden;
  }

  .page-content {
    display: block;
    width: 794px;
    height: auto;
    position: relative;
    overflow: visible;
    background: #ffffff;
  }

  .page-bg {
    position: absolute;
    top: 0; left: 0;
    width: 794px;
    height: 1123px;
    object-fit: cover;
    display: block;
  }
</style>
</head>
<body>


<!-- ═══════════════════════════════════════
     PAGE 1 — COVER
═══════════════════════════════════════ -->
<div class="page-fixed">

  <img class="page-bg" src="data:image/jpeg;base64,${bg}" />

  <!-- Single CSS overlay replaces all SVG + multiple gradient divs — no render lag -->
  <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(155deg,rgba(2,6,16,0.90) 0%,rgba(6,18,38,0.55) 40%,rgba(2,6,16,0.90) 100%);"></div>
  <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#25a86a 30%,#1b7f4c 70%,transparent);"></div>
  <div style="position:absolute;top:3px;left:0;width:5px;height:1120px;background:linear-gradient(180deg,#1b7f4c 0%,#25a86a 40%,#2dca7e 60%,#1b7f4c 100%);"></div>

  <!-- FIX: Replaced display:table layout with position:absolute blocks for
       reliable alignment in PDF renderers — no more misaligned headings. -->

  <!-- Header bar -->
  <div style="position:absolute;top:0;left:5px;right:0;height:88px;border-bottom:0.5px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);display:flex;align-items:center;padding:0 48px;">
    <img src="data:image/jpeg;base64,${logo}" style="height:46px;width:auto;" />
  </div>

  <!-- Model / title block -->
  <div style="position:absolute;top:108px;left:5px;right:0;padding:0 52px 0 58px;">
    ${product.series ? `<div style="font-size:10px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#25a86a;margin-bottom:12px;">${product.series}</div>` : ""}
    <div style="font-size:42px;font-weight:900;color:#ffffff;line-height:1.05;letter-spacing:-1px;">${product.model || product.name}</div>
    ${product.description ? `<div style="font-size:14px;color:rgba(255,255,255,0.45);margin-top:10px;line-height:1.5;text-align:justify;">${product.description}</div>` : ""}
    <div style="display:flex;align-items:center;gap:10px;margin-top:18px;">
      <div style="width:40px;height:2.5px;background:#25a86a;border-radius:2px;"></div>
      <div style="width:10px;height:2.5px;background:rgba(37,168,106,0.4);border-radius:2px;"></div>
      <div style="width:5px;height:2.5px;background:rgba(37,168,106,0.2);border-radius:2px;"></div>
    </div>
  </div>

  <!-- Product image — centred in the middle band -->
  <div style="position:absolute;top:260px;left:5px;right:0;bottom:160px;display:flex;align-items:center;justify-content:center;">
    <img src="${productImageBase64}" style="max-width:500px;max-height:380px;width:auto;height:auto;object-fit:contain;" />
  </div>

  <!-- MakeInIndia badge -->
  <div style="position:absolute;bottom:90px;left:5px;right:52px;text-align:right;">
    <img src="data:image/png;base64,${makeIndia}" style="width:100px;opacity:0.85;" />
  </div>

  <!-- Footer bar -->
  <div style="position:absolute;bottom:0;left:5px;right:0;height:68px;background:rgba(0,0,0,0.55);border-top:0.5px solid rgba(255,255,255,0.07);display:flex;align-items:center;padding:0 48px;">
    <div style="flex:1;">
      <div style="font-size:9.5px;color:rgba(245,245,245,1);letter-spacing:0.3px;">© 2024 AADONA Communication Pvt Ltd. All rights reserved.</div>
    </div>
    <div>
      <div style="font-size:9px;font-weight:700;letter-spacing:2.5px;color:rgba(37,168,106,0.60);text-transform:uppercase;">Product Datasheet</div>
    </div>
  </div>

</div>


<!-- ═══════════════════════════════════════
     PAGE 2 — CONTENT (auto height, no forced page break)
═══════════════════════════════════════ -->
<div class="page-content">

  <div style="height:5px;background:linear-gradient(90deg,#1b7f4c,#25a86a 50%,#1b7f4c);"></div>

  <!-- Sub-header -->
  <div style="width:794px;height:52px;background:#f4f9f4;border-bottom:0.5px solid #d8ead8;display:flex;align-items:center;padding:0 64px;">
    <div style="flex:1;">
      <img src="data:image/jpeg;base64,${logo}" style="height:28px;width:auto;opacity:0.85;" />
    </div>
    <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#1b7f4c;text-transform:uppercase;">${product.model || product.name}</div>
  </div>

  <div style="padding:40px 64px 80px 64px;">

    ${product.overview?.content ? `
    <div style="margin-bottom:32px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div style="width:4px;height:20px;min-width:4px;background:#25a86a;border-radius:2px;"></div>
        <div style="font-size:16px;font-weight:800;color:#1b7f4c;">Product Overview</div>
      </div>
      <div style="font-size:13.5px;line-height:1.9;color:#444;padding-left:14px;border-left:2px solid #d8ead8;text-align:justify;">${product.overview.content}</div>
    </div>` : ""}

    ${(product.highlights || []).length ? `
    <div style="margin-bottom:32px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div style="width:4px;height:20px;min-width:4px;background:#25a86a;border-radius:2px;"></div>
        <div style="font-size:16px;font-weight:800;color:#1b7f4c;">Key Features</div>
      </div>
      <div style="padding-left:14px;">${highlightsHTML}</div>
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

  <div style="height:5px;background:linear-gradient(90deg,#1b7f4c,#25a86a 50%,#1b7f4c);"></div>

</div>


<!-- ═══════════════════════════════════════
     LAST PAGE — BACK COVER
═══════════════════════════════════════ -->
<div class="page-fixed" style="page-break-after:avoid;break-after:avoid;">

  <img class="page-bg" src="data:image/jpeg;base64,${bg}" />

  <!-- Single CSS overlay — no SVG, no lag -->
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,8,20,0.78) 0%,rgba(6,18,40,0.88) 55%,rgba(2,5,14,0.96) 100%);"></div>
  <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#25a86a 30%,#1b7f4c 70%,transparent);"></div>
  <div style="position:absolute;top:3px;left:0;width:5px;height:1120px;background:linear-gradient(180deg,#1b7f4c 0%,#25a86a 40%,#2dca7e 60%,#1b7f4c 100%);"></div>

  <!-- Centred logo -->
  <div style="position:absolute;top:50%;left:5px;right:0;transform:translateY(-60%);text-align:center;">
    <img src="data:image/jpeg;base64,${logo}" style="width:260px;opacity:0.90;" />
    <div style="display:flex;align-items:center;justify-content:center;margin-top:20px;">
      <div style="width:100px;height:0.5px;background:linear-gradient(90deg,transparent,rgba(37,168,106,0.50));"></div>
      <div style="width:6px;height:6px;background:#25a86a;border-radius:50%;margin:0 10px;flex-shrink:0;"></div>
      <div style="width:100px;height:0.5px;background:linear-gradient(90deg,rgba(37,168,106,0.50),transparent);"></div>
    </div>
  </div>

  <!-- Address block -->
  <div style="position:absolute;bottom:110px;left:5px;right:0;border-top:0.5px solid rgba(255,255,255,0.10);padding:28px 54px 0 54px;">
    <div style="display:flex;gap:0;">

      <div style="flex:1;vertical-align:top;">
        <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.85);margin-bottom:3px;">AADONA Communication Pvt Ltd</div>
        <div style="font-size:9px;font-weight:600;color:#25a86a;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">Corporate Headquarters</div>
        <div style="font-size:11.5px;color:rgba(255,255,255,0.48);line-height:1.95;">
          1st Floor, Phoenix Tech Tower, Plot No.14/46,<br/>
          IDA-Uppal, Hyderabad, Telangana 500039<br/>
          <span style="color:rgba(37,168,106,0.75);">www.aadona.com</span><br/>
          Toll Free: 1800 202 6599<br/>
          contact@aadona.com
        </div>
      </div>

      <div style="width:1px;background:rgba(255,255,255,0.10);margin:0 24px;"></div>

      <div style="flex:1;vertical-align:top;">
        <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.85);margin-bottom:3px;">AADONA Communication Pvt Ltd</div>
        <div style="font-size:9px;font-weight:600;color:#25a86a;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">Production, Warehousing &amp; Billing</div>
        <div style="font-size:11.5px;color:rgba(255,255,255,0.48);line-height:1.95;">
          7, SBI Colony, Mohaba Bazar, Hirapur Road,<br/>
          Raipur, Chhattisgarh — 492099<br/>
          <span style="color:rgba(37,168,106,0.75);">www.aadona.com</span><br/>
          Toll Free: 1800 202 6599<br/>
          contact@aadona.com
        </div>
      </div>

    </div>
  </div>

  <!-- Trademark line -->
  <div style="position:absolute;bottom:68px;left:5px;right:0;text-align:center;padding:0 54px 12px 54px;border-top:0.5px solid rgba(255,255,255,0.06);">
    <div style="font-size:9px;color:rgba(255,255,255,0.18);letter-spacing:0.5px;padding-top:10px;">
      AADONA and AADONA logo are trademarks of AADONA Communication Pvt Ltd &nbsp;·&nbsp; Printed in India
    </div>
  </div>

  <!-- Footer bar -->
  <div style="position:absolute;bottom:0;left:5px;right:0;height:68px;background:rgba(0,0,0,0.55);border-top:0.5px solid rgba(255,255,255,0.07);display:flex;align-items:center;padding:0 54px;">
    <div style="flex:1;">
      <div style="font-size:9.5px;color:rgba(255,255,255,0.20);letter-spacing:0.3px;">© 2024 AADONA Communication Pvt Ltd. All rights reserved.</div>
    </div>
    <div>
      <div style="font-size:9px;font-weight:700;letter-spacing:2.5px;color:rgba(37,168,106,0.55);text-transform:uppercase;">www.aadona.com</div>
    </div>
  </div>

</div>

</body>
</html>`;
};

module.exports = buildDatasheetHTML;