const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const transporter = require("../mailer");
const Blog = require("../models/Blog");
const logAction = require("../utils/auditLog");
const { getDiff } = require("../utils/diff");
const generateSlug = require("../utils/slug");
const { deleteFromFirebase } = require("../utils/storageAliases");

router.get("/blogs/drafts", verifyToken, async (req, res) => {
  try {
    const drafts = await Blog.find({ published: false })
      .sort({ updatedAt: -1 })
      .select("-comments");
    res.json(drafts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/blogs", async (req, res) => {
  try {
    const blogs = await Blog.find({ published: true })
      .sort({ createdAt: -1 })
      .select("-comments");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/blogs/slug/:slug", async (req, res) => {
  try {
    const blog = await Blog.findOne({
      slug: req.params.slug,
      published: true,
    });
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/blogs/slug/:slug/view", async (req, res) => {
  try {
    const blog = await Blog.findOneAndUpdate(
      { slug: req.params.slug, published: true },
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    res.json({ views: blog.views });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/blogs/slug/:slug/like", async (req, res) => {
  try {
    const blog = await Blog.findOneAndUpdate(
      { slug: req.params.slug, published: true },
      { $inc: { likes: 1 } },
      { new: true }
    );
    if (!blog) return res.status(404).json({ error: "Blog not found" });

    transporter
      .sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.COMPANY_EMAIL,
        subject: `New Like on: "${blog.title}"`,
        html: `<p>Someone liked your blog <b>"${blog.title}"</b>.</p><p>Total likes now: <b>${blog.likes}</b></p>`,
      })
      .catch(() => {});

    res.json({ likes: blog.likes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/blogs/slug/:slug/comment", async (req, res) => {
  try {
    const { name, text } = req.body;
    if (!name || !text)
      return res.status(400).json({ error: "Name and text required" });

    const blog = await Blog.findOneAndUpdate(
      { slug: req.params.slug, published: true },
      { $push: { comments: { name, text, createdAt: new Date() } } },
      { new: true }
    );
    if (!blog) return res.status(404).json({ error: "Blog not found" });

    transporter
      .sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.COMPANY_EMAIL,
        subject: `New Comment on: "${blog.title}"`,
        html: `
        <h3>New comment on <b>"${blog.title}"</b></h3>
        <p><b>From:</b> ${name}</p>
        <p><b>Comment:</b> ${text}</p>
        <p><small>Total comments: ${blog.comments.length}</small></p>
      `,
      })
      .catch(() => {});

    res.json({ comments: blog.comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/blogs/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/blogs", verifyToken, async (req, res) => {
  try {
    let baseSlug = generateSlug(req.body.title);
    let finalSlug = baseSlug;
    let counter = 1;
    while (await Blog.findOne({ slug: finalSlug })) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const blog = await Blog.create({ ...req.body, slug: finalSlug });

    logAction(req.user.email, "CREATE", "Blog", blog.title, {
      changes: {
        title: { new: blog.title },
        author: { new: blog.author },
        published: { new: blog.published },
      },
    });

    res.status(201).json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/blogs/:id", verifyToken, async (req, res) => {
  try {
    const existing = await Blog.findById(req.params.id);
    if (!existing)
      return res.status(404).json({ message: "Blog not found" });

    if (req.body.image && req.body.image !== existing.image) {
      await deleteFromFirebase(existing.image);
    }

    if (req.body.blocks) {
      const newBlockUrls = new Set(
        req.body.blocks
          .filter((b) => b.type === "image" && b.url)
          .map((b) => b.url)
      );
      const oldBlockImages = (existing.blocks || []).filter(
        (b) => b.type === "image" && b.url && !newBlockUrls.has(b.url)
      );
      for (const block of oldBlockImages) {
        await deleteFromFirebase(block.url);
      }
    }

    const changes = getDiff(existing, req.body, [
      "title", "excerpt", "author", "readTime", "published", "date",
    ]);

    if (req.body.image && req.body.image !== existing.image) {
      changes.image = { old: "Previous image", new: "New image uploaded" };
    }
    if (req.body.blocks) {
      const oldCount = (existing.blocks || []).length;
      const newCount = req.body.blocks.length;
      if (oldCount !== newCount)
        changes.blocks = { old: `${oldCount} blocks`, new: `${newCount} blocks` };
    }

    const updated = await Blog.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    logAction(req.user.email, "UPDATE", "Blog", updated.title, { changes });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/blogs/:id", verifyToken, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    await deleteFromFirebase(blog.image);
    const blockImages = (blog.blocks || []).filter(
      (b) => b.type === "image" && b.url
    );
    for (const block of blockImages) {
      await deleteFromFirebase(block.url);
    }

    await Blog.findByIdAndDelete(req.params.id);

    logAction(req.user.email, "DELETE", "Blog", blog.title, {
      changes: {
        title: { old: blog.title, new: "DELETED" },
        author: { old: blog.author, new: "DELETED" },
      },
    });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
