const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema(
  {
    salesRepUid: { type: String, required: true, index: true }, // Firebase UID of sales rep
    companyName: { type: String, default: "" },
    personalName: { type: String, required: true },
    contactNumber: { type: String, required: true },
    email: { type: String, required: true },
    city: { type: String, default: "" },
    pinCode: { type: String, default: "" },
    address: { type: String, default: "" },
  },
  { timestamps: true }
);

// Compound index — sales rep ke customers fast fetch hoon
CustomerSchema.index({ salesRepUid: 1, createdAt: -1 });

module.exports = mongoose.model("Customer", CustomerSchema);