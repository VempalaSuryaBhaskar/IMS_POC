const jwt = require("jsonwebtoken");
const logging = require("../Utilities/logging");
const User = require("../Schemas/User");
const mongoose = require("mongoose");


// Create JWT token
const createToken = (user, expiresIn = "7d") => {
  const payload = {
    id: user._id,
    username: user.username,
    role: user.role,
  };

  logging.info("Creating JWT token for user", { username: user.username, role: user.role });
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};



// Verify JWT token and fetch user from DB
const verifyToken = async (token) => {
  try {
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      logging.warn("Token valid but user not found in DB", { userId: decoded.id });
      return null;
    }

    logging.info("Token verified successfully", { username: user.username });
    return user;
  } catch (error) {
    logging.error("Token verification failed", { error: error.message });
    return null;
  }
};



// Auth middleware to protect routes
const authMiddleware = async (req, res, next) => {

  // allow this endpoint without auth
  if (req.path === "/addDefaultAdmin") {
    return next();
  }

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      logging.warn("Authorization token missing in request");
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const user = await verifyToken(token);
    if (!user) {
      logging.warn("Authorization failed: invalid token");
      return res.status(401).json({ message: "Not authorized, token invalid" });
    }

    req.user = user;
    next();
  } catch (error) {
    logging.error("Auth middleware error", { error: error.message });
    res.status(500).json({ message: "Server error" });
  }
};


// Permission check middleware
const checkPermission = (moduleName, action) => {
  return (req, res, next) => {
    const { permissions, role, username } = req.user;

    if (!permissions || !permissions[moduleName]) {
      logging.info("Access denied: no permissions for module", { moduleName, username, role });
      return res.status(403).json({ message: "Access denied" });
    }

    if (!permissions[moduleName].includes(action)) {
      logging.info("Access denied: action not allowed", { moduleName, action, username, role });
      return res.status(403).json({ message: `Permission '${action}' denied for ${moduleName}` });
    }

    logging.info("Permission granted", { moduleName, action, username });
    next();
  };
};

module.exports = { createToken, verifyToken, authMiddleware, checkPermission };
