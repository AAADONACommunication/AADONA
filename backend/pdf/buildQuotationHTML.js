const fs = require("fs");
const path = require("path");

const letterheadBase64 = fs.readFileSync(
  path.resolve(__dirname, "../assets/AADONALetterHeadFormatpage1.png")
).toString("base64");

const buildQuotationHTML = async (quotation, opts = {}) => {
  const finalAmount =
    opts.finalAmount != null ? Number(opts.finalAmount) : Number(quotation.grandTotal);
  const items = opts.items || quotation.items;
  const salesRep = opts.salesRep || null;
  const amountLabel = "Grand Total";
  const copyLabel = opts.copyLabel || null;
  const isPartnerCopy = copyLabel === "Partner's Copy";

  const endCustomer = quotation.endCustomer || null;

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

  const hasDiscount = discountAmount > 0.005;

  const itemRowsHTML = items.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f0fdf4"}">
      <td style="padding:9px 12px;border:0.5px solid #dde8dd;color:#374151;font-size:12px">
        ${item.name}
        ${item.description ? `<br/><span style="font-size:10px;color:#6b7280">${item.description}</span>` : ""}
      </td>
      <td style="padding:9px 12px;border:0.5px solid #dde8dd;color:#374151;font-size:12px;text-align:center">${item.quantity}</td>
      <td style="padding:9px 12px;border:0.5px solid #dde8dd;color:#374151;font-size:12px;text-align:right">₹${Number(item.unitPrice).toFixed(2)}</td>
      <td style="padding:9px 12px;border:0.5px solid #dde8dd;color:#374151;font-size:12px;text-align:right">${item.gst ?? 0}%</td>
      <td style="padding:9px 12px;border:0.5px solid #dde8dd;font-weight:600;color:#166534;font-size:12px;text-align:right">₹${Number(item.total).toFixed(2)}</td>
    </tr>
  `).join("");

  const salesRepBlockHTML = `
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
      <tr>
        <td style="padding:3px 0;color:#6b7280;">Phone</td>
        <td style="padding:3px 0;font-weight:600;color:#111827;">${salesRep?.phone || "—"}</td>
      </tr>
    </table>
  `;

  const endCustomerBlockHTML = `
    <div style="font-size:11px;font-weight:700;color:#1b7f4c;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;border-left:3px solid #25a86a;padding-left:10px;">
      End Customer Details
    </div>
    <table style="width:100%;font-size:12px;color:#374151;">
      <tr>
        <td style="padding:3px 0;color:#6b7280;width:80px;">Name</td>
        <td style="padding:3px 0;font-weight:600;color:#111827;">${endCustomer?.endCustomerName || "—"}</td>
      </tr>
      ${endCustomer?.organizationName ? `
      <tr>
        <td style="padding:3px 0;color:#6b7280;">Organization</td>
        <td style="padding:3px 0;font-weight:600;color:#111827;">${endCustomer.organizationName}</td>
      </tr>` : ""}
      ${endCustomer?.city ? `
      <tr>
        <td style="padding:3px 0;color:#6b7280;">City</td>
        <td style="padding:3px 0;font-weight:600;color:#111827;">${endCustomer.city}</td>
      </tr>` : ""}
      ${endCustomer?.mobileNumber ? `
      <tr>
        <td style="padding:3px 0;color:#6b7280;">Contact</td>
        <td style="padding:3px 0;font-weight:600;color:#111827;">${endCustomer.mobileNumber}</td>
      </tr>` : ""}
    </table>
  `;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @page { size: 794px 1123px; margin: 0; }

  * { box-sizing: border-box; margin: 0; padding: 0;
      -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { width: 794px; margin: 0; padding: 0;
               font-family: Arial, sans-serif; background: #fff; }

  .page-fixed {
    display: block;
    width: 794px;
    min-height: 1123px;
    position: relative;
    overflow: hidden;
  }
  .page-bg {
    position: absolute;
    top: 0; left: 0;
    width: 794px;
    height: 1123px;
    object-fit: cover;
    display: block;
    z-index: 0;
  }
  .page-content {
    position: relative;
    z-index: 1;
    /* Top/bottom padding keeps content clear of the letterhead's logo+stripe
       header and its green footer bar. */
    padding: 96px 64px 150px 64px;
  }
</style>
</head>
<body>

<div class="page-fixed">
  <img class="page-bg" src="data:image/png;base64,${letterheadBase64}" />

  <div class="page-content">

    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:22px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:4px;height:20px;min-width:4px;background:#25a86a;border-radius:2px;"></div>
        <div>
          <div style="font-size:18px;font-weight:800;color:#1b7f4c;">
            Quotation #${quotation.quotationNumber}
          </div>
          <div style="font-size:11px;color:#6b7280;margin-top:4px;">
            Date: ${new Date().toLocaleDateString("en-IN")}
          </div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#1b7f4c;text-transform:uppercase;">
          Final Quotation
        </div>
        ${copyLabel ? `
        <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;color:#6b7280;text-transform:uppercase;margin-top:2px;">
          ${copyLabel}
        </div>` : ""}
      </div>
    </div>

    <!-- Partner + (End Customer OR Sales Rep, depending on copy) -->
    <div style="display:flex;gap:24px;margin-bottom:20px;padding-left:14px;">
      <div style="flex:1;">
        <div style="font-size:11px;font-weight:700;color:#1b7f4c;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;border-left:3px solid #25a86a;padding-left:10px;">
          Partner Details
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
        ${isPartnerCopy ? salesRepBlockHTML : endCustomerBlockHTML}
      </div>
    </div>

    <!-- Sales Representative gets its own full-width section only for
         Admin's / Sales's Copy — for Partner's Copy it already sits in the
         right-hand column above instead of leaving that space blank. -->
    ${!isPartnerCopy ? `
    <div style="margin-bottom:28px;padding-left:14px;">
      ${salesRepBlockHTML}
    </div>` : ""}

    <!-- Item table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
      <thead>
        <tr style="background:#166534;">
          <th style="padding:9px 12px;color:#fff;font-size:11px;text-align:left;border:0.5px solid #166534;">Product</th>
          <th style="padding:9px 12px;color:#fff;font-size:11px;text-align:center;border:0.5px solid #166534;">Qty</th>
          <th style="padding:9px 12px;color:#fff;font-size:11px;text-align:right;border:0.5px solid #166534;">Price</th>
          <th style="padding:9px 12px;color:#fff;font-size:11px;text-align:right;border:0.5px solid #166534;">GST</th>
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
        ${hasDiscount ? `
        <tr>
          <td style="padding:3px 0;">Discount</td>
          <td style="padding:3px 0;text-align:right;color:#dc2626;">− ₹${discountAmount.toFixed(2)}</td>
        </tr>` : ""}
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
      This is a system-generated quotation.
    </div>
  </div>
</div>

</body>
</html>`;
};

module.exports = buildQuotationHTML;