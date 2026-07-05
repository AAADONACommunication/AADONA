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
      enum: [
        "sent",
        "viewed",
        "accepted",
        "rejected",
        "negotiation_requested",
        "awaiting_admin_approval",
        "counter_offered",
      ],
      default: "sent",
      index: true,
    },
    sentAt: { type: Date, default: Date.now },
    viewedAt: { type: Date },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },

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

    // ── Customer negotiation ──
    customerMessage: { type: String, default: "" },
    expectedBudget: { type: Number, default: null, min: 0 },
    customerRespondedAt: { type: Date, default: null },

    // ── Admin approval (only relevant when status = awaiting_admin_approval) ──
    adminApprovedAt: { type: Date, default: null },
    adminRejectedAt: { type: Date, default: null },
    adminApprovedAmount: { type: Number, default: null }, // AdminQuotation subtotal at time of negotiation, snapshotted

    // ── Sales rep counter offer ──
    counterOfferAmount: { type: Number, default: null, min: 0 },
    counterOfferMessage: { type: String, default: "" },
    counterOfferAt: { type: Date, default: null },

    // ── Final negotiated/accepted amount (audit trail — grandTotal is NEVER overwritten) ──
    negotiatedAmount: { type: Number, default: null, min: 0 },
    negotiatedAt: { type: Date, default: null },

    // ── History of prior negotiation rounds, preserved instead of overwritten ──
    negotiationHistory: {
      type: [
        {
          _id: false,
          expectedBudget: Number,
          customerMessage: String,
          customerRespondedAt: Date,
          counterOfferAmount: Number,
          counterOfferMessage: String,
          counterOfferAt: Date,
          recordedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

SalesQuotationSchema.index({ salesRepUid: 1, createdAt: -1 });
// Speeds up the cron job's due-reminder query
SalesQuotationSchema.index({ status: 1, reminderSent: 1, reminderAt: 1 });

module.exports = mongoose.model("SalesQuotation", SalesQuotationSchema);