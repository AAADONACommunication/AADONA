const mongoose = require("mongoose");

const NewsletterHistorySchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    heading: { type: String, default: "" },
    bodyText: { type: String, required: true },
    footerText: { type: String, default: "" },
    buttons: { type: Array, default: [] },
    bannerUrl: { type: String, default: null },
    pdfNames: { type: [String], default: [] },
    sentTo: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    sentBy: { type: String, required: true },
  },
  { timestamps: true }
);

NewsletterHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model("NewsletterHistory", NewsletterHistorySchema);
