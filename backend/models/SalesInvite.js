// const mongoose = require("mongoose");

// const SalesInviteSchema = new mongoose.Schema(
//   {
//     email: { type: String, required: true, lowercase: true, trim: true },
//     token: { type: String, required: true, unique: true, index: true },
//     used: { type: Boolean, default: false },
//     expiresAt: { type: Date, required: true },
//     invitedBy: { type: String, required: true },
//   },
//   { timestamps: true }
// );

// SalesInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// module.exports = mongoose.model("SalesInvite", SalesInviteSchema);