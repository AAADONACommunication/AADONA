const express = require("express");
const router = express.Router();
const admin = require("../firebaseAdmin");
const verifyToken = require("../middleware/verifyToken");
const { adminLimiter } = require("../middleware/rateLimiters");
const logAction = require("../utils/auditLog");

router.post("/create-admin", verifyToken, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const user = await admin.auth().createUser({ email, password });
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });

    logAction(req.user.email, "CREATE", "Admin", email, {
      changes: { email: { new: email } },
    });

    res.json({ message: "New Admin Created" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/get-admins", verifyToken, adminLimiter, async (req, res) => {
  try {
    const listResult = await admin.auth().listUsers(100);
    const admins = listResult.users
      .filter((user) => user.customClaims?.admin === true)
      .map((user) => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || null,
        lastSignIn: user.metadata.lastSignInTime || null,
        createdAt: user.metadata.creationTime || null,
      }));

    res.json({ admins });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch admins" });
  }
});

router.delete("/delete-admin/:uid", verifyToken, async (req, res) => {
  try {
    const { uid } = req.params;
    if (uid === req.user.uid)
      return res
        .status(400)
        .json({ message: "You cannot remove your own admin access." });

    const userRecord = await admin.auth().getUser(uid);
    if (!userRecord.customClaims?.admin)
      return res.status(400).json({ message: "This user is not an admin." });

    await admin.auth().deleteUser(uid);

    logAction(req.user.email, "DELETE", "Admin", userRecord.email, {
      changes: { email: { old: userRecord.email, new: "DELETED" } },
    });

    res.json({ message: "Admin removed successfully" });
  } catch (err) {
    if (err.code === "auth/user-not-found")
      return res.status(404).json({ message: "User not found in Firebase." });
    res.status(500).json({ message: "Failed to remove admin" });
  }
});

module.exports = router;
