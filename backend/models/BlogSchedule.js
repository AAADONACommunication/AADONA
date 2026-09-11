const mongoose = require("mongoose");

const BlogScheduleSchema = new mongoose.Schema({
  dayOfWeek: { type: Number, required: true }, // 0=Sun, 1=Mon ... 6=Sat
  hour: { type: Number, required: true },       // 0-23 (IST)
  minute: { type: Number, required: true },     // 0-59
  blogCount: { type: Number, default: 3 },
  enabled: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("BlogSchedule", BlogScheduleSchema);
