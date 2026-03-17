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

  const highlightsHTML = (product.highlights || [])
    .map(h => `
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
        <div style="width:7px;height:7px;min-width:7px;background:#25a86a;border-radius:50%;margin-top:5px;"></div>
        <div style="font-size:13px;color:#444;line-height:1.7;">${h}</div>
      </div>`)
    .join("");

  const specsHTML = Object.entries(product.specifications || {})
    .map(([section, specs]) => {
      const rows = Object.entries(specs || {})
        .map(([key, value], i) => `
          <tr>
            <td style="padding:9px 14px;font-size:12px;font-weight:600;color:#2d4a2d;background:${i % 2 === 0 ? "#f3f8f3" : "#eaf2ea"};border:0.5px solid #dde8dd;width:38%;">${key}</td>
            <td style="padding:9px 14px;font-size:12px;color:#444;background:${i % 2 === 0 ? "#fff" : "#fafffe"};border:0.5px solid #dde8dd;">${value}</td>
          </tr>`)
        .join("");
      return `
        <div style="margin-bottom:28px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
            <div style="width:4px;height:16px;background:linear-gradient(180deg,#25a86a,#1b7f4c);border-radius:2px;"></div>
            <div style="font-family:'Montserrat',sans-serif;font-size:12px;font-weight:700;color:#1b7f4c;letter-spacing:0.8px;text-transform:uppercase;">${section}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;">${rows}</table>
        </div>`;
    }).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Open+Sans:wght@400;600&display=swap');
  @page { size: 794px 1123px; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { width: 794px; margin: 0; padding: 0; font-family: 'Open Sans', Arial, sans-serif; background: #fff; }
  .page { display: block; width: 794px; height: 1123px; page-break-after: always; break-after: page; position: relative; overflow: hidden; }
  .page:last-child { page-break-after: avoid; break-after: avoid; }
  .page-bg { position: absolute; top: 0; left: 0; width: 794px; height: 1123px; object-fit: cover; object-position: center; display: block; }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════
     PAGE 1 — COVER
═══════════════════════════════════════ -->
<div class="page" style="background:#07111f;">

  <!-- Background image — rendered as <img> for Puppeteer reliability -->
  <img class="page-bg" src="data:image/png;base64,${bg}" />

  <!-- Grid overlay for depth -->
  <svg style="position:absolute;top:0;left:0;width:794px;height:1123px;" viewBox="0 0 794 1123" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="orb1" cx="75%" cy="20%" r="40%">
        <stop offset="0%" stop-color="#1b4a7a" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#07111f" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="orb2" cx="15%" cy="85%" r="35%">
        <stop offset="0%" stop-color="#0d3d2a" stop-opacity="0.40"/>
        <stop offset="100%" stop-color="#07111f" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <!-- subtle dot-grid -->
    ${Array.from({length: 12}, (_,col) => Array.from({length: 17}, (_,row) =>
      `<circle cx="${66 * col + 33}" cy="${66 * row + 33}" r="0.8" fill="#ffffff" opacity="0.04"/>`
    ).join("")).join("")}
    <!-- glow orbs -->
    <rect width="794" height="1123" fill="url(#orb1)"/>
    <rect width="794" height="1123" fill="url(#orb2)"/>
  </svg>

  <!-- Dark gradient overlay -->
  <div style="position:absolute;top:0;left:0;width:794px;height:1123px;background:linear-gradient(155deg,rgba(2,6,16,0.90) 0%,rgba(6,18,38,0.55) 40%,rgba(2,6,16,0.90) 100%);"></div>

  <!-- Accent: top horizontal line -->
  <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#25a86a 30%,#1b7f4c 70%,transparent);"></div>

  <!-- Green left bar -->
  <div style="position:absolute;top:3px;left:0;width:5px;height:1120px;background:linear-gradient(180deg,#1b7f4c 0%,#25a86a 40%,#2dca7e 60%,#1b7f4c 100%);"></div>

  <!--
    COVER CONTENT: single display:table fills 1123px height.
    3 rows:
      Row 1 (auto)   — header + model name
      Row 2 (100%)   — product image, height:* stretches to fill remaining space
      Row 3 (auto)   — description + footer pinned at bottom
    No absolute positioning on content = no blank gaps.
  -->
  <div style="position:absolute;top:0;left:5px;right:0;bottom:0;display:table;width:789px;height:1123px;table-layout:fixed;">

    <!-- ROW 1: Header + Model block -->
    <div style="display:table-row;">
      <div style="display:table-cell;">

        <!-- Header -->
        <div style="display:table;width:100%;height:88px;padding:0 48px;border-bottom:0.5px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);">
          <div style="display:table-cell;vertical-align:middle;">
            <img src="data:image/jpeg;base64,${logo}" style="height:46px;width:auto;filter:brightness(0) invert(1);opacity:0.92;" />
          </div>
          <div style="display:table-cell;vertical-align:middle;text-align:right;">
            <div style="font-family:'Montserrat',sans-serif;font-size:9px;font-weight:600;letter-spacing:3.5px;text-transform:uppercase;color:rgba(255,255,255,0.30);">Communication Technology</div>
          </div>
        </div>

        <!-- Model name block -->
        <div style="padding:36px 52px 20px 58px;">
          ${product.series ? `<div style="font-family:'Montserrat',sans-serif;font-size:10px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#25a86a;margin-bottom:12px;">${product.series}</div>` : ""}
          <div style="font-family:'Montserrat',sans-serif;font-size:42px;font-weight:900;color:#ffffff;line-height:1.05;letter-spacing:-1px;">${product.model || product.name}</div>
          ${product.description ? `<div style="font-family:'Montserrat',sans-serif;font-size:14px;font-weight:400;color:rgba(255,255,255,0.45);margin-top:10px;line-height:1.5;">${product.description}</div>` : ""}
          <div style="display:flex;align-items:center;gap:10px;margin-top:18px;">
            <div style="width:40px;height:2.5px;background:#25a86a;border-radius:2px;"></div>
            <div style="width:10px;height:2.5px;background:rgba(37,168,106,0.4);border-radius:2px;"></div>
            <div style="width:5px;height:2.5px;background:rgba(37,168,106,0.2);border-radius:2px;"></div>
          </div>
        </div>

      </div>
    </div>

    <!-- ROW 2: Product image — height:100% stretches to fill remaining space -->
    <div style="display:table-row;height:100%;">
      <div style="display:table-cell;vertical-align:middle;text-align:center;padding:10px 40px;">
        <img src="${product.image}" style="max-width:500px;max-height:380px;width:auto;height:auto;object-fit:contain;" />
      </div>
    </div>

    <!-- ROW 3: Description + Make in India + Footer -->
    <div style="display:table-row;">
      <div style="display:table-cell;">

        <!-- Description + Make in India strip -->
        <div style="display:table;width:100%;padding:0 52px 20px 52px;border-top:0.5px solid rgba(255,255,255,0.06);">
          <div style="display:table-cell;vertical-align:bottom;padding-top:16px;">
            ${product.description ? `
            <div style="border-left:3px solid #25a86a;padding-left:14px;">
              <div style="font-family:'Montserrat',sans-serif;font-size:12px;font-weight:600;color:rgba(255,255,255,0.72);line-height:1.7;">${product.description}</div>
            </div>` : ""}
          </div>
          <div style="display:table-cell;vertical-align:bottom;text-align:right;padding-top:16px;">
            <img src="data:image/png;base64,${makeIndia}" style="width:100px;filter:brightness(0) invert(1);opacity:0.65;" />
          </div>
        </div>

        <!-- Footer -->
        <div style="height:68px;background:rgba(0,0,0,0.55);border-top:0.5px solid rgba(255,255,255,0.07);display:table;width:100%;padding:0 48px;">
          <div style="display:table-cell;vertical-align:middle;">
            <div style="font-size:9.5px;color:rgba(255,255,255,0.22);letter-spacing:0.3px;">© 2024 AADONA Communication Pvt Ltd. All rights reserved.</div>
          </div>
          <div style="display:table-cell;vertical-align:middle;text-align:right;">
            <div style="font-family:'Montserrat',sans-serif;font-size:9px;font-weight:700;letter-spacing:2.5px;color:rgba(37,168,106,0.60);text-transform:uppercase;">Product Datasheet</div>
          </div>
        </div>

      </div>
    </div>

  </div>

</div>


<!-- ═══════════════════════════════════════
     PAGE 2 — CONTENT
═══════════════════════════════════════ -->
<div class="page" style="background:#ffffff;">

  <!-- Top accent bar -->
  <div style="height:5px;background:linear-gradient(90deg,#1b7f4c,#25a86a 50%,#1b7f4c);"></div>

  <!-- Header strip -->
  <div style="display:table;width:794px;height:52px;background:#f4f9f4;border-bottom:0.5px solid #d8ead8;padding:0 64px;">
    <div style="display:table-cell;vertical-align:middle;">
      <img src="data:image/jpeg;base64,${logo}" style="height:28px;width:auto;opacity:0.85;" />
    </div>
    <div style="display:table-cell;vertical-align:middle;text-align:right;">
      <div style="font-family:'Montserrat',sans-serif;font-size:9px;font-weight:700;letter-spacing:2px;color:#1b7f4c;text-transform:uppercase;">${product.model || product.name}</div>
    </div>
  </div>

  <!-- Body -->
  <div style="padding:40px 64px 60px 64px;">

    ${product.overview?.content ? `
    <!-- Overview -->
    <div style="margin-bottom:36px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <div style="width:4px;height:20px;background:linear-gradient(180deg,#25a86a,#1b7f4c);border-radius:2px;"></div>
        <div style="font-family:'Montserrat',sans-serif;font-size:16px;font-weight:800;color:#1b7f4c;letter-spacing:0.3px;">Product Overview</div>
      </div>
      <div style="font-size:13.5px;line-height:1.9;color:#444;padding-left:14px;border-left:2px solid #d8ead8;">${product.overview.content}</div>
    </div>` : ""}

    ${(product.highlights || []).length ? `
    <!-- Key Features -->
    <div style="margin-bottom:36px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <div style="width:4px;height:20px;background:linear-gradient(180deg,#25a86a,#1b7f4c);border-radius:2px;"></div>
        <div style="font-family:'Montserrat',sans-serif;font-size:16px;font-weight:800;color:#1b7f4c;letter-spacing:0.3px;">Key Features</div>
      </div>
      <div style="padding-left:14px;">${highlightsHTML}</div>
    </div>` : ""}

    ${Object.keys(product.specifications || {}).length ? `
    <!-- Specifications -->
    <div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
        <div style="width:4px;height:20px;background:linear-gradient(180deg,#25a86a,#1b7f4c);border-radius:2px;"></div>
        <div style="font-family:'Montserrat',sans-serif;font-size:16px;font-weight:800;color:#1b7f4c;letter-spacing:0.3px;">Technical Specifications</div>
      </div>
      ${specsHTML}
    </div>` : ""}

  </div>

  <!-- Bottom accent bar -->
  <div style="position:absolute;bottom:0;left:0;right:0;height:5px;background:linear-gradient(90deg,#1b7f4c,#25a86a 50%,#1b7f4c);"></div>

</div>


<!-- ═══════════════════════════════════════
     LAST PAGE — BACK COVER
═══════════════════════════════════════ -->
<div class="page" style="background:#07111f;">

  <!-- Background image -->
  <img class="page-bg" src="data:image/png;base64,${bg}" />

  <!-- Grid + orbs -->
  <svg style="position:absolute;top:0;left:0;width:794px;height:1123px;" viewBox="0 0 794 1123" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="orb3" cx="50%" cy="45%" r="45%">
        <stop offset="0%" stop-color="#0d3d2a" stop-opacity="0.30"/>
        <stop offset="100%" stop-color="#07111f" stop-opacity="0"/>
      </radialGradient>
    </defs>
    ${Array.from({length: 12}, (_,col) => Array.from({length: 17}, (_,row) =>
      `<circle cx="${66 * col + 33}" cy="${66 * row + 33}" r="0.8" fill="#ffffff" opacity="0.03"/>`
    ).join("")).join("")}
    <rect width="794" height="1123" fill="url(#orb3)"/>
  </svg>

  <!-- Dark overlay -->
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,8,20,0.78) 0%,rgba(6,18,40,0.88) 55%,rgba(2,5,14,0.96) 100%);"></div>

  <!-- Top accent -->
  <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#25a86a 30%,#1b7f4c 70%,transparent);"></div>

  <!-- Green left bar -->
  <div style="position:absolute;top:3px;left:0;width:5px;height:1120px;background:linear-gradient(180deg,#1b7f4c 0%,#25a86a 40%,#2dca7e 60%,#1b7f4c 100%);"></div>

  <!--
    LAST PAGE CONTENT: display:table with 3 rows (same approach as cover)
      Row 1 (100%) — logo centered, fills all available space
      Row 2 (auto) — address section
      Row 3 (auto) — trademark + footer
  -->
  <div style="position:absolute;top:0;left:5px;right:0;bottom:0;display:table;width:789px;height:1123px;table-layout:fixed;">

    <!-- ROW 1: Logo — stretches to fill space -->
    <div style="display:table-row;height:100%;">
      <div style="display:table-cell;vertical-align:middle;text-align:center;">

        <img src="data:image/jpeg;base64,${logo}" style="width:260px;filter:brightness(0) invert(1);opacity:0.90;" />

        <div style="font-family:'Montserrat',sans-serif;font-size:9px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,0.25);margin-top:16px;">Communication Technology</div>

        <!-- Divider -->
        <div style="display:flex;align-items:center;justify-content:center;margin-top:20px;">
          <div style="width:100px;height:0.5px;background:linear-gradient(90deg,transparent,rgba(37,168,106,0.50));"></div>
          <div style="width:6px;height:6px;background:#25a86a;border-radius:50%;margin:0 10px;flex-shrink:0;"></div>
          <div style="width:100px;height:0.5px;background:linear-gradient(90deg,rgba(37,168,106,0.50),transparent);"></div>
        </div>

      </div>
    </div>

    <!-- ROW 2: Address -->
    <div style="display:table-row;">
      <div style="display:table-cell;border-top:0.5px solid rgba(255,255,255,0.10);padding:28px 54px 20px 54px;">
        <div style="display:table;width:100%;">

          <!-- Left address -->
          <div style="display:table-cell;width:46%;vertical-align:top;">
            <div style="font-family:'Montserrat',sans-serif;font-size:12px;font-weight:700;color:rgba(255,255,255,0.85);margin-bottom:3px;">AADONA Communication Pvt Ltd</div>
            <div style="font-family:'Montserrat',sans-serif;font-size:9px;font-weight:600;color:#25a86a;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">Corporate Headquarters</div>
            <div style="font-size:11.5px;color:rgba(255,255,255,0.48);line-height:1.95;">
              1st Floor, Phoenix Tech Tower, Plot No.14/46,<br/>
              IDA-Uppal, Hyderabad, Telangana 500039<br/>
              <span style="color:rgba(37,168,106,0.75);">www.aadona.com</span><br/>
              Toll Free: 1800 202 6599<br/>
              contact@aadona.com
            </div>
          </div>

          <!-- Vertical divider -->
          <div style="display:table-cell;width:8%;text-align:center;vertical-align:middle;">
            <div style="display:inline-block;width:0.5px;height:110px;background:rgba(255,255,255,0.10);"></div>
          </div>

          <!-- Right address -->
          <div style="display:table-cell;width:46%;vertical-align:top;">
            <div style="font-family:'Montserrat',sans-serif;font-size:12px;font-weight:700;color:rgba(255,255,255,0.85);margin-bottom:3px;">AADONA Communication Pvt Ltd</div>
            <div style="font-family:'Montserrat',sans-serif;font-size:9px;font-weight:600;color:#25a86a;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">Production, Warehousing &amp; Billing</div>
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
    </div>

    <!-- ROW 3: Trademark + Footer -->
    <div style="display:table-row;">
      <div style="display:table-cell;">

        <!-- Trademark -->
        <div style="text-align:center;padding:14px 54px 12px 54px;border-top:0.5px solid rgba(255,255,255,0.06);">
          <div style="font-size:9px;color:rgba(255,255,255,0.18);letter-spacing:0.5px;">
            AADONA and AADONA logo are trademarks of AADONA Communication Pvt Ltd &nbsp;·&nbsp; Printed in India
          </div>
        </div>

        <!-- Footer -->
        <div style="height:68px;background:rgba(0,0,0,0.55);border-top:0.5px solid rgba(255,255,255,0.07);display:table;width:100%;padding:0 54px;">
          <div style="display:table-cell;vertical-align:middle;">
            <div style="font-size:9.5px;color:rgba(255,255,255,0.20);letter-spacing:0.3px;">© 2024 AADONA Communication Pvt Ltd. All rights reserved.</div>
          </div>
          <div style="display:table-cell;vertical-align:middle;text-align:right;">
            <div style="font-family:'Montserrat',sans-serif;font-size:9px;font-weight:700;letter-spacing:2.5px;color:rgba(37,168,106,0.55);text-transform:uppercase;">www.aadona.com</div>
          </div>
        </div>

      </div>
    </div>

  </div>

</div>

</body>
</html>`;
};

module.exports = buildDatasheetHTML;