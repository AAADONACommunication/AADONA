const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verifyToken = require("../middleware/verifyToken");
const Blog = require("../models/Blog");
const BlogSchedule = require("../models/BlogSchedule");
const NewsletterHistory = require("../models/NewsletterHistory");
const logAction = require("../utils/auditLog");

/* ============================
   BLOG AUTOMATION ROUTE
============================= */

const { spawn } = require("child_process");
const path = require("path");

// ── BLOG GENERATION ROUTE ──
router.post("/admin/generate-blogs", verifyToken, (req, res) => {
  req.setTimeout(10 * 60 * 1000);
  res.setTimeout(10 * 60 * 1000);
  const { topic } = req.body;
  const scriptPath = path.join(__dirname, "../python-automation/main.py");
  const py = spawn("python3", [scriptPath]);

  if (topic && topic.trim()) {
    py.stdin.write(topic + "\n");
  } else {
    py.stdin.write("\n");
  }
  py.stdin.end();

  let stdoutOutput = "";
  let errorOutput  = "";

  py.stdout.on("data", (data) => {
    stdoutOutput += data.toString();
    console.log("PYTHON:", data.toString());
  });

  py.stderr.on("data", (err) => {
    errorOutput += err.toString();
    console.log("PYTHON ERROR:", err.toString());
  });

  py.on("error", (err) => {
    console.log("SPAWN ERROR:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to start Python process. Check server setup." 
    });
  });

  py.on("close", (code) => {
    if (code === 0) {
      res.json({ success: true, message: "Blog generated successfully" });
    } else {
      const lastError = errorOutput
        .split("\n")
        .filter(l => l.includes("ERROR") || l.includes("failed") || l.includes("Failed"))
        .pop() || "Blog generation failed. Try again later.";

      res.status(500).json({ 
        success: false, 
        message: lastError.replace(/.*ERROR\s+/, "").trim() || "Blog generation failed. Try again later."
      });
    }
  });
});

const cron = require("node-cron");

// ── ACTIVE CRON JOB (singleton) ──────────────────────────────────
let activeCronJob = null;

function startCronJob(schedule) {

  if (activeCronJob) {
    activeCronJob.stop();
    activeCronJob = null;
    console.log("Previous cron job stopped.");
  }

  if (!schedule || !schedule.enabled) return;

  // IST = UTC+5:30
  const totalMinutesIST = schedule.hour * 60 + schedule.minute;
  const totalMinutesUTC = (totalMinutesIST - 330 + 1440) % 1440;
  const utcHour   = Math.floor(totalMinutesUTC / 60);
  const utcMinute = totalMinutesUTC % 60;

  const cronExpr = `${utcMinute} ${utcHour} * * ${schedule.dayOfWeek}`;
  console.log(`Cron scheduled: ${cronExpr} (UTC) for IST ${schedule.hour}:${String(schedule.minute).padStart(2,"0")}`);

  activeCronJob = cron.schedule(cronExpr, async () => {
    console.log("=== AUTO BLOG CRON TRIGGERED ===");
    const { spawn } = require("child_process");
    const path = require("path");
    const scriptPath = path.join(__dirname, "../python-automation/main.py");

    const py = spawn("python3", [scriptPath, "--auto", String(schedule.blogCount)]);
    py.stdout.on("data", d => console.log("CRON PYTHON:", d.toString()));
    py.stderr.on("data", d => console.log("CRON PYTHON ERR:", d.toString()));
    py.on("close", () => console.log("Cron blog generation complete."));
  });
}

mongoose.connection.once("open", async () => {
  try {
    const saved = await BlogSchedule.findOne();
    if (saved) {
      startCronJob(saved);
      console.log("Blog cron loaded from DB.");

      // ── MISSED RUN CHECK ──────────────────────────
      if (saved.enabled) {
        const now = new Date();
        const nowIST = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));

        const lastHistory = await NewsletterHistory.findOne().sort({ createdAt: -1 });
        // Blog history se check karo - last blog kab bana
        const lastBlog = await Blog.findOne().sort({ createdAt: -1 });
        const lastRun = lastBlog ? new Date(lastBlog.createdAt) : null;
        
        const scheduledDay = saved.dayOfWeek;
        const todayDay = nowIST.getDay();
        const scheduledHour = saved.hour;
        const scheduledMinute = saved.minute;
        const currentHour = nowIST.getHours();
        const currentMinute = nowIST.getMinutes();

        const scheduledTimePassedToday =
          todayDay === scheduledDay &&
          (currentHour > scheduledHour ||
            (currentHour === scheduledHour && currentMinute > scheduledMinute));

        const last24Hours = lastRun
          ? (now - lastRun) < 24 * 60 * 60 * 1000
          : false;

        if (scheduledTimePassedToday && !last24Hours) {
          console.log("Missed run detected - running now...");
          const { spawn } = require("child_process");
          const path = require("path");
          const scriptPath = path.join(__dirname, "../python-automation/main.py");
          const py = spawn("python3", [scriptPath, "--auto", String(saved.blogCount)]);
          py.stdout.on("data", d => console.log("MISSED RUN PYTHON:", d.toString()));
          py.stderr.on("data", d => console.log("MISSED RUN ERR:", d.toString()));
          py.on("close", () => console.log("Missed run complete."));
        }
      }
      // ─────────────────────────────────────────────
    }
  } catch (e) {
    console.log("Cron load error:", e.message);
  }
});

// ── GET SCHEDULE (Admin) ─────────────────────────────────────────
router.get("/admin/blog-schedule", verifyToken, async (req, res) => {
  try {
    const schedule = await BlogSchedule.findOne();
    res.json(schedule || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SAVE / UPDATE SCHEDULE (Admin) ───────────────────────────────
router.post("/admin/blog-schedule", verifyToken, async (req, res) => {
  try {
    const { dayOfWeek, hour, minute, blogCount, enabled } = req.body;

    const schedule = await BlogSchedule.findOneAndUpdate(
      {},
      { dayOfWeek, hour, minute, blogCount: blogCount || 3, enabled },
      { upsert: true, new: true }
    );

    startCronJob(schedule);

    logAction(req.user.email, "UPDATE", "BlogSchedule", "Auto Blog Cron", {
      changes: { schedule: { new: `Day ${dayOfWeek}, ${hour}:${minute} IST` } }
    });

    res.json({ message: "Schedule saved", schedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
