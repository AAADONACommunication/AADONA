const mongoose = require("mongoose");

const SalesOnlyProductSchema = new mongoose.Schema(
  {
    modelName: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: "", trim: true },

    isActive: { type: Boolean, default: true, index: true },

    createdByUid: { type: String, required: true },
    createdByName: { type: String, required: true },
    createdByEmail: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SalesOnlyProduct", SalesOnlyProductSchema);