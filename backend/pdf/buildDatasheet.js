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
          <table>${rows}</table>
        </div>
      `;
    }).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>

    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #222;
    }

    /* ============================
       PAGE 1 — COVER
    ============================ */

    .page {
      position: relative;
      width: 794px;
      height: 1123px;
      overflow: hidden;
      background: #fff;
    }

    /* BG — bottom half network pattern */
    .bg {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 520px;
      object-fit: cover;
      opacity: 0.85;
    }

    /* LOGO — top left, large */
    .logo {
      position: absolute;
      top: 36px;
      left: 48px;
      width: 200px;
    }

    /* MODEL + SERIES — left side, below logo */
    .model-block {
      position: absolute;
      top: 200px;
      left: 48px;
    }

    .model-text {
      font-size: 22px;
      font-weight: 700;
      color: #111;
      line-height: 1.5;
    }

    /* PRODUCT IMAGE — center */
    .product {
      position: absolute;
      top: 300px;
      left: 50%;
      transform: translateX(-50%);
      width: 460px;
      filter: drop-shadow(0px 16px 28px rgba(0,0,0,0.18));
    }

    /* DESCRIPTION — center bottom */
    .desc {
      position: absolute;
      bottom: 230px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 16px;
      font-weight: 600;
      text-align: center;
      white-space: nowrap;
      color: #222;
    }

    /* MAKE IN INDIA — bottom right corner */
    .india {
      position: absolute;
      bottom: 60px;
      right: 48px;
      width: 130px;
    }

    /* FOOTER */
    .cover-footer {
      position: absolute;
      bottom: 18px;
      left: 48px;
      font-size: 11px;
      color: #555;
    }

    /* ============================
       PAGE BREAK
    ============================ */

    .page-break {
      page-break-before: always;
    }

    /* ============================
       PAGE 2+ — CONTENT
    ============================ */

    .page2 {
      padding: 80px;
    }

    .page2 h1 {
      font-size: 26px;
      margin-top: 0;
      margin-bottom: 18px;
      border-bottom: 3px solid #1b7f4c;
      padding-bottom: 8px;
      color: #1b7f4c;
    }

    .page2 p {
      font-size: 15px;
      line-height: 1.8;
      margin-bottom: 40px;
      color: #333;
    }

    .page2 ul {
      padding-left: 22px;
      margin-bottom: 40px;
    }

    .page2 li {
      margin-bottom: 10px;
      font-size: 15px;
      color: #333;
    }

    .spec-section {
      margin-bottom: 40px;
    }

    .spec-section h2 {
      font-size: 18px;
      margin-bottom: 10px;
      color: #1b7f4c;
      font-weight: 700;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    td {
      border: 1px solid #ddd;
      padding: 10px 12px;
      font-size: 13px;
      vertical-align: top;
    }

    td:first-child {
      width: 40%;
      font-weight: 600;
      color: #333;
      background: #f9f9f9;
    }

    td:last-child {
      color: #444;
    }

    tr:nth-child(even) td:first-child {
      background: #f0f0f0;
    }

    /* ============================
       LAST PAGE — BACK COVER
    ============================ */

    .last-page {
      position: relative;
      width: 794px;
      height: 1123px;
      overflow: hidden;
      background: #fff;
    }

    .last-logo-wrap {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -60%);
      text-align: center;
    }

    .last-logo {
      width: 280px;
    }

    .address-section {
      position: absolute;
      bottom: 200px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-around;
      padding: 30px 60px 0 60px;
      border-top: 1px solid #ccc;
    }

    .address-col {
      width: 45%;
      font-size: 13px;
      color: #333;
      line-height: 1.8;
    }

    .address-col .company-name {
      font-size: 15px;
      font-weight: 600;
      color: #222;
      margin-bottom: 2px;
    }

    .address-col .dept-name {
      font-weight: 700;
      color: #222;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .trademark-line {
      position: absolute;
      bottom: 110px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 12px;
      color: #555;
      padding: 0 60px;
    }

    .last-footer {
      position: absolute;
      bottom: 30px;
      left: 60px;
      font-size: 12px;
      color: #333;
    }

  </style>
</head>
<body>

  <!-- =====================
       PAGE 1 — COVER
  ===================== -->
  <div class="page">

    <!-- Background network pattern -->
    <img class="bg" src="data:image/png;base64,${bg}" />

    <!-- AADONA Logo top left -->
    <img class="logo" src="data:image/jpeg;base64,${logo}" />

    <!-- Model + Series block -->
    <div class="model-block">
      <div class="model-text">Model: ${product.model || product.name}</div>
      ${product.series ? `<div class="model-text">Series: ${product.series}</div>` : ""}
    </div>

    <!-- Product Image center -->
    <img class="product" src="${product.image}" />

    <!-- Description -->
    <div class="desc">
      ${product.description || ""}
    </div>

    <!-- Make In India bottom right -->
    <img class="india" src="data:image/png;base64,${makeIndia}" />

    <!-- Footer -->
    <div class="cover-footer">
      © 2024 AADONA Communication Pvt Ltd. All rights reserved
    </div>

  </div>

  <!-- PAGE BREAK -->
  <div class="page-break"></div>

  <!-- =====================
       PAGE 2+ — CONTENT
  ===================== -->
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

  <!-- PAGE BREAK -->
  <div class="page-break"></div>

  <!-- =====================
       LAST PAGE — BACK COVER
  ===================== -->
  <div class="last-page">

    <div class="last-logo-wrap">
      <img class="last-logo" src="data:image/jpeg;base64,${logo}" alt="AADONA Logo" />
    </div>

    <div class="address-section">

      <div class="address-col">
        <div class="company-name">AADONA Communication Pvt Ltd</div>
        <div class="dept-name">Corporate Headquarters</div>
        1st Floor, Phoenix Tech Tower, Plot No.14/46,<br/>
        IDA-Uppal, Hyderabad, Telangana 500039<br/>
        www.aadona.com<br/>
        Toll Free No. : 1800 202 6599<br/>
        contact@aadona.com
      </div>

      <div class="address-col">
        <div class="company-name">AADONA Communication Pvt Ltd</div>
        <div class="dept-name">Production, Warehousing and Billing Center</div>
        7, SBI Colony, Mohaba Bazar, Hirapur Road,<br/>
        Raipur Chhattisgarh: 492099<br/>
        www.aadona.com<br/>
        Toll Free No. : 1800 202 6599<br/>
        contact@aadona.com
      </div>

    </div>

    <div class="trademark-line">
      AADONA and AADONA logo are trademarks of AADONA Communication Pvt Ltd &nbsp;&nbsp; Printed in India
    </div>

    <div class="last-footer">
      © 2024 AADONA Communication Pvt Ltd. All rights reserved
    </div>

  </div>

</body>
</html>
`;

};

module.exports = buildDatasheetHTML;
/* */