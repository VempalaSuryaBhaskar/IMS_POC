const express = require("express");
const { authCheck, login } = require("../Controllers/AuthController");
const router = express.Router();

// Verify token route
router.get("/",authCheck);

// Login route
router.post("/login",login);

module.exports = router;
