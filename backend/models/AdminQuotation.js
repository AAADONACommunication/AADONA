const mongoose = require("mongoose");

const AdminQuotationSchema = new mongoose.Schema(
  {
    quotationRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "QuotationRequest",
        required: true,
        unique: true,
    },
    salesRepUid: {
      type: String,
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    endCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EndCustomer",
      default: null,
    },

    items: [
      {
        name: { type: String, required: true },
        description: { type: String, default: "" },
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        gst: { type: Number, required: true, min: 0, max: 100 },
        gstAmount: { type: Number, default: 0 },
        total: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    gstAmount: { type: Number, default: 0 },
    grandTotal: { type: Number },     
    remarks: { type: String, default: "" },
    validTill: { type: Date },

    validityDays: {
      type: Number,
      enum: [7, 15, 30, 45, 60, 90],
      default: 30,
    },
    validUntil: { type: Date },

    // ── Revision history — snapshot of pricing BEFORE each admin revision ──
    revisionHistory: {
      type: [
        {
          _id: false,
          items: [
            {
              _id: false,
              name: String,
              description: String,
              quantity: Number,
              unitPrice: Number,
              gst: Number, 
              total: Number,
            },
          ],
          subtotal: Number,
          gstAmount: Number,
          grandTotal: Number,
          remarks: String,
          revisedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: ["sent", "viewed", "converted"],
      default: "sent",
      index: true,
    },
  },
  { timestamps: true }
);

AdminQuotationSchema.index({ salesRepUid: 1, createdAt: -1 });

module.exports = mongoose.model("AdminQuotation", AdminQuotationSchema);