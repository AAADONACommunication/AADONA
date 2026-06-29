const mongoose = require("mongoose");

const QuotationRequestItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const QuotationRequestSchema = new mongoose.Schema(
  {
    requestNumber: { type: String, required: true, unique: true, index: true },

    salesRepUid: { type: String, required: true, index: true }, // Firebase UID of sales rep
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },

    items: { type: [QuotationRequestItemSchema], required: true },
    notes: { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "quoted"], // quoted = admin has priced it (AdminQuotation exists)
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

QuotationRequestSchema.index({ salesRepUid: 1, createdAt: -1 });

module.exports = mongoose.model("QuotationRequest", QuotationRequestSchema);