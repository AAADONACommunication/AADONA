const fs = require("fs");
const path = require("path");

const buildDatasheetHTML = (product) => {

  const logo = fs.readFileSync(
    path.resolve(__dirname, "../assets/logo.jpg")
  ).toString("base64");

  const bg = fs.readFileSync(
    path.resolve(__dirname, "../assets/bg.png")
  ).toString("base64");

  const makeIndia = fs.readFileSync(
    path.resolve(__dirname, "../assets/MakeInIndia.png")
  ).toString("base64");

  /* FEATURES */
  const highlightsHTML = (product.highlights || [])
    .map(h => `<li>${h}</li>`)
    .join("");

  /* SPECIFICATIONS */
  const specsHTML = Object.entries(product.specifications || {})
    .map(([section, specs]) => {
      const rows = Object.entries(specs || {})
        .map(([key, value]) => `
          <tr>
            <td class="spec-key">${key}</td>
            <td class="spec-val">${value}</td>
          </tr>
        `).join("");
      return `
        <div class="spec-section">
          <div class="spec-section-title">${section}</div>
          <table class="spec-table">${rows}</table>
        </div>
      `;
    }).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>

    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Open+Sans:wght@400;600&display=swap');

    /*
     * PUPPETEER-COMPATIBLE LAYOUT
     * -----------------------------------------------
     * Problem with flexbox in Puppeteer PDF:
     *   - Puppeteer ignores fixed heights on flex containers
     *     when deciding page breaks
     *   - position:absolute children get clipped or lost
     *
     * Solution used here:
     *   - Each .page is display:block with exact height
     *   - page-break-after:always + break-after:page BOTH set
     *   - Layouts use display:table / table-cell (more reliable
     *     than flexbox inside Puppeteer's headless renderer)
     *   - Overlays and positioned elements use absolute within
     *     a position:relative container of known height
     * -----------------------------------------------
     */

    @page {
      size: 794px 1123px;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    html, body {
      width: 794px;
      margin: 0;
      padding: 0;
      font-family: 'Open Sans', Arial, sans-serif;
      color: #222;
      background: #fff;
    }

    /* =============================================
       SHARED PAGE WRAPPER
       display:block + known height = Puppeteer
       respects page breaks correctly
    ============================================= */

    .page {
      display: block;
      width: 794px;
      height: 1123px;
      page-break-after: always;
      break-after: page;
      position: relative;
      overflow: hidden;
    }

    .page:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }

    /* =============================================
       COVER PAGE
    ============================================= */

    .cover-page {
      background-color: #0a1628;
      background-image: url("data:image/png;base64,${bg}");
      background-size: cover;
      background-position: center center;
    }

    .cover-overlay {
      position: absolute;
      top: 0; left: 0;
      width: 794px; height: 1123px;
      background: linear-gradient(
        160deg,
        rgba(5,15,35,0.88) 0%,
        rgba(10,30,60,0.65) 45%,
        rgba(5,15,35,0.88) 100%
      );
    }

    .cover-left-bar {
      position: absolute;
      top: 0; left: 0;
      width: 6px; height: 1123px;
      background: linear-gradient(180deg, #1b7f4c 0%, #25a86a 50%, #1b7f4c 100%);
    }

    /* All cover content above overlay */
    .cover-content {
      position: absolute;
      top: 0; left: 6px; right: 0; bottom: 0;
    }

    /* Header */
    .cover-header {
      display: table;
      width: 100%;
      height: 90px;
      padding: 0 42px;
      border-bottom: 1px solid rgba(255,255,255,0.10);
      background: rgba(255,255,255,0.04);
    }

    .cover-logo-cell {
      display: table-cell;
      vertical-align: middle;
    }

    .cover-logo {
      height: 52px;
      width: auto;
      filter: brightness(0) invert(1);
    }

    .cover-tagline-cell {
      display: table-cell;
      vertical-align: middle;
      text-align: right;
      font-family: 'Montserrat', sans-serif;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.40);
    }

    /* Model section */
    .cover-model-section {
      padding: 36px 54px 0 54px;
    }

    .cover-series {
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: #25a86a;
      margin-bottom: 10px;
    }

    .cover-model-name {
      font-family: 'Montserrat', sans-serif;
      font-size: 34px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.15;
      letter-spacing: -0.5px;
    }

    .cover-model-sub {
      font-family: 'Montserrat', sans-serif;
      font-size: 14px;
      font-weight: 400;
      color: rgba(255,255,255,0.50);
      margin-top: 8px;
    }

    .cover-green-rule {
      width: 60px;
      height: 3px;
      background: linear-gradient(90deg, #25a86a, transparent);
      margin: 16px 0 0 54px;
    }

    /* Product image */
    .cover-product-wrap {
      text-align: center;
      padding: 28px 40px;
    }

    .cover-product-img {
      max-width: 460px;
      max-height: 390px;
      width: auto;
      height: auto;
    }

    /* Description + Make in India — pinned above footer */
    .cover-desc-row {
      display: table;
      width: 100%;
      position: absolute;
      bottom: 62px;
      left: 0;
      padding: 0 54px 20px 54px;
    }

    .cover-desc-text {
      display: table-cell;
      vertical-align: bottom;
      font-family: 'Montserrat', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: rgba(255,255,255,0.78);
      line-height: 1.65;
      border-left: 3px solid #25a86a;
      padding-left: 14px;
      max-width: 380px;
    }

    .cover-india-cell {
      display: table-cell;
      vertical-align: bottom;
      text-align: right;
    }

    .cover-india-img {
      width: 100px;
      filter: brightness(0) invert(1);
      opacity: 0.72;
    }

    /* Footer */
    .cover-footer {
      position: absolute;
      bottom: 0; left: 0;
      width: 100%;
      height: 58px;
      background: rgba(0,0,0,0.50);
      border-top: 1px solid rgba(255,255,255,0.08);
      display: table;
      padding: 0 42px;
    }

    .cover-footer-copy {
      display: table-cell;
      vertical-align: middle;
      font-size: 10px;
      color: rgba(255,255,255,0.30);
      letter-spacing: 0.4px;
    }

    .cover-footer-label {
      display: table-cell;
      vertical-align: middle;
      text-align: right;
      font-family: 'Montserrat', sans-serif;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      color: rgba(37,168,106,0.65);
      text-transform: uppercase;
    }

    /* =============================================
       CONTENT PAGE
    ============================================= */

    .content-page {
      background: #ffffff;
    }

    .content-inner {
      padding: 70px 80px 80px 80px;
    }

    .content-inner h1 {
      font-family: 'Montserrat', sans-serif;
      font-size: 20px;
      font-weight: 800;
      margin-bottom: 16px;
      border-bottom: 3px solid #1b7f4c;
      padding-bottom: 8px;
      color: #1b7f4c;
    }

    .content-inner p {
      font-size: 13px;
      line-height: 1.9;
      margin-bottom: 36px;
      color: #444;
    }

    .content-inner ul {
      padding-left: 20px;
      margin-bottom: 36px;
    }

    .content-inner li {
      margin-bottom: 9px;
      font-size: 13px;
      color: #444;
      line-height: 1.7;
    }

    .spec-section {
      margin-bottom: 28px;
    }

    .spec-section-title {
      font-family: 'Montserrat', sans-serif;
      font-size: 14px;
      margin-bottom: 8px;
      color: #1b7f4c;
      font-weight: 700;
    }

    .spec-table {
      width: 100%;
      border-collapse: collapse;
    }

    .spec-table td {
      border: 1px solid #e0e0e0;
      padding: 9px 13px;
      font-size: 12px;
      vertical-align: top;
    }

    .spec-key {
      width: 40%;
      font-weight: 600;
      color: #333;
      background: #f6f8f6;
    }

    .spec-val { color: #444; }

    .spec-table tr:nth-child(even) .spec-key {
      background: #eef2ee;
    }

    /* =============================================
       LAST PAGE — BACK COVER
    ============================================= */

    .last-page {
      background-color: #0a1628;
      background-image: url("data:image/png;base64,${bg}");
      background-size: cover;
      background-position: center center;
    }

    .last-overlay {
      position: absolute;
      top: 0; left: 0;
      width: 794px; height: 1123px;
      background: linear-gradient(
        180deg,
        rgba(5,15,35,0.75) 0%,
        rgba(10,22,50,0.88) 60%,
        rgba(5,12,28,0.96) 100%
      );
    }

    .last-left-bar {
      position: absolute;
      top: 0; left: 0;
      width: 6px; height: 1123px;
      background: linear-gradient(180deg, #1b7f4c 0%, #25a86a 50%, #1b7f4c 100%);
    }

    .last-content {
      position: absolute;
      top: 0; left: 6px; right: 0; bottom: 0;
    }

    /* Logo block — centered in the upper 65% of page */
    .last-logo-area {
      position: absolute;
      top: 0; left: 0; right: 0;
      bottom: 290px;
      display: table;
      width: 100%;
    }

    .last-logo-center {
      display: table-cell;
      vertical-align: middle;
      text-align: center;
    }

    .last-logo-img {
      width: 240px;
      filter: brightness(0) invert(1);
      opacity: 0.92;
    }

    .last-logo-tagline {
      font-family: 'Montserrat', sans-serif;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.32);
      margin-top: 14px;
    }

    .last-divider-row {
      margin-top: 22px;
    }

    .last-divider-line-l {
      display: inline-block;
      width: 80px; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(37,168,106,0.6));
      vertical-align: middle;
    }

    .last-divider-dot {
      display: inline-block;
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #25a86a;
      vertical-align: middle;
      margin: 0 10px;
    }

    .last-divider-line-r {
      display: inline-block;
      width: 80px; height: 1px;
      background: linear-gradient(90deg, rgba(37,168,106,0.6), transparent);
      vertical-align: middle;
    }

    /* Address */
    .last-address-section {
      position: absolute;
      bottom: 90px; left: 0;
      width: 100%;
      border-top: 1px solid rgba(255,255,255,0.10);
      padding: 26px 54px 20px 54px;
    }

    .last-addr-table {
      display: table;
      width: 100%;
    }

    .last-addr-col {
      display: table-cell;
      width: 47%;
      font-size: 12px;
      color: rgba(255,255,255,0.52);
      line-height: 1.9;
      vertical-align: top;
    }

    .last-company-name {
      font-family: 'Montserrat', sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: rgba(255,255,255,0.88);
      margin-bottom: 2px;
    }

    .last-dept-name {
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      color: #25a86a;
      font-size: 10px;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .last-web { color: rgba(37,168,106,0.80); }

    .last-vdivider-cell {
      display: table-cell;
      width: 6%;
      text-align: center;
      vertical-align: middle;
    }

    .last-vline {
      display: inline-block;
      width: 1px;
      height: 130px;
      background: rgba(255,255,255,0.10);
    }

    /* Trademark */
    .last-trademark {
      position: absolute;
      bottom: 56px; left: 0;
      width: 100%;
      text-align: center;
      font-size: 10px;
      color: rgba(255,255,255,0.22);
      letter-spacing: 0.5px;
      padding: 0 54px;
    }

    /* Footer */
    .last-footer {
      position: absolute;
      bottom: 0; left: 0;
      width: 100%; height: 56px;
      background: rgba(0,0,0,0.52);
      border-top: 1px solid rgba(255,255,255,0.07);
      display: table;
      padding: 0 54px;
    }

    .last-footer-copy {
      display: table-cell;
      vertical-align: middle;
      font-size: 10px;
      color: rgba(255,255,255,0.28);
      letter-spacing: 0.4px;
    }

    .last-footer-url {
      display: table-cell;
      vertical-align: middle;
      text-align: right;
      font-family: 'Montserrat', sans-serif;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      color: rgba(37,168,106,0.62);
      text-transform: uppercase;
    }

  </style>
</head>
<body>

  <!-- ===== PAGE 1 — COVER ===== -->
  <div class="page cover-page">
    <div class="cover-overlay"></div>
    <div class="cover-left-bar"></div>
    <div class="cover-content">

      <div class="cover-header">
        <div class="cover-logo-cell">
          <img class="cover-logo" src="data:image/jpeg;base64,${logo}" />
        </div>
        <div class="cover-tagline-cell">Communication Technology</div>
      </div>

      <div class="cover-model-section">
        ${product.series ? `<div class="cover-series">${product.series}</div>` : ""}
        <div class="cover-model-name">${product.model || product.name}</div>
        ${product.description ? `<div class="cover-model-sub">${product.description}</div>` : ""}
      </div>
      <div class="cover-green-rule"></div>

      <div class="cover-product-wrap">
        <img class="cover-product-img" src="${product.image}" />
      </div>

      <div class="cover-desc-row">
        ${product.description
          ? `<div class="cover-desc-text">${product.description}</div>`
          : `<div></div>`}
        <div class="cover-india-cell">
          <img class="cover-india-img" src="data:image/png;base64,${makeIndia}" />
        </div>
      </div>

      <div class="cover-footer">
        <div class="cover-footer-copy">© 2024 AADONA Communication Pvt Ltd. All rights reserved</div>
        <div class="cover-footer-label">Product Datasheet</div>
      </div>

    </div>
  </div>

  <!-- ===== PAGE 2 — CONTENT ===== -->
  <div class="page content-page">
    <div class="content-inner">
      ${product.overview?.content
        ? `<h1>Product Overview</h1><p>${product.overview.content}</p>`
        : ""}
      ${(product.highlights || []).length
        ? `<h1>Key Features</h1><ul>${highlightsHTML}</ul>`
        : ""}
      ${Object.keys(product.specifications || {}).length
        ? `<h1>Technical Specifications</h1>${specsHTML}`
        : ""}
    </div>
  </div>

  <!-- ===== LAST PAGE — BACK COVER ===== -->
  <div class="page last-page">
    <div class="last-overlay"></div>
    <div class="last-left-bar"></div>
    <div class="last-content">

      <div class="last-logo-area">
        <div class="last-logo-center">
          <img class="last-logo-img" src="data:image/jpeg;base64,${logo}" />
          <div class="last-logo-tagline">Communication Technology</div>
          <div class="last-divider-row">
            <span class="last-divider-line-l"></span>
            <span class="last-divider-dot"></span>
            <span class="last-divider-line-r"></span>
          </div>
        </div>
      </div>

      <div class="last-address-section">
        <div class="last-addr-table">
          <div class="last-addr-col">
            <div class="last-company-name">AADONA Communication Pvt Ltd</div>
            <div class="last-dept-name">Corporate Headquarters</div>
            1st Floor, Phoenix Tech Tower, Plot No.14/46,<br/>
            IDA-Uppal, Hyderabad, Telangana 500039<br/>
            <span class="last-web">www.aadona.com</span><br/>
            Toll Free: 1800 202 6599<br/>
            contact@aadona.com
          </div>
          <div class="last-vdivider-cell">
            <span class="last-vline"></span>
          </div>
          <div class="last-addr-col">
            <div class="last-company-name">AADONA Communication Pvt Ltd</div>
            <div class="last-dept-name">Production, Warehousing &amp; Billing</div>
            7, SBI Colony, Mohaba Bazar, Hirapur Road,<br/>
            Raipur, Chhattisgarh — 492099<br/>
            <span class="last-web">www.aadona.com</span><br/>
            Toll Free: 1800 202 6599<br/>
            contact@aadona.com
          </div>
        </div>
      </div>

      <div class="last-trademark">
        AADONA and AADONA logo are trademarks of AADONA Communication Pvt Ltd &nbsp;·&nbsp; Printed in India
      </div>

      <div class="last-footer">
        <div class="last-footer-copy">© 2024 AADONA Communication Pvt Ltd. All rights reserved</div>
        <div class="last-footer-url">www.aadona.com</div>
      </div>

    </div>
  </div>

</body>
</html>`;
};

module.exports = buildDatasheetHTML;