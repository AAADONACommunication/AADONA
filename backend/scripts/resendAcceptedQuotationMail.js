require("dotenv").config();
const mongoose = require("mongoose");
const transporter = require("../mailer");
const SalesQuotation = require("../models/SalesQuotation");
const SalesRep = require("../models/SalesRep");
require("../models/Customer");
const generateQuotationPdf = require("../utils/generateQuotationPdf");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

async function main() {
  const identifier = process.argv[2];
  if (!identifier) {
    console.error("Usage: node scripts/resendAcceptedQuotationMail.js <quotationNumberOrId>");
    process.exit(1);
  }

  if (!process.env.MONGO_URL) {
    console.error("MONGO_URL not found in .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URL);
  console.log("Connected to MongoDB:", mongoose.connection.name);

  try {
    const query = mongoose.Types.ObjectId.isValid(identifier)
      ? { _id: identifier }
      : { quotationNumber: identifier };

    const quotation = await SalesQuotation.findOne(query).populate("customer");
    if (!quotation) {
      console.error("Quotation not found for:", identifier);
      process.exit(1);
    }

    if (quotation.status !== "accepted") {
      console.error(
        `Refusing to send final-confirmation mail — quotation status is "${quotation.status}", not "accepted".`
      );
      process.exit(1);
    }

    const finalAmount =
      quotation.negotiatedAmount != null ? quotation.negotiatedAmount : quotation.grandTotal;

    const salesRep = await SalesRep.findOne({ uid: quotation.salesRepUid });

    console.log(`Generating PDF for quotation #${quotation.quotationNumber} ...`);
    const pdfBuffer = await generateQuotationPdf(quotation, { finalAmount, salesRep });

    const attachments = [
      {
        filename: `Quotation-${quotation.quotationNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ];

    const reportHtml = `
      <div style="font-family:Arial,sans-serif;padding:24px;background:#f0fdf4">
        <h2 style="color:#166534">Quotation Accepted ✅ (Resent Confirmation)</h2>
        <p style="color:#374151;font-size:14px"><strong>Quotation:</strong> #${quotation.quotationNumber}</p>
        <p style="color:#374151;font-size:14px"><strong>Customer:</strong> ${quotation.customer?.personalName || "—"}</p>
        <p style="color:#374151;font-size:14px"><strong>Final Accepted Amount:</strong> ₹${Number(finalAmount).toFixed(2)}</p>
        <p style="color:#374151;font-size:14px">Final PDF attached for your records.</p>
      </div>
    `;

    const jobs = [];

    if (quotation.customer?.email) {
      jobs.push(
        transporter.sendMail({
          from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
          to: quotation.customer.email,
          subject: `Quotation Confirmed — #${quotation.quotationNumber}`,
          html: reportHtml,
          attachments,
        })
      );
    }

    if (salesRep?.email) {
      jobs.push(
        transporter.sendMail({
          from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
          to: salesRep.email,
          subject: `Quotation Accepted — #${quotation.quotationNumber}`,
          html: reportHtml,
          attachments,
        })
      );
    }

    if (ADMIN_EMAIL) {
      jobs.push(
        transporter.sendMail({
          from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
          to: ADMIN_EMAIL,
          subject: `Quotation Accepted — #${quotation.quotationNumber}`,
          html: reportHtml,
          attachments,
        })
      );
    }

    const results = await Promise.allSettled(jobs);
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(`Email job ${i} failed:`, r.reason?.message || r.reason);
      } else {
        console.log(`Email job ${i} sent successfully.`);
      }
    });

    console.log("Done.");
  } catch (err) {
    console.error("Script error:", err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();