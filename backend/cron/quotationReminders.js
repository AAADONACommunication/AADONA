const cron = require("node-cron");
const SalesQuotation = require("../models/SalesQuotation");
const transporter = require("../mailer");

const FRONTEND_URL = process.env.FRONTEND_URL || "https://domain.com";

const buildReminderEmailHtml = (quotation) => {
  const { quotationNumber, grandTotal, customer, publicToken } = quotation;
  const viewLink = `${FRONTEND_URL}/quotation/${publicToken}`;

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"/></head>
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0"
            style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

            <tr>
              <td style="background:linear-gradient(135deg,#166534,#16a34a);padding:32px;text-align:center">
                <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:800">AADONA Communication</h1>
                <p style="color:#bbf7d0;margin:6px 0 0;font-size:13px">Friendly Reminder</p>
              </td>
            </tr>

            <tr>
              <td style="padding:32px">
                <p style="color:#111827;font-size:15px;margin:0 0 12px">
                  Hi ${customer?.personalName || "there"},
                </p>
                <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px">
                  This is a quick reminder that quotation <strong>#${quotationNumber}</strong>
                  for <strong>₹${Number(grandTotal).toFixed(2)}</strong> is still awaiting your
                  response. We'd love to hear from you.
                </p>
                <table cellpadding="0" cellspacing="0" align="center">
                  <tr>
                    <td style="border-radius:8px;background:#16a34a">
                      <a href="${viewLink}"
                        style="display:inline-block;padding:14px 32px;color:#ffffff;
                        text-decoration:none;font-weight:700;font-size:14px;border-radius:8px">
                        View Quotation
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 32px 28px;text-align:center">
                <p style="color:#374151;font-size:14px;margin:0 0 4px">Regards,</p>
                <p style="color:#166534;font-weight:700;font-size:15px;margin:0">AADONA</p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
};

// Runs every 15 minutes. Cheap enough not to need anything fancier,
// and granular enough that reminders go out close to their scheduled time.
const startQuotationReminderCron = () => {
  cron.schedule("*/15 * * * *", async () => {
    try {
      const now = new Date();

      const dueQuotations = await SalesQuotation.find({
        status: { $in: ["sent", "viewed"] },
        reminderSent: false,
        reminderAt: { $ne: null, $lte: now },
      }).populate("customer");

      if (dueQuotations.length === 0) return;

      console.log(`[reminder-cron] ${dueQuotations.length} reminder(s) due`);

      for (const quotation of dueQuotations) {
        try {
          if (!quotation.customer?.email) {
            console.warn(
              `[reminder-cron] Skipping ${quotation.quotationNumber} — no customer email`
            );
            continue;
          }

          await transporter.sendMail({
            from: `"AADONA Communication" <${process.env.EMAIL_USER}>`,
            to: quotation.customer.email,
            subject: `Reminder: Quotation #${quotation.quotationNumber} — AADONA Communication`,
            html: buildReminderEmailHtml(quotation),
          });

          // Mark as sent immediately after a successful send so a slow loop
          // or a re-run within the same 15-min window can't double-send.
          quotation.reminderSent = true;
          quotation.reminderSentAt = new Date();
          await quotation.save();

          console.log(`[reminder-cron] Sent reminder for ${quotation.quotationNumber}`);
        } catch (err) {
          console.error(
            `[reminder-cron] Failed to send reminder for ${quotation.quotationNumber}:`,
            err.message
          );
          // Don't mark reminderSent — it'll be retried on the next tick.
        }
      }
    } catch (err) {
      console.error("[reminder-cron] Job error:", err.message);
    }
  });

  console.log("[reminder-cron] Quotation reminder scheduler started");
};

module.exports = startQuotationReminderCron;