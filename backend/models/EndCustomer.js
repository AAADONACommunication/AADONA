const mongoose = require("mongoose");

const EndCustomerSchema = new mongoose.Schema(
  {
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    endCustomerName: { type: String, required: true, trim: true },
    organizationName: { type: String, default: "" },
    customerAddress: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    contactPerson: { type: String, default: "" },
    designation: { type: String, default: "" },
    mobileNumber: { type: String, default: "" },
    emailId: { type: String, default: "" },
    industryVertical: { type: String, default: "" },

    createdBy: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

EndCustomerSchema.index({ partner: 1, endCustomerName: 1 });
EndCustomerSchema.index({ partner: 1, createdAt: -1 });

module.exports = mongoose.model("EndCustomer", EndCustomerSchema);