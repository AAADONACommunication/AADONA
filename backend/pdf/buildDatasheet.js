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
            <td>${key}</td>
            <td>${value}</td>
          </tr>
        `).join("");

      return `
        <div class="spec-section">
          <h2>${section}</h2>
          <table class="spec-table">${rows}</table>
        </div>
      `;
    }).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>

    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Open+Sans:wght@400;600&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Open Sans', Arial, sans-serif;
      color: #222;
      width: 794px;
    }

    /* ============================
       COVER PAGE — PAGE 1
    ============================ */

    .cover-page {
      width: 794px;
      height: 1123px;
      background-color: #0a1628;
      background-image: url("data:image/png;base64,${bg}");
      background-size: cover;
      background-position: center center;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .cover-dark-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        160deg,
        rgba(5,15,35,0.88) 0%,
        rgba(10,30,60,0.65) 45%,
        rgba(5,15,35,0.88) 100%
      );
    }

    .cover-left-bar {
      position: absolute;
      top: 0;
      left: 0;
      width: 6px;
      height: 100%;
      background: linear-gradient(180deg, #1b7f4c 0%, #25a86a 50%, #1b7f4c 100%);
    }

    /* All content sits above overlays */
    .cover-content {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      height: 100%;
      padding-left: 6px;
    }

    /* Header */
    .cover-header {
      display: flex;
      align-items: center;
      height: 90px;
      padding: 0 42px;
      border-bottom: 1px solid rgba(255,255,255,0.10);
      background: rgba(255,255,255,0.04);
      flex-shrink: 0;
    }

    .cover-logo {
      height: 52px;
      width: auto;
      filter: brightness(0) invert(1);
    }

    .cover-tagline {
      margin-left: auto;
      font-family: 'Montserrat', sans-serif;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.40);
    }

    /* Model block */
    .cover-model-section {
      padding: 40px 54px 0 54px;
      flex-shrink: 0;
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
      letter-spacing: 0.5px;
    }

    .cover-green-rule {
      width: 60px;
      height: 3px;
      background: linear-gradient(90deg, #25a86a, transparent);
      margin: 16px 0 0 54px;
      flex-shrink: 0;
    }

    /* Product image */
    .cover-product-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px 40px;
    }

    .cover-product-img {
      max-width: 480px;
      max-height: 420px;
      width: auto;
      height: auto;
      object-fit: contain;
      filter: drop-shadow(0px 20px 40px rgba(0,0,0,0.6))
              drop-shadow(0px 4px 10px rgba(37,168,106,0.15));
    }

    /* Description row */
    .cover-desc-row {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      padding: 0 54px 24px 54px;
      flex-shrink: 0;
    }

    .cover-desc-text {
      font-family: 'Montserrat', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: rgba(255,255,255,0.78);
      letter-spacing: 0.3px;
      max-width: 380px;
      line-height: 1.65;
      border-left: 3px solid #25a86a;
      padding-left: 14px;
    }

    .cover-india-img {
      width: 110px;
      object-fit: contain;
      filter: brightness(0) invert(1);
      opacity: 0.72;
    }

    /* Footer */
    .cover-footer {
      display: flex;
      align-items: center;
      height: 58px;
      padding: 0 42px;
      background: rgba(0,0,0,0.50);
      border-top: 1px solid rgba(255,255,255,0.08);
      flex-shrink: 0;
    }

    .cover-footer-copy {
      font-size: 10px;
      color: rgba(255,255,255,0.30);
      letter-spacing: 0.4px;
    }

    .cover-footer-label {
      margin-left: auto;
      font-family: 'Montserrat', sans-serif;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      color: rgba(37,168,106,0.65);
      text-transform: uppercase;
    }

    /* ============================
       PAGE 2+ — CONTENT
    ============================ */

    .content-page {
      width: 794px;
      padding: 80px;
      background: #ffffff;
      page-break-after: always;
    }

    .content-page h1 {
      font-family: 'Montserrat', sans-serif;
      font-size: 22px;
      font-weight: 800;
      margin-top: 0;
      margin-bottom: 18px;
      border-bottom: 3px solid #1b7f4c;
      padding-bottom: 8px;
      color: #1b7f4c;
    }

    .content-page p {
      font-size: 14px;
      line-height: 1.9;
      margin-bottom: 40px;
      color: #444;
    }

    .content-page ul {
      padding-left: 22px;
      margin-bottom: 40px;
    }

    .content-page li {
      margin-bottom: 10px;
      font-size: 14px;
      color: #444;
      line-height: 1.7;
    }

    .spec-section {
      margin-bottom: 40px;
    }

    .spec-section h2 {
      font-family: 'Montserrat', sans-serif;
      font-size: 15px;
      margin-bottom: 10px;
      color: #1b7f4c;
      font-weight: 700;
    }

    .spec-table {
      width: 100%;
      border-collapse: collapse;
    }

    .spec-table td {
      border: 1px solid #e0e0e0;
      padding: 10px 14px;
      font-size: 13px;
      vertical-align: top;
    }

    .spec-table td:first-child {
      width: 40%;
      font-weight: 600;
      color: #333;
      background: #f6f8f6;
    }

    .spec-table td:last-child {
      color: #444;
    }

    .spec-table tr:nth-child(even) td:first-child {
      background: #eef2ee;
    }

    /* ============================
       LAST PAGE — BACK COVER
    ============================ */

    .last-page {
      width: 794px;
      height: 1123px;
      background-color: #0a1628;
      background-image: url("data:image/png;base64,${bg}");
      background-size: cover;
      background-position: center center;
      page-break-after: auto;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .last-dark-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        180deg,
        rgba(5,15,35,0.75) 0%,
        rgba(10,22,50,0.88) 60%,
        rgba(5,12,28,0.96) 100%
      );
    }

    .last-left-bar {
      position: absolute;
      top: 0;
      left: 0;
      width: 6px;
      height: 100%;
      background: linear-gradient(180deg, #1b7f4c 0%, #25a86a 50%, #1b7f4c 100%);
    }

    .last-content {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      height: 100%;
      padding-left: 6px;
    }

    /* Center logo area */
    .last-logo-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .last-logo-img {
      width: 260px;
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
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 24px;
    }

    .last-divider-line {
      width: 80px;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(37,168,106,0.6));
    }

    .last-divider-line-r {
      width: 80px;
      height: 1px;
      background: linear-gradient(90deg, rgba(37,168,106,0.6), transparent);
    }

    .last-divider-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #25a86a;
      flex-shrink: 0;
    }

    /* Address section */
    .last-address-section {
      display: flex;
      justify-content: space-around;
      align-items: flex-start;
      padding: 32px 54px 24px 54px;
      border-top: 1px solid rgba(255,255,255,0.10);
      flex-shrink: 0;
    }

    .last-address-col {
      width: 44%;
      font-size: 12px;
      color: rgba(255,255,255,0.52);
      line-height: 1.9;
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
      margin-bottom: 8px;
      font-size: 10px;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }

    .last-web {
      color: rgba(37,168,106,0.80);
    }

    .last-vdivider {
      width: 1px;
      background: rgba(255,255,255,0.10);
      align-self: stretch;
    }

    /* Trademark */
    .last-trademark {
      text-align: center;
      font-size: 10px;
      color: rgba(255,255,255,0.22);
      letter-spacing: 0.5px;
      padding: 0 54px 16px 54px;
      flex-shrink: 0;
    }

    /* Footer */
    .last-footer {
      display: flex;
      align-items: center;
      height: 56px;
      padding: 0 54px;
      background: rgba(0,0,0,0.52);
      border-top: 1px solid rgba(255,255,255,0.07);
      flex-shrink: 0;
    }

    .last-footer-copy {
      font-size: 10px;
      color: rgba(255,255,255,0.28);
      letter-spacing: 0.4px;
    }

    .last-footer-url {
      margin-left: auto;
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

  <!-- PAGE 1 — COVER -->
  <div class="cover-page">
    <div class="cover-dark-overlay"></div>
    <div class="cover-left-bar"></div>
    <div class="cover-content">

      <div class="cover-header">
        <img class="cover-logo" src="data:image/jpeg;base64,${logo}" />
        <div class="cover-tagline">Communication Technology</div>
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
        ${product.description ? `<div class="cover-desc-text">${product.description}</div>` : "<div></div>"}
        <img class="cover-india-img" src="data:image/png;base64,${makeIndia}" />
      </div>

      <div class="cover-footer">
        <div class="cover-footer-copy">© 2024 AADONA Communication Pvt Ltd. All rights reserved</div>
        <div class="cover-footer-label">Product Datasheet</div>
      </div>

    </div>
  </div>

  <!-- PAGE 2+ — CONTENT -->
  <div class="content-page">
    ${product.overview?.content ? `<h1>Product Overview</h1><p>${product.overview.content}</p>` : ""}
    ${(product.highlights || []).length ? `<h1>Key Features</h1><ul>${highlightsHTML}</ul>` : ""}
    ${Object.keys(product.specifications || {}).length ? `<h1>Technical Specifications</h1>${specsHTML}` : ""}
  </div>

  <!-- LAST PAGE — BACK COVER -->
  <div class="last-page">
    <div class="last-dark-overlay"></div>
    <div class="last-left-bar"></div>
    <div class="last-content">

      <div class="last-logo-area">
        <img class="last-logo-img" src="data:image/jpeg;base64,${logo}" alt="AADONA Logo" />
        <div class="last-logo-tagline">Communication Technology</div>
        <div class="last-divider-row">
          <div class="last-divider-line"></div>
          <div class="last-divider-dot"></div>
          <div class="last-divider-line-r"></div>
        </div>
      </div>

      <div class="last-address-section">
        <div class="last-address-col">
          <div class="last-company-name">AADONA Communication Pvt Ltd</div>
          <div class="last-dept-name">Corporate Headquarters</div>
          1st Floor, Phoenix Tech Tower, Plot No.14/46,<br/>
          IDA-Uppal, Hyderabad, Telangana 500039<br/>
          <span class="last-web">www.aadona.com</span><br/>
          Toll Free: 1800 202 6599<br/>
          contact@aadona.com
        </div>
        <div class="last-vdivider"></div>
        <div class="last-address-col">
          <div class="last-company-name">AADONA Communication Pvt Ltd</div>
          <div class="last-dept-name">Production, Warehousing &amp; Billing</div>
          7, SBI Colony, Mohaba Bazar, Hirapur Road,<br/>
          Raipur, Chhattisgarh — 492099<br/>
          <span class="last-web">www.aadona.com</span><br/>
          Toll Free: 1800 202 6599<br/>
          contact@aadona.com
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
</html>
`;

};

module.exports = buildDatasheetHTML;