const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const SalesOnlyProduct = require("../models/SalesOnlyProduct");

const verifyToken = require("../middleware/verifyToken"); // admin middleware
const verifySalesToken = require("../middleware/verifySalesToken");


const getProductModel = () => mongoose.model("Product");

router.post("/admin/sales-only-products", verifyToken, async (req, res) => {
  try {
    const modelName = (req.body.modelName || "").trim();
    const description = (req.body.description || "").trim();

    if (!modelName) {
      return res.status(400).json({ message: "Model name is required" });
    }

    const existingSalesOnly = await SalesOnlyProduct.findOne({
      modelName: { $regex: `^${modelName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      isActive: true,
    });
    if (existingSalesOnly) {
      return res.status(409).json({
        message: "A Sales-Only Product with this model name already exists.",
      });
    }

    const existingWebsiteProduct = await getProductModel().findOne({
      $or: [
        { model: { $regex: `^${modelName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
        { name: { $regex: `^${modelName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
      ],
    });
    if (existingWebsiteProduct) {
      return res.status(409).json({
        message:
          "This model already exists as a website product and is already available to Sales through the normal product selector.",
      });
    }

    const salesOnlyProduct = await SalesOnlyProduct.create({
      modelName,
      description,
      createdByUid: req.user.uid,
      createdByName: req.user.name || req.user.email,
      createdByEmail: req.user.email,
    });

    res.status(201).json(salesOnlyProduct);
  } catch (err) {
    console.error("Create sales-only product error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


router.get("/admin/sales-only-products", verifyToken, async (req, res) => {
  try {
    const products = await SalesOnlyProduct.find({ isActive: true }).sort({
      createdAt: -1,
    });
    res.json(products);
  } catch (err) {
    console.error("List sales-only products error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


router.delete("/admin/sales-only-products/:id", verifyToken, async (req, res) => {
  try {
    const product = await SalesOnlyProduct.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Sales-Only Product not found" });
    }

    product.isActive = false;
    await product.save();

    res.json({ message: "Sales-Only Product deactivated successfully" });
  } catch (err) {
    console.error("Delete sales-only product error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/sales-only-products", verifySalesToken, async (req, res) => {
  try {
    const products = await SalesOnlyProduct.find(
      { isActive: true },
      { modelName: 1, description: 1 }
    ).sort({ modelName: 1 });
    res.json(products);
  } catch (err) {
    console.error("Sales list sales-only products error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;