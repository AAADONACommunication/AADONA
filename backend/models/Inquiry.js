const mongoose = require("mongoose");

const InquirySchema = new mongoose.Schema(
  {
    formType: { type: String, required: true },
    customerName: { type: String, default: "Unknown" },
    customerEmail: { type: String, default: "" },
    formData: { type: mongoose.Schema.Types.Mixed },
    status: {
      type: String,
      enum: ["new", "read", "replied"],
      default: "new",
      index: true,
    },
    replies: [
      {
        message: { type: String, required: true },
        sentBy: { type: String },
        sentAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Auto-delete inquiries after 1 year
InquirySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

module.exports = mongoose.model("Inquiry", InquirySchema);
