const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const Product = require("../models/Product");
const RelatedProduct = require("../models/RelatedProduct");
const logAction = require("../utils/auditLog");
const { getArrayDiff } = require("../utils/diff");

router.post("/save-related-products", verifyToken, async (req, res) => {
  try {
    const { type, category, subCategory, extraCategory, relatedProducts } =
      req.body;

    if (!category)
      return res
      .status(400)
      .json({ message: "category is required" });

    if (!relatedProducts || relatedProducts.length === 0)
      return res
        .status(400)
        .json({ message: "Select at least one related product" });

    const filter = {
      category,
      subCategory: subCategory || null,
      extraCategory: extraCategory || null,
      type: type || null,
    };

    const existing = await RelatedProduct.findOne(filter);
    const oldRelated = existing ? existing.relatedProducts : [];

    const result = await RelatedProduct.findOneAndUpdate(
      filter,
      {
        $set: {
          type: type || null,
          category,
          subCategory: subCategory || null,
          extraCategory: extraCategory || null,
        },
        $addToSet: { relatedProducts: { $each: relatedProducts } },
      },
      { upsert: true, new: true }
    );

    const diff = getArrayDiff(
      oldRelated.map(String),
      relatedProducts.map(String)
    );
    logAction(
      req.user.email,
      "UPDATE",
      "Product",
      `Related: ${category} > ${subCategory}`,
      {
        changes: {
          relatedProducts: {
            old: `${oldRelated.length} products`,
            new: `${relatedProducts.length} products`,
            added: `${diff.added.length} added`,
            removed: `${diff.removed.length} removed`,
          },
        },
      }
    );

    res.json({ message: "Related products saved successfully", result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/related-products", async (req, res) => {
  try {
    const { category, subCategory, extraCategory, type } = req.query;
    const query = { category };
    if (subCategory && subCategory !== "null") query.subCategory = subCategory;
    else query.subCategory = null;

    const related = await RelatedProduct.findOne(query);
    if (!related) return res.json({ relatedProducts: [] });

    const products = await Product.find({
      _id: { $in: related.relatedProducts },
    });
    res.json({ relatedProducts: products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/related-products/raw", verifyToken, async (req, res) => {
  try {
    const { category, subCategory, extraCategory, type } = req.query;
    if (!category)
      return res
      .status(400)
      .json({ message: "category is required" });

    const query = {
      category,
      subCategory: subCategory || null,
      extraCategory: extraCategory || null,
      type: type || null,
    };
    const related = await RelatedProduct.findOne(query);
    res.json({ relatedProducts: related ? related.relatedProducts : [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/related-products/remove", verifyToken, async (req, res) => {
  try {
    const { category, subCategory, extraCategory, type, productId } = req.body;
    if (!category || !productId)
    return res
      .status(400)
      .json({ message: "category and productId are required" });

    const filter = {
      category,
      subCategory: subCategory || null,
      extraCategory: extraCategory || null,
      type: type || null,
    };
    const related = await RelatedProduct.findOne(filter);
    if (!related)
      return res
        .status(404)
        .json({ message: "Related products entry not found" });

    const before = related.relatedProducts.length;
    related.relatedProducts = related.relatedProducts.filter(
      (id) => id.toString() !== productId.toString()
    );
    await related.save();

    logAction(
      req.user.email,
      "UPDATE",
      "Product",
      `Related: ${category} > ${subCategory}`,
      {
        changes: {
          relatedProducts: {
            old: `${before} products`,
            new: `${related.relatedProducts.length} products`,
            removed: `Product ID: ${productId}`,
          },
        },
      }
    );

    res.json({
      message: "Product removed from related list",
      relatedProducts: related.relatedProducts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
