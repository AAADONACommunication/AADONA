const admin = require("../firebaseAdmin");

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);

    console.log("ADMIN CLAIM:", decodedToken.admin);

    if (decodedToken.admin !== true) {
      return res.status(403).json({ message: "Not authorized as admin" });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    console.log(error);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

module.exports = verifyToken;