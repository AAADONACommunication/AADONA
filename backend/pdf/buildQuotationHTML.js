const fs = require("fs");
const path = require("path");

// Reuse the SAME back cover asset as the product datasheet
const backBase64 = fs.readFileSync(
  path.resolve(__dirname, "../assets/back.png")
).toString("base64");

const buildQuotationHTML = async (quotation, opts = {}) => {
  const logo = fs.readFileSync(
    path.resolve(__dirname, "../assets/logo.png")
  ).toString("base64");

  const finalAmount =
    opts.finalAmount != null ? Number(opts.finalAmount) : Number(quotation.grandTotal);
  const items = opts.items || quotation.items;
  const salesRep = opts.salesRep || null;
  const amountLabel = opts.label || "Final Accepted Amount";

  const subtotal = items.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  );

  const gstAmount = items.reduce((sum, item) => {
    const base =
      Number(item.quantity || 0) * Number(item.unitPrice || 0);

    return sum + base * (Number(item.gst || 0) / 100);
  }, 0);

  const totalBeforeDiscount = subtotal + gstAmount;

  const discountAmount = Math.max(
    totalBeforeDiscount - finalAmount,
    0
  );

  const itemRowsHTML = items.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f0fdf4"}">
      <td style="padding:9px 12px;border:0.5px solid #dde8dd;color:#374151;font-size:12px">
        ${item.name}
        ${item.description ? `<br/><span style="font-size:10px;color:#6b7280">${item.description}</span>` : ""}
      </td>
      <td style="padding:9px 12px;border:0.5px solid #dde8dd;color:#374151;font-size:12px;text-align:center">${item.quantity}</td>
      <td style="padding:9px 12px;border:0.5px solid #dde8dd;color:#374151;font-size:12px;text-align:right">₹${Number(item.unitPrice).toFixed(2)}</td>
      <td style="padding:9px 12px;border:0.5px solid #dde8dd;color:#374151;font-size:12px;text-align:right">${item.gst ?? 0}%</td>
      <td style="padding:9px 12px;border:0.5px solid #dde8dd;color:#374151;font-size:12px;text-align:right">${item.discount ?? 0}%</td>
      <td style="padding:9px 12px;border:0.5px solid #dde8dd;font-weight:600;color:#166534;font-size:12px;text-align:right">₹${Number(item.total).toFixed(2)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @page       { size: 794px 1123px; margin: 0; }
  @page back  { margin: 0; }

  * { box-sizing: border-box; margin: 0; padding: 0;
      -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { width: 794px; margin: 0; padding: 0;
               font-family: Arial, sans-serif; background: #fff; }

  .page-fixed {
    display: block;
    width: 794px;
    min-height: 1123px;
    page-break-after: always;
    break-after: page;
    position: relative;
    overflow: hidden;
  }
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
</style>
</head>
<body>

<!-- ═══════════════════════════════
     PAGE 1 — QUOTATION DETAILS
     (same header style as product datasheet content page)
═══════════════════════════════ -->
<div class="page-fixed">

  <div style="height:5px;background:#25a86a;"></div>

  <!-- Sub-header — same pattern as buildDatasheet.js content page -->
  <div style="width:794px;height:52px;background:#f4f9f4;border-bottom:1px solid #d8ead8;display:flex;align-items:center;padding:0 64px;">
    <div style="flex:1;">
      <img src="data:image/png;base64,${logo}" style="height:28px;width:auto;opacity:0.85;" />
    </div>
    <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#1b7f4c;text-transform:uppercase;">
      Final Quotation
    </div>
  </div>

  <div style="padding:40px 64px 60px 64px;">

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
      <div style="width:4px;height:20px;min-width:4px;background:#25a86a;border-radius:2px;"></div>
      <div style="font-size:18px;font-weight:800;color:#1b7f4c;">
        Quotation #${quotation.quotationNumber}
      </div>
    </div>
    <div style="font-size:11px;color:#6b7280;margin-bottom:24px;padding-left:14px;">
      Date: ${new Date().toLocaleDateString("en-IN")}
    </div>

    <!-- Customer + Sales Rep details -->
    <div style="display:flex;gap:24px;margin-bottom:28px;padding-left:14px;">
      <div style="flex:1;">
        <div style="font-size:11px;font-weight:700;color:#1b7f4c;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;border-left:3px solid #25a86a;padding-left:10px;">
          Customer Details
        </div>
        <table style="width:100%;font-size:12px;color:#374151;">
          <tr>
            <td style="padding:3px 0;color:#6b7280;width:80px;">Name</td>
            <td style="padding:3px 0;font-weight:600;color:#111827;">${quotation.customer?.personalName || "—"}</td>
          </tr>
          ${quotation.customer?.companyName ? `
          <tr>
            <td style="padding:3px 0;color:#6b7280;">Company</td>
            <td style="padding:3px 0;font-weight:600;color:#111827;">${quotation.customer.companyName}</td>
          </tr>` : ""}
          <tr>
            <td style="padding:3px 0;color:#6b7280;">Email</td>
            <td style="padding:3px 0;font-weight:600;color:#111827;">${quotation.customer?.email || "—"}</td>
          </tr>
          ${quotation.customer?.contactNumber ? `
          <tr>
            <td style="padding:3px 0;color:#6b7280;">Contact</td>
            <td style="padding:3px 0;font-weight:600;color:#111827;">${quotation.customer.contactNumber}</td>
          </tr>` : ""}
        </table>
      </div>

      <div style="flex:1;">
        <div style="font-size:11px;font-weight:700;color:#1b7f4c;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;border-left:3px solid #25a86a;padding-left:10px;">
          Sales Representative
        </div>
        <table style="width:100%;font-size:12px;color:#374151;">
          <tr>
            <td style="padding:3px 0;color:#6b7280;width:80px;">Name</td>
            <td style="padding:3px 0;font-weight:600;color:#111827;">${salesRep?.name || "—"}</td>
          </tr>
          <tr>
            <td style="padding:3px 0;color:#6b7280;">Email</td>
            <td style="padding:3px 0;font-weight:600;color:#111827;">${salesRep?.email || "—"}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Item table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
      <thead>
        <tr style="background:#166534;">
          <th style="padding:9px 12px;color:#fff;font-size:11px;text-align:left;border:0.5px solid #166534;">Product</th>
          <th style="padding:9px 12px;color:#fff;font-size:11px;text-align:center;border:0.5px solid #166534;">Qty</th>
          <th style="padding:9px 12px;color:#fff;font-size:11px;text-align:right;border:0.5px solid #166534;">Price</th>
          <th style="padding:9px 12px;color:#fff;font-size:11px;text-align:right;border:0.5px solid #166534;">GST</th>
          <th style="padding:9px 12px;color:#fff;font-size:11px;text-align:right;border:0.5px solid #166534;">Disc</th>
          <th style="padding:9px 12px;color:#fff;font-size:11px;text-align:right;border:0.5px solid #166534;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRowsHTML}</tbody>
    </table>

    <!-- Totals -->
    <div style="display:flex;justify-content:flex-end;">
      <table style="width:280px;font-size:12px;color:#374151;">
        <tr>
          <td style="padding:3px 0;">Subtotal</td>
          <td style="padding:3px 0;text-align:right;">₹${subtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:3px 0;">Discount</td>
          <td style="padding:3px 0;text-align:right;color:#dc2626;">− ₹${discountAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:3px 0;">GST</td>
          <td style="padding:3px 0;text-align:right;">₹${gstAmount.toFixed(2)}</td>
        </tr>
        <tr><td colspan="2"><div style="height:1px;background:#d1d5db;margin:6px 0;"></div></td></tr>
        <tr>
          <td style="padding:3px 0;font-weight:800;font-size:15px;color:#166534;">${amountLabel}</td>
          <td style="padding:3px 0;text-align:right;font-weight:800;font-size:15px;color:#166534;">₹${finalAmount.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <div style="margin-top:30px;font-size:10px;color:#9ca3af;padding-left:14px;">
      This is a system-generated confirmation of the final accepted quotation.
    </div>
  </div>
</div>

<!-- ═══════════════════════════════
     LAST PAGE — BACK COVER (same as product datasheet)
═══════════════════════════════ -->
<div class="page-fixed back-cover">
  <img class="page-bg" src="data:image/png;base64,${backBase64}" />
</div>

</body>
</html>`;
};

module.exports = buildQuotationHTML;