const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    type: { type: String, required: true, enum: ["active", "passive"] },
    name: { type: String, required: true, index: true },
    subCategories: [
      {
        name: { type: String, required: true },
        extraCategories: { type: [String], default: [] },
        hiddenExtraCategories: { type: [String], default: [] },
        isHidden: { type: Boolean, default: false },
      },
    ],
    order: { type: Number, default: 0 },
    banner: { type: String, default: null },
    isHidden: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", CategorySchema);
