const mongoose = require("mongoose");

const QuotationRequestItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    salesOnlyProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOnlyProduct",
      default: null,
    },
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

    endCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EndCustomer",
      default: null,
    },

    items: { type: [QuotationRequestItemSchema], required: true },
    notes: { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "quoted"],
      default: "pending",
      index: true,
    },

    // ── Shared autosave draft - visible to ANY admin (not per-browser).
    // Filled in as the pricing form is edited, cleared once actually sent.
    // Never triggers an email on its own - purely a saved-in-progress state. ──
    adminDraft: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

QuotationRequestSchema.index({ salesRepUid: 1, createdAt: -1 });

module.exports = mongoose.model("QuotationRequest", QuotationRequestSchema);