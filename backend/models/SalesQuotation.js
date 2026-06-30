const mongoose = require("mongoose");

const SalesQuotationSchema = new mongoose.Schema(
  {
    sourceQuotation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AdminQuotation",
        required: true,
        unique: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    salesRepUid: { type: String, required: true, index: true },
    quotationNumber: { type: String, required: true, unique: true, index: true },
    publicToken: {
        type: String,
        unique: true,
        index: true,
    },
    items: [
      {
        _id: false,
        name: { type: String, required: true },
        description: { type: String, default: "" },
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true, min: 0 },
        gst: { type: Number, default: 0, min: 0, max: 100 },
        discount: { type: Number, default: 0, min: 0 },
        total: { type: Number, required: true, min: 0 },
      },
    ],
    subtotal: { type: Number, required: true, min: 0},
    discountAmount: { type: Number, default: 0, min: 0 },
    gstAmount: { type: Number, default: 0, min:0 },
    grandTotal: { type: Number, required: true, min:0 },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["sent", "viewed", "accepted", "rejected"],
      default: "sent",
      index: true,
    },
    sentAt: { type: Date, default: Date.now },
    viewedAt: { type: Date },
    acceptedAt: { type: Date },

    // ── Reminder scheduling ──
    reminderAfterDays: {
      type: Number,
      enum: [3, 7],
      default: null,
    },
    reminderAt: {
      type: Date,
      default: null,
      index: true,
    },
    reminderSent: {
      type: Boolean,
      default: false,
      index: true,
    },
    reminderSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

SalesQuotationSchema.index({ salesRepUid: 1, createdAt: -1 });
// Speeds up the cron job's due-reminder query
SalesQuotationSchema.index({ status: 1, reminderSent: 1, reminderAt: 1 });

module.exports = mongoose.model("SalesQuotation", SalesQuotationSchema);