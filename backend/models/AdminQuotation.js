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
    items: [
      {
        name: { type: String, required: true },
        description: { type: String, default: "" },
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        total: { type: Number, required: true }, // quantity * unitPrice
      },
    ],
    subtotal: { type: Number, required: true },
    remarks: { type: String, default: "" },
    validTill: { type: Date },
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