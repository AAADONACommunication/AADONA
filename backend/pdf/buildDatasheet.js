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

/* ============================
   PAGE — COVER (PREMIUM)
============================ */

.page {
  position: relative;
  width: 794px;
  height: 1123px;
  overflow: hidden;
  font-family: "Poppins", Arial, sans-serif;
  color: #fff;
}

/* FULL BACKGROUND */
.bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* DARK OVERLAY (for readability) */
.overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(0,0,0,0.6) 0%,
    rgba(0,0,0,0.3) 40%,
    rgba(0,0,0,0.8) 100%
  );
}

/* LOGO */
.logo {
  position: absolute;
  top: 40px;
  left: 50px;
  width: 180px;
  z-index: 2;
}

/* MODEL BLOCK */
.model-block {
  position: absolute;
  top: 180px;
  left: 50px;
  z-index: 2;
}

.model-text {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

/* PRODUCT IMAGE */
.product {
  position: absolute;
  top: 280px;
  left: 50%;
  transform: translateX(-50%);
  width: 480px;
  z-index: 2;

  filter: drop-shadow(0px 25px 50px rgba(0,0,0,0.6));
  transition: transform 0.3s ease;
}

/* Slight premium lift feel */
.product:hover {
  transform: translateX(-50%) scale(1.03);
}

/* DESCRIPTION */
.desc {
  position: absolute;
  bottom: 220px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 18px;
  font-weight: 500;
  text-align: center;
  max-width: 80%;
  line-height: 1.6;
  z-index: 2;
}

/* INDIA BADGE */
.india {
  position: absolute;
  bottom: 60px;
  right: 50px;
  width: 120px;
  z-index: 2;
}

/* FOOTER */
.cover-footer {
  position: absolute;
  bottom: 20px;
  left: 50px;
  font-size: 12px;
  opacity: 0.8;
  z-index: 2;
}

/* GLASS CARD EFFECT (optional highlight box) */
.glass-box {
  position: absolute;
  top: 150px;
  left: 40px;
  right: 40px;
  height: 800px;
  border-radius: 20px;
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.15);
  z-index: 1;
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
  font-family: "Poppins", Arial, sans-serif;
  background: #0f172a; /* dark premium bg */
  color: #fff;
}

/* SUBTLE GRADIENT */
.last-page::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 60%);
}

/* LOGO CENTER */
.last-logo-wrap {
  position: absolute;
  top: 42%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.last-logo {
  width: 260px;
  filter: drop-shadow(0px 10px 30px rgba(0,0,0,0.6));
}

/* DIVIDER LINE */
.divider {
  position: absolute;
  top: 58%;
  left: 10%;
  width: 80%;
  height: 1px;
  background: linear-gradient(to right, transparent, #aaa, transparent);
  opacity: 0.4;
}

/* ADDRESS SECTION */
.address-section {
  position: absolute;
  bottom: 220px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 70px;
  gap: 40px;
}

.address-col {
  width: 48%;
  font-size: 13px;
  line-height: 1.8;
  color: #d1d5db;
}

/* COMPANY NAME */
.company-name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}

/* DEPARTMENT */
.dept-name {
  font-size: 14px;
  font-weight: 500;
  color: #9ca3af;
  margin-bottom: 10px;
}

/* WEBSITE + EMAIL highlight */
.address-col a {
  color: #38bdf8;
  text-decoration: none;
}

/* TRADEMARK */
.trademark-line {
  position: absolute;
  bottom: 120px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
  padding: 0 60px;
}

/* FOOTER */
.last-footer {
  position: absolute;
  bottom: 30px;
  left: 70px;
  font-size: 12px;
  color: #9ca3af;
}

/* SMALL DECOR DOTS */
.decor-dot {
  position: absolute;
  width: 6px;
  height: 6px;
  background: #38bdf8;
  border-radius: 50%;
  opacity: 0.6;
}

.dot1 { top: 80px; left: 80px; }
.dot2 { bottom: 100px; right: 100px; }
  </style>
</head>
<body>

  <!-- =====================
       PAGE 1 — COVER
  ===================== -->
 <div class="page">

  <!-- FULL BG -->
  <img class="bg" src="data:image/png;base64,${bg}" />

  <!-- DARK OVERLAY -->
  <div class="overlay"></div>

  <!-- GLASS BOX -->
  <div class="glass-box"></div>

  <!-- LOGO -->
  <img class="logo" src="data:image/jpeg;base64,${logo}" />

  <!-- MODEL -->
  <div class="model-block">
    <div class="model-text">Model: ${product.model || product.name}</div>
    ${product.series ? `<div class="model-text">Series: ${product.series}</div>` : ""}
  </div>

  <!-- PRODUCT -->
  <img class="product" src="${product.image}" />

  <!-- DESCRIPTION -->
  <div class="desc">
    ${product.description || ""}
  </div>

  <!-- INDIA -->
  <img class="india" src="data:image/png;base64,${makeIndia}" />

  <!-- FOOTER -->
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

  <!-- DECOR -->
  <div class="decor-dot dot1"></div>
  <div class="decor-dot dot2"></div>

  <!-- LOGO -->
  <div class="last-logo-wrap">
    <img class="last-logo" src="data:image/jpeg;base64,${logo}" alt="AADONA Logo" />
  </div>

  <!-- DIVIDER -->
  <div class="divider"></div>

  <!-- ADDRESS -->
  <div class="address-section">

    <div class="address-col">
      <div class="company-name">AADONA Communication Pvt Ltd</div>
      <div class="dept-name">Corporate Headquarters</div>
      1st Floor, Phoenix Tech Tower, Plot No.14/46,<br/>
      IDA-Uppal, Hyderabad, Telangana 500039<br/>
      <a>www.aadona.com</a><br/>
      Toll Free No. : 1800 202 6599<br/>
      <a>contact@aadona.com</a>
    </div>

    <div class="address-col">
      <div class="company-name">AADONA Communication Pvt Ltd</div>
      <div class="dept-name">Production, Warehousing and Billing Center</div>
      7, SBI Colony, Mohaba Bazar, Hirapur Road,<br/>
      Raipur Chhattisgarh: 492099<br/>
      <a>www.aadona.com</a><br/>
      Toll Free No. : 1800 202 6599<br/>
      <a>contact@aadona.com</a>
    </div>

  </div>

  <!-- TRADEMARK -->
  <div class="trademark-line">
    AADONA and AADONA logo are trademarks of AADONA Communication Pvt Ltd &nbsp;&nbsp; • &nbsp;&nbsp; Printed in India
  </div>

  <!-- FOOTER -->
  <div class="last-footer">
    © 2024 AADONA Communication Pvt Ltd. All rights reserved
  </div>

</div>

</body>
</html>
`;

};

module.exports = buildDatasheetHTML;