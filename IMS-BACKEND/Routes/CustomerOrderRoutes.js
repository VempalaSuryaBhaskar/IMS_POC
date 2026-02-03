const express = require("express");
const { checkPermission } = require("../Auth/Authentication");
const { getAllCustomerOrders, getAllVehiclesFromOrders, addOrder, updateOrder, deleteOrder } = require("../Controllers/CustomerOrderController");
const router = express.Router();


//To get All Branches names and Orders 
router.get("/", checkPermission("customerOrders", "View"), getAllCustomerOrders);

// to get vehicles by branch from Orders
router.get("/getVehicles/:id", checkPermission("customerOrders", "View"), getAllVehiclesFromOrders);

//add new mddp
router.post("/", checkPermission("customerOrders", "Create"), addOrder);

// //update a mddp
router.put("/:id",checkPermission("customerOrders", "Update"),updateOrder);

// //delete a mddp
router.delete("/:id",checkPermission("customerOrders", "Delete"),deleteOrder);

module.exports = router;
