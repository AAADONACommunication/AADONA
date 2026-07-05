const mongoose = require("mongoose");

const SalesRepSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String, default: "" },
    region: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: String, required: true }, // admin email
  },
  { timestamps: true }
);

module.exports = mongoose.model("SalesRep", SalesRepSchema);