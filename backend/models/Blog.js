const mongoose = require("mongoose");

const BlogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String, required: true },
    author: { type: String, default: "Pinakii Chatterje" },
    date: { type: String },
    readTime: { type: String, default: "3 min read" },
    image: { type: String, required: true },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    published: { type: Boolean, default: true, index: true },
    blocks: [
      {
        type: { type: String, enum: ["text", "image"], required: true },
        content: { type: String },
        url: { type: String },
        caption: { type: String },
      },
    ],
    comments: [
      {
        name: { type: String, required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Blog", BlogSchema);
