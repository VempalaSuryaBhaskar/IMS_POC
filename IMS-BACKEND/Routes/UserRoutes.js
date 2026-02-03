const express = require("express");
const router = express.Router();
const { checkPermission } = require("../Auth/Authentication");
const { getAllUsers, createNewUser, updateUser, deleteUser, advanceCheck } = require("../Controllers/UserController");


// Get all users (excluding logged-in user) — only if user has "View" permission in manageUsers
router.get("/", checkPermission("manageUsers", "View"), getAllUsers);

// Create a new user
router.post("/", checkPermission("manageUsers", "Create"), createNewUser);

// UPDATE USER - only role and permissions
router.put("/:id", checkPermission("manageUsers", "Update"), updateUser);

// DELETE USER
router.delete("/:id", checkPermission("manageUsers", "Delete"),deleteUser);

// ADVANCE CHECK FOR DUPLICATES
router.post("/advanceCheck",advanceCheck);

module.exports = router;

