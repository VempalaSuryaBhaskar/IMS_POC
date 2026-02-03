const express = require("express");
const router = express.Router();
const { checkPermission } = require("../Auth/Authentication");
const {getAllBranches, addBranch, updateBranch, deleteBranch, advanceCheckForNewBranch, advanceCheckForUpdateBranch} = require("../Controllers/BranchController");


// Get all branches — only if user has "View" permission in manageBranches
router.get("/", checkPermission("manageBranches", "View"), getAllBranches);

// Create a new Branch
router.post("/", checkPermission("manageBranches", "Create"),addBranch);

// UPDATE Branch - only name and contact
router.put("/:id", checkPermission("manageBranches", "Update"), updateBranch);

// DELETE USER  MARKED FOR TO UPDATE LATER FOR VEHICLES AND ALL :
router.delete("/:id", checkPermission("manageBranches", "Delete"), deleteBranch);

// ADVANCE CHECK FOR DUPLICATES  FOR CREATING NEW BRANCH 
router.post("/advanceCheck", advanceCheckForNewBranch);


// ADVANCE CHECK FOR DUPLICATES  FOR UPDATING THE BRANCH 
router.post("/advanceCheck/:id", advanceCheckForUpdateBranch);


module.exports = router;

