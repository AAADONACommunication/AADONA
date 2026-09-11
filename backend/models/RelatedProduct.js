const mongoose = require("mongoose");

const RelatedProductSchema = new mongoose.Schema(
  {
    type: { type: String, default: null },
    category: { type: String, required: true, index: true },
    subCategory: { type: String, default: null, index: true },
    extraCategory: { type: String, default: null },
    relatedProducts: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RelatedProduct", RelatedProductSchema);
