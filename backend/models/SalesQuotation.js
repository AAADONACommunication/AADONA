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
        "admin_revised",
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
    adminApprovedAmount: { type: Number, default: null },
    // ── Distinguishes how the admin_revised pricing was produced ──
    // "discount_applied" → Approve As-Is (item price/GST untouched, discount raised to hit customer's offer)
    // "item_price_revised" → Revise Pricing (admin manually changed per-item unit price)
    pricingRevisionType: {
      type: String,
      enum: ["discount_applied", "item_price_revised"],
      default: null,
    },

    // ── Sales rep counter offer ──
    counterOfferAmount: { type: Number, default: null, min: 0 }, // grand total of counter offer
    counterOfferSubtotal: { type: Number, default: null, min: 0 },
    counterOfferDiscountAmount: { type: Number, default: null, min: 0 },
    counterOfferGstAmount: { type: Number, default: null, min: 0 },
    counterOfferItems: {
      type: [
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
      default: [],
    },
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
          counterOfferSubtotal: Number,
          counterOfferDiscountAmount: Number,
          counterOfferGstAmount: Number,
          counterOfferItems: {
            type: [
              {
                _id: false,
                name: String,
                description: String,
                quantity: Number,
                unitPrice: Number,
                gst: Number,
                discount: Number,
                total: Number,
              },
            ],
            default: [],
          },
          counterOfferMessage: String,
          counterOfferAt: Date,
          // ── Admin revision snapshot (filled when admin revises pricing and rep resends) ──
          adminRevisedItems: {
            type: [
              {
                _id: false,
                name: String,
                description: String,
                quantity: Number,
                unitPrice: Number,
                gst: Number,
                discount: Number,
                total: Number,
              },
            ],
            default: undefined,
          },
          adminRevisedSubtotal: Number,
          adminRevisedDiscountAmount: Number,
          adminRevisedGstAmount: Number,
          revisedGrandTotal: Number,
          revisedAt: Date,

          revisedSalesItems: {
            type: [
              {
                _id: false,
                name: String,
                description: String,
                quantity: Number,
                unitPrice: Number,
                gst: Number,
                discount: Number,
                total: Number,
              },
            ],
            default: undefined,
          },
          revisedSalesSubtotal: Number,
          revisedSalesDiscountAmount: Number,
          revisedSalesGstAmount: Number,
          revisedSalesGrandTotal: Number,
          revisedSalesSentAt: Date,
          recordedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    // ── Immutable snapshot of original sales quotation ──
    originalSnapshot: {
      items: {
        type: [
          {
            _id: false,
            name: String,
            description: String,
            quantity: Number,
            unitPrice: Number,
            gst: Number,
            discount: Number,
            total: Number,
          },
        ],
        default: [],
      },
      subtotal: { type: Number, default: null },
      discountAmount: { type: Number, default: null },
      gstAmount: { type: Number, default: null },
      grandTotal: { type: Number, default: null },
      sentAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);



SalesQuotationSchema.index({ salesRepUid: 1, createdAt: -1 });
// Speeds up the cron job's due-reminder query
SalesQuotationSchema.index({ status: 1, reminderSent: 1, reminderAt: 1 });

module.exports = mongoose.model("SalesQuotation", SalesQuotationSchema);