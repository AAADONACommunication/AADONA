const admin = require("../firebaseAdmin");

const verifySalesToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);

    if (decodedToken.salesRep !== true) {
      return res.status(403).json({ message: "Not authorized as sales representative" });
    }

    req.salesRep = decodedToken;
    next();
  } catch (error) {
    console.log("Sales token error:", error.message);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

module.exports = verifySalesToken;