const express = require("express");
const { checkPermission } = require("../Auth/Authentication");
const { getAllMddps, getAllVehiclesFromMddp ,addMddp, updateMddp, deleteMddp } = require("../Controllers/MddpController");
const router = express.Router();


//To get All Branches names and mddps 
router.get("/",checkPermission("mddpManagement", "View"),getAllMddps);

//to get vehicles by branch from mddp
router.get("/getVehicles/:id",checkPermission("mddpManagement", "View"),getAllVehiclesFromMddp);

//add new mddp
router.post("/",checkPermission("mddpManagement", "Create"),addMddp);

//update a mddp
router.put("/:id",checkPermission("mddpManagement", "Update"),updateMddp);

//delete a mddp
router.delete("/:id",checkPermission("mddpManagement", "Delete"),deleteMddp)

module.exports = router;
