const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const { uploadBanner } = require("../middleware/uploads");
const Category = require("../models/Category");
const Product = require("../models/Product");
const RelatedProduct = require("../models/RelatedProduct");
const logAction = require("../utils/auditLog");
const { getArrayDiff } = require("../utils/diff");
const { uploadToFirebase, deleteFromFirebase } = require("../utils/storageAliases");

router.get("/categories", async (req, res) => {
  try {
    const { type } = req.query;
    const query = type ? { type } : {};
    const categories = await Category.find(query).sort({ order: 1, createdAt: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/categories", verifyToken, async (req, res) => {
  try {
    const { type, name, subCategories, order } = req.body;
    if (!type || !name)
      return res.status(400).json({ message: "type and name are required" });

    const existing = await Category.findOne({ type, name });
    if (existing)
      return res.status(400).json({ message: "Category already exists" });

    const maxOrderDoc = await Category.findOne({ type }).sort({ order: -1 });
    const newOrder = maxOrderDoc ? maxOrderDoc.order + 1 : 0;

    const category = await Category.create({
      type,
      name,
      subCategories: subCategories || [],
      order: order !== undefined ? order : newOrder,
    });

    logAction(req.user.email, "CREATE", "Category", category.name, {
      changes: { type: { new: type }, name: { new: name } },
    });

    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/categories/reorder", verifyToken, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items))
      return res.status(400).json({ message: "items array required" });

    await Promise.all(
      items.map(({ id, order }) =>
        Category.findByIdAndUpdate(id, { $set: { order } })
      )
    );

    logAction(req.user.email, "UPDATE", "Category", "Reorder", {
      changes: { reordered: { new: `${items.length} categories reordered` } },
    });

    res.json({ message: "Reordered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/categories/:id/rename", verifyToken, async (req, res) => {
  try {
    const { newName } = req.body;
    if (!newName || !newName.trim())
      return res.status(400).json({ message: "newName is required" });

    const category = await Category.findById(req.params.id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    const oldName = category.name;
    const trimmedNew = newName.trim();
    if (oldName === trimmedNew) return res.json(category);

    category.name = trimmedNew;
    await category.save();

    await Product.updateMany(
      { category: oldName },
      { $set: { category: trimmedNew } }
    );
    await RelatedProduct.updateMany(
      { category: oldName },
      { $set: { category: trimmedNew } }
    );

    logAction(req.user.email, "UPDATE", "Category", trimmedNew, {
      changes: { name: { old: oldName, new: trimmedNew } },
    });

    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/categories/:id/subcategory/:subName/rename",
  verifyToken,
  async (req, res) => {
    try {
      const { newName } = req.body;
      if (!newName || !newName.trim())
        return res.status(400).json({ message: "newName is required" });

      const category = await Category.findById(req.params.id);
      if (!category)
        return res.status(404).json({ message: "Category not found" });

      const oldSubName = decodeURIComponent(req.params.subName);
      const trimmedNew = newName.trim();
      const sub = category.subCategories.find((s) => s.name === oldSubName);
      if (!sub)
        return res.status(404).json({ message: "SubCategory not found" });
      if (oldSubName === trimmedNew) return res.json(category);

      sub.name = trimmedNew;
      await category.save();

      await Product.updateMany(
        { category: category.name, subCategory: oldSubName },
        { $set: { subCategory: trimmedNew } }
      );
      await RelatedProduct.updateMany(
        { category: category.name, subCategory: oldSubName },
        { $set: { subCategory: trimmedNew } }
      );

      logAction(
        req.user.email,
        "UPDATE",
        "Category",
        `${category.name} > ${trimmedNew}`,
        { changes: { subCategory: { old: oldSubName, new: trimmedNew } } }
      );

      res.json(category);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.put("/categories/:id/subcategory/:subName/extra/rename",
  verifyToken,
  async (req, res) => {
    try {
      const { oldExtra, newExtra } = req.body;
      if (!oldExtra || !newExtra || !newExtra.trim())
        return res
          .status(400)
          .json({ message: "oldExtra and newExtra are required" });

      const category = await Category.findById(req.params.id);
      if (!category)
        return res.status(404).json({ message: "Category not found" });

      const subName = decodeURIComponent(req.params.subName);
      const sub = category.subCategories.find((s) => s.name === subName);
      if (!sub)
        return res.status(404).json({ message: "SubCategory not found" });

      const trimmedNew = newExtra.trim();
      const idx = sub.extraCategories.indexOf(oldExtra);
      if (idx === -1)
        return res.status(404).json({ message: "Extra category not found" });
      if (oldExtra === trimmedNew) return res.json(category);

      sub.extraCategories[idx] = trimmedNew;
      await category.save();

      await Product.updateMany(
        {
          category: category.name,
          subCategory: subName,
          extraCategory: oldExtra,
        },
        { $set: { extraCategory: trimmedNew } }
      );
      await RelatedProduct.updateMany(
        {
          category: category.name,
          subCategory: subName,
          extraCategory: oldExtra,
        },
        { $set: { extraCategory: trimmedNew } }
      );

      logAction(
        req.user.email,
        "UPDATE",
        "Category",
        `${category.name} > ${subName}`,
        { changes: { extraCategory: { old: oldExtra, new: trimmedNew } } }
      );

      res.json(category);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.put("/categories/:id", verifyToken, async (req, res) => {
  try {
    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated)
      return res.status(404).json({ message: "Category not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CATEGORY BANNER UPLOAD ──────────────────────────────────────
router.put("/categories/:id/banner", verifyToken, uploadBanner.single("bannerImage"), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    // Old banner Firebase se delete karo
    if (category.banner) {
      await deleteFromFirebase(category.banner);
    }

    let bannerUrl = null;
    if (req.file) {
      bannerUrl = await uploadToFirebase(req.file, "category-banners");
    }

    category.banner = bannerUrl;
    await category.save();

    logAction(req.user.email, "UPDATE", "Category", category.name, {
      changes: { banner: { new: bannerUrl ? "uploaded" : "removed" } },
    });

    res.json({ message: "Banner updated", banner: bannerUrl, category });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const deleteProductsCascade = async (query) => {
  const products = await Product.find(query);
  for (const product of products) {
    await deleteFromFirebase(product.image);
    await deleteFromFirebase(product.datasheet);
    await deleteFromFirebase(product.assemblyDiagram); 
    pdfCache.delete(product.slug); // clear PDF cache
    await Product.findByIdAndDelete(product._id);
    console.log("Cascade deleted product:", product.name);
  }
  await RelatedProduct.deleteMany(query);
};

router.delete("/categories/:id", verifyToken, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    await deleteProductsCascade({ category: category.name });
    if (category.banner) await deleteFromFirebase(category.banner);
    await Category.findByIdAndDelete(req.params.id);

    logAction(req.user.email, "DELETE", "Category", category.name, {
      changes: { deleted: { old: category.name, new: "DELETED" } },
    });

    res.json({ message: "Category and all its products deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/categories/:id/subcategory", verifyToken, async (req, res) => {
  try {
    const { name, extraCategories } = req.body;
    if (!name)
      return res.status(400).json({ message: "SubCategory name required" });

    const category = await Category.findById(req.params.id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    const exists = category.subCategories.find((s) => s.name === name);
    if (exists)
      return res.status(400).json({ message: "SubCategory already exists" });

    category.subCategories.push({ name, extraCategories: extraCategories || [] });
    await category.save();

    logAction(
      req.user.email,
      "CREATE",
      "Category",
      `${category.name} > ${name}`,
      {
        changes: {
          subCategory: { new: name },
          extraCategories: {
            new: (extraCategories || []).join(", ") || "none",
          },
        },
      }
    );

    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/categories/:id/subcategory/reorder",
  verifyToken,
  async (req, res) => {
    try {
      const category = await Category.findById(req.params.id);
      if (!category)
        return res.status(404).json({ message: "Category not found" });

      const { orderedNames } = req.body;
      if (!Array.isArray(orderedNames))
        return res.status(400).json({ message: "orderedNames array required" });

      const reordered = orderedNames
        .map((name) => category.subCategories.find((s) => s.name === name))
        .filter(Boolean);
      const missing = category.subCategories.filter(
        (s) => !orderedNames.includes(s.name)
      );
      category.subCategories = [...reordered, ...missing];
      await category.save();

      logAction(req.user.email, "UPDATE", "Category", category.name, {
        changes: { subCategoryReorder: { new: orderedNames.join(" → ") } },
      });

      res.json(category);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.put("/categories/:id/subcategory/:subName",
  verifyToken,
  async (req, res) => {
    try {
      const category = await Category.findById(req.params.id);
      if (!category)
        return res.status(404).json({ message: "Category not found" });

      const sub = category.subCategories.find(
        (s) => s.name === req.params.subName
      );
      if (!sub)
        return res.status(404).json({ message: "SubCategory not found" });

      const changes = {};
      if (req.body.name && req.body.name !== sub.name) {
        changes.name = { old: sub.name, new: req.body.name };
        sub.name = req.body.name;
      }
      if (req.body.extraCategories !== undefined) {
        const diff = getArrayDiff(sub.extraCategories, req.body.extraCategories);
        if (diff.added.length || diff.removed.length) {
          changes.extraCategories = {
            old: sub.extraCategories.join(", ") || "none",
            new: req.body.extraCategories.join(", ") || "none",
            added: diff.added,
            removed: diff.removed,
          };
        }
        sub.extraCategories = req.body.extraCategories;
      }

      await category.save();

      if (Object.keys(changes).length > 0) {
        logAction(
          req.user.email,
          "UPDATE",
          "Category",
          `${category.name} > ${req.params.subName}`,
          { changes }
        );
      }

      res.json(category);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.delete("/categories/:id/subcategory/:subName",
  verifyToken,
  async (req, res) => {
    try {
      const category = await Category.findById(req.params.id);
      if (!category)
        return res.status(404).json({ message: "Category not found" });

      const subName = decodeURIComponent(req.params.subName);
      await deleteProductsCascade({ category: category.name, subCategory: subName });

      category.subCategories = category.subCategories.filter(
        (s) => s.name !== subName
      );
      await category.save();

      logAction(
        req.user.email,
        "DELETE",
        "Category",
        `${category.name} > ${subName}`,
        {
          changes: {
            deleted: {
              old: `${category.name} > ${subName}`,
              new: "DELETED",
            },
          },
        }
      );

      res.json(category);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
