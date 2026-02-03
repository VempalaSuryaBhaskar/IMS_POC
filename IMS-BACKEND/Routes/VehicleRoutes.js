const express = require("express");
const { checkPermission } = require("../Auth/Authentication");
const { getAllBranchesAndVehicles, addVehicle, updateVehicle, deleteVariant } = require("../Controllers/VehicleController");
const router = express.Router();


//To get All Branches names and vehicles 
router.get("/",checkPermission("vehicleManagement", "View"),getAllBranchesAndVehicles);


//Add A vehicle 
router.post("/",checkPermission("vehicleManagement", "Create"),addVehicle);

//Update A Vehicle and variant
router.put("/" ,checkPermission("vehicleManagement", "Update") , updateVehicle);

//Delete A Variant 
router.delete("/:vehicleId/:variantId",checkPermission("vehicleManagement", "Update"), deleteVariant);

module.exports = router;
