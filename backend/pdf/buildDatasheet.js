const fs = require("fs");
const path = require("path");

const buildDatasheetHTML = (product) => {
  // FIXED: Proper base64 encoding with correct MIME types
  const logo = fs.readFileSync(
    path.resolve(__dirname, "../assets/logo.jpg"),
    'base64'
  );
  
  const bg = fs.readFileSync(
    path.resolve(__dirname, "../assets/bg.png"),
    'base64'
  );
  
  const makeIndia = fs.readFileSync(
    path.resolve(__dirname, "../assets/MakeInIndia.png"),
    'base64'
  );

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
          <table>${rows}</table>
        </div>
      `;
    }).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* BASE STYLES - PDF COMPATIBLE */
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: "Arial", Helvetica, sans-serif;
      color: #222;
      line-height: 1.4;
    }

    /* ============================
       STANDARD A4 PAGE SIZE (210mm x 297mm)
    ============================ */
    .page, .page2, .last-page {
      width: 210mm;
      min-height: 297mm;
      margin: 0;
      padding: 0;
      position: relative;
      page-break-after: always;
      overflow: visible;
    }

    /* ============================
       PAGE 1 — COVER PAGE
    ============================ */
    .page {
      background: #1a1a2e;
      color: #fff;
    }

    /* BACKGROUND IMAGE */
    .bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 1;
    }

    /* DARK OVERLAY */
    .overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        to bottom,
        rgba(0,0,0,0.6) 0%,
        rgba(0,0,0,0.4) 40%,
        rgba(0,0,0,0.8) 100%
      );
      z-index: 2;
    }

    /* LOGO */
    .logo {
      position: absolute;
      top: 30px;
      left: 30px;
      width: 140px;
      z-index: 4;
    }

    /* MODEL BLOCK */
    .model-block {
      position: absolute;
      top: 140px;
      left: 30px;
      z-index: 4;
    }

    .model-text {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 8px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    }

    /* PRODUCT IMAGE */
    .product {
      position: absolute;
      top: 220px;
      left: 50%;
      transform: translateX(-50%);
      width: 65%;
      max-width: 380px;
      z-index: 4;
      filter: drop-shadow(0 15px 30px rgba(0,0,0,0.5));
    }

    /* DESCRIPTION */
    .desc {
      position: absolute;
      bottom: 160px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 16px;
      font-weight: 500;
      text-align: center;
      max-width: 80%;
      line-height: 1.5;
      z-index: 4;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    }

    /* INDIA BADGE */
    .india {
      position: absolute;
      bottom: 60px;
      right: 30px;
      width: 90px;
      z-index: 4;
    }

    /* FOOTER */
    .cover-footer {
      position: absolute;
      bottom: 20px;
      left: 30px;
      font-size: 11px;
      opacity: 0.9;
      z-index: 4;
    }

    /* ============================
       PAGE 2+ — CONTENT PAGES
    ============================ */
    .page2 {
      background: white;
      padding: 60px 40px;
      max-width: 210mm;
    }

    .page2 h1 {
      font-size: 24px;
      margin: 0 0 20px 0;
      border-bottom: 3px solid #1b7f4c;
      padding-bottom: 10px;
      color: #1b7f4c;
      font-weight: 700;
    }

    .page2 p {
      font-size: 14px;
      line-height: 1.7;
      margin-bottom: 30px;
      color: #333;
    }

    .page2 ul {
      padding-left: 20px;
      margin-bottom: 30px;
    }

    .page2 li {
      margin-bottom: 8px;
      font-size: 14px;
      color: #333;
    }

    /* SPECIFICATIONS */
    .spec-section {
      margin-bottom: 35px;
    }

    .spec-section h2 {
      font-size: 17px;
      margin-bottom: 12px;
      color: #1b7f4c;
      font-weight: 700;
    }

    .spec-section table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
    }

    .spec-section td {
      border: 1px solid #ddd;
      padding: 12px 10px;
      font-size: 13px;
      vertical-align: top;
    }

    .spec-section td:first-child {
      width: 38%;
      font-weight: 600;
      color: #333;
      background: #f8f9fa;
    }

    .spec-section td:last-child {
      color: #444;
    }

    /* ============================
       LAST PAGE — BACK COVER
    ============================ */
    .last-page {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #fff;
      padding: 0;
    }

    /* DECOR DOTS */
    .decor-dot {
      position: absolute;
      width: 8px;
      height: 8px;
      background: #38bdf8;
      border-radius: 50%;
      opacity: 0.7;
    }

    .dot1 { top: 60px; left: 60px; }
    .dot2 { bottom: 120px; right: 60px; }

    /* LOGO CENTER */
    .last-logo-wrap {
      position: absolute;
      top: 35%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }

    .last-logo {
      width: 200px;
      filter: drop-shadow(0 10px 25px rgba(0,0,0,0.5));
    }

    /* DIVIDER */
    .divider {
      position: absolute;
      top: 52%;
      left: 10%;
      width: 80%;
      height: 2px;
      background: linear-gradient(to right, transparent, #94a3b8, transparent);
      opacity: 0.6;
    }

    /* ADDRESS SECTION */
    .address-section {
      position: absolute;
      bottom: 180px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      padding: 0 50px;
      gap: 30px;
    }

    .address-col {
      width: 48%;
      font-size: 12px;
      line-height: 1.6;
      color: #cbd5e1;
    }

    .company-name {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 6px;
    }

    .dept-name {
      font-size: 13px;
      font-weight: 600;
      color: #94a3b8;
      margin-bottom: 12px;
    }

    .address-col a {
      color: #38bdf8;
      text-decoration: none;
      font-weight: 500;
    }

    /* TRADEMARK */
    .trademark-line {
      position: absolute;
      bottom: 100px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      padding: 0 50px;
    }

    /* FOOTER */
    .last-footer {
      position: absolute;
      bottom: 25px;
      left: 50px;
      font-size: 11px;
      color: #94a3b8;
    }

    /* ============================
       PDF PRINT SPECIFIC FIXES
    ============================ */
    @media print {
      body { 
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .page, .page2, .last-page {
        margin: 0 !important;
        padding: 0 !important;
        position: relative !important;
        page-break-after: always;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      * { 
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      img { -webkit-print-color-adjust: exact !important; }
    }

    @page {
      size: A4;
      margin: 0;
    }
  </style>
</head>
<body>
  <!-- PAGE 1 — COVER -->
  <div class="page">
    <img class="bg" src="data:image/png;base64,${bg}" alt="Background" />
    <div class="overlay"></div>
    
    <img class="logo" src="data:image/jpeg;base64,${logo}" alt="Logo" />
    
    <div class="model-block">
      <div class="model-text">Model: ${product.model || product.name}</div>
      ${product.series ? `<div class="model-text">Series: ${product.series}</div>` : ""}
    </div>
    
    <img class="product" src="${product.image}" alt="Product" />
    
    <div class="desc">${product.description || ""}</div>
    
    <img class="india" src="data:image/png;base64,${makeIndia}" alt="Make in India" />
    
    <div class="cover-footer">
      © 2026 AADONA Communication Pvt Ltd. All rights reserved
    </div>
  </div>

  <!-- PAGE 2 — CONTENT -->
  <div class="page2">
    ${product.overview?.content ? `
      <h1>Product Overview</h1>
      <p>${product.overview.content}</p>
    ` : ""}

    ${(product.highlights || []).length ? `
      <h1>Key Features</h1>
      <ul>${highlightsHTML}</ul>
    ` : ""}

    ${Object.keys(product.specifications || {}).length ? `
      <h1>Technical Specifications</h1>
      ${specsHTML}
    ` : ""}
  </div>

  <!-- LAST PAGE — BACK COVER -->
  <div class="last-page">
    <div class="decor-dot dot1"></div>
    <div class="decor-dot dot2"></div>
    
    <div class="last-logo-wrap">
      <img class="last-logo" src="data:image/jpeg;base64,${logo}" alt="AADONA Logo" />
    </div>
    
    <div class="divider"></div>
    
    <div class="address-section">
      <div class="address-col">
        <div class="company-name">AADONA Communication Pvt Ltd</div>
        <div class="dept-name">Corporate Headquarters</div>
        1st Floor, Phoenix Tech Tower, Plot No.14/46,<br/>
        IDA-Uppal, Hyderabad, Telangana 500039<br/>
        <a href="https://www.aadona.com">www.aadona.com</a><br/>
        Toll Free No. : 1800 202 6599<br/>
        <a href="mailto:contact@aadona.com">contact@aadona.com</a>
      </div>

      <div class="address-col">
        <div class="company-name">AADONA Communication Pvt Ltd</div>
        <div class="dept-name">Production, Warehousing and Billing Center</div>
        7, SBI Colony, Mohaba Bazar, Hirapur Road,<br/>
        Raipur Chhattisgarh: 492099<br/>
        <a href="https://www.aadona.com">www.aadona.com</a><br/>
        Toll Free No. : 1800 202 6599<br/>
        <a href="mailto:contact@aadona.com">contact@aadona.com</a>
      </div>
    </div>

    <div class="trademark-line">
      AADONA and AADONA logo are trademarks of AADONA Communication Pvt Ltd • Printed in India
    </div>

    <div class="last-footer">
      © 2026 AADONA Communication Pvt Ltd. All rights reserved
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = buildDatasheetHTML;
