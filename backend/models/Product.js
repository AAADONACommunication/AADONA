const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    features: { type: [String], default: [] },
    slug: { type: String, required: true, unique: true, index: true },
    image: { type: String, required: true },
    datasheet: { type: String },
    assemblyDiagram: { type: String, default: "" },
    type: { type: String, required: true },
    category: { type: String, required: true, index: true },
    subCategory: { type: String, default: null, index: true },
    extraCategory: { type: String, default: null },
    model: { type: String },
    fullName: { type: String },
    series: { type: String },
    highlights: { type: [String], default: [] },
    overview: {
      title: { type: String, default: "Product Overview" },
      content: { type: String },
    },
    featuresDetail: [
      {
        itemType: { type: String, default: "bullet" },
        iconType: { type: String },
        title: { type: String },
        description: { type: String },
      },
    ],
    specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Compound index for category filtering (very common query)
ProductSchema.index({ category: 1, subCategory: 1, sparse: true });
ProductSchema.index({ category: 1, subCategory: 1, extraCategory: 1, sparse: true });

module.exports = mongoose.model("Product", ProductSchema);
