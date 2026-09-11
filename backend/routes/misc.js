const express = require("express");
const router = express.Router();
const path = require("path");
const transporter = require("../mailer");
const Blog = require("../models/Blog");

router.get("/", (req, res) => {
  res.send("API Running");
});

router.get("/test-mail", async (req, res) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "Test Mail",
      text: "Working",
    });

    res.send("MAIL SENT");
  } catch (err) {
    console.log("MAIL ERROR:", err);
    res.status(500).send(err.message);
  }
});

router.get("/share/blog/:slug", async (req, res) => {
  try {
    const blog = await Blog.findOne({
      slug: req.params.slug,
      published: true,
    });

    if (!blog) return res.status(404).send("Blog not found");

    const baseUrl = "https://aadona.com";

    let image = blog.image && blog.image.startsWith("http")
      ? blog.image
      : `${baseUrl}/default.jpg`;

    if (image.endsWith(".avif")) {
      image = `${baseUrl}/default.jpg`;
    }

    const escapeHtml = (str = "") =>
      str.replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");

    const title = escapeHtml(blog.title || "AADONA Blog");
    const excerpt = escapeHtml(
      (blog.excerpt || "Read this article on AADONA").substring(0, 200)
    );

    // BOTH og:url and redirect stay on /share/ URL
    const shareUrl = `${baseUrl}/share/blog/${blog.slug}`;

    // React app route - only used for the visible link in body
    const blogUrl = `${baseUrl}/blog/${blog.slug}`;

    let imageType = "image/jpeg";
    if (image.includes(".png")) imageType = "image/png";
    else if (image.includes(".webp")) imageType = "image/webp";

    // Cache for 1 hour so WhatsApp re-crawl works fast
    res.setHeader("Cache-Control", "public, max-age=3600");

    res.send(`<!DOCTYPE html>
    <html lang="en" prefix="og: https://ogp.me/ns#">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      <title>${title}</title>
      <meta name="description" content="${excerpt}" />
      <link rel="canonical" href="${shareUrl}" />

      <!-- OPEN GRAPH -->
      <meta property="og:type" content="article" />
      <meta property="og:site_name" content="AADONA Communication" />
      <meta property="og:title" content="${title}" />
      <meta property="og:description" content="${excerpt}" />
      <meta property="og:url" content="${shareUrl}" />
      <meta property="og:image" content="${image}" />
      <meta property="og:image:secure_url" content="${image}" />
      <meta property="og:image:type" content="${imageType}" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="${title}" />

      <!-- TWITTER -->
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${title}" />
      <meta name="twitter:description" content="${excerpt}" />
      <meta name="twitter:image" content="${image}" />

      <!-- SCHEMA.ORG -->
      <meta itemprop="name" content="${title}" />
      <meta itemprop="description" content="${excerpt}" />
      <meta itemprop="image" content="${image}" />

      <!-- ARTICLE -->
      ${blog.author ? `<meta property="article:author" content="${escapeHtml(blog.author)}" />` : ""}
      ${blog.date ? `<meta property="article:published_time" content="${blog.date}" />` : ""}

      <!-- JS REDIRECT (faster than meta refresh, bots ignore JS) -->
      <script>window.location.replace("${blogUrl}");</script>

    </head>
    <body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
      <div style="text-align:center">
        <p>Opening article...</p>
        <a href="${blogUrl}">Click here if not redirected</a>
      </div>
    </body>
    </html>`);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
