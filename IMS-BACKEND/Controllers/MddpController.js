const Branch = require("../Schemas/Branch");
const logger = require("../Utilities/logging");
const { default: mongoose } = require("mongoose");
const Mddp = require("../Schemas/Mddp");
const Vehicle = require("../Schemas/Vehicle");
const CustomerOrders = require("../Schemas/CustomerOrders");


const getAllMddps = async (req, res) => {
    try {

        // Fetch all branches with only 'name' and '_id'
        const branches = await Branch.find()
            .select("name") // only name and _id
            .sort({ createdAt: -1 }) // descending order by creation date
            .lean();

        const mddps = await Mddp.find()
            .sort({ createdAt: -1 })
            .populate({
                path: "vehicleId",
                select: "_id model brand branch variants",
                populate: {
                    path: "branch",
                    select: "_id name",
                },
            })
            .lean();

        // Map to include variant details
        const result = mddps.map((mddp) => {
            // Make a shallow copy of vehicleId to avoid mutating original
            const vehicle = mddp.vehicleId ? { ...mddp.vehicleId } : null;

            // Find the variant inside vehicle
            const variant = vehicle?.variants?.find(
                (v) => v._id.toString() === mddp.variantId.toString()
            );

            // Remove variants from vehicle
            if (vehicle) {
                delete vehicle.variants;
            }

            return {
                ...mddp,
                vehicleId: vehicle, // vehicle without variants
                variant,            // extracted variant
            };
        });



        res.status(200).json({ result, branches });
    } catch (error) {
        console.error("Error fetching MDDP records:", error);
        res.status(500).json({ message: "Error fetching MDDP records" });
    }
};





const getAllVehiclesFromMddp = async (req, res) => {
    try {
        const { id } = req.params; // branch ID from URL
        const branchId = new mongoose.Types.ObjectId(id);

        const vehicles = await Vehicle.find({ branch: branchId })
            .select("_id brand model variants")
            .sort({ createdAt: -1 });

        res.status(200).json({ vehicles });
    } catch (error) {
        console.error("Error fetching vehicles by branch:", error);
        res.status(500).json({ message: "Server error", error });
    }
};





const addMddp = async (req, res) => {
    const userObj = req?.user;

    try {

        let { branchId, vehicleId, variantId, color, stock, expectedDate, status, payment } = req.body;

        // Trim inputs
        branchId = branchId?.trim();
        vehicleId = vehicleId?.trim();
        variantId = variantId?.trim();
        color = color?.trim().toLowerCase();

        // Basic validation
        const showErrors = {};
        if (!branchId) showErrors.branchId = "Branch ID required";
        if (!vehicleId) showErrors.vehicleId = "Vehicle ID required";
        if (!variantId) showErrors.variantId = "Variant ID required";
        if (!color) showErrors.color = "Color required";
        if (!stock || isNaN(stock)) showErrors.stock = "Valid stock required";

        if (Object.keys(showErrors).length) {
            return res.status(400).json({ showErrors });
        }

        // If status = Completed → Update vehicle stock
        if (status === "Completed") {
            const vehicle = await Vehicle.findById(vehicleId);
            if (!vehicle) throw new Error("Vehicle not found");

            const variant = vehicle.variants.id(variantId);
            if (!variant) throw new Error("Variant not found");

            const colorObj = variant.colors.find((c) => c.color === color);
            if (!colorObj) throw new Error(`Color '${color}' not found in variant`);

            colorObj.stock = Number(colorObj.stock || 0) + Number(stock);
            vehicle.updatedBy = userObj?.username || "system";
            await vehicle.save();

            logger.info(`Stock updated for ${vehicle.brand}-${vehicle.model}, Variant: ${variant.name}, Color: ${color}`, {
                updatedBy: vehicle.updatedBy,
                newStock: colorObj.stock
            });
        }

        // Save MDDP entry
        const newMddp = new Mddp({
            branchId,
            vehicleId,
            variantId,
            color,
            stock: Number(stock),
            expectedDate,
            status,
            payment,
            createdBy: userObj?.username || "system",
            updatedBy: userObj?.username || "system"
        });

        await newMddp.save();

        const mddps = await Mddp.find()
            .sort({ createdAt: -1 })
            .populate({
                path: "vehicleId",
                select: "_id model brand branch variants",
                populate: {
                    path: "branch",
                    select: "_id name",
                },
            })
            .lean();


        // Map to include variant details
        const result = mddps.map((mddp) => {
            // Make a shallow copy of vehicleId to avoid mutating original
            const vehicle = mddp.vehicleId ? { ...mddp.vehicleId } : null;

            // Find the variant inside vehicle
            const variant = vehicle?.variants?.find(
                (v) => v._id.toString() === mddp.variantId.toString()
            );

            // Remove variants from vehicle
            if (vehicle) {
                delete vehicle.variants;
            }

            return {
                ...mddp,
                vehicleId: vehicle, // vehicle without variants
                variant,            // extracted variant
            };
        });


        logger.info(`MDDP created successfully by ${userObj?.username}`, { vehicleId, variantId, color });

        res.status(201).json({ message: "MDDP added successfully", result });

    } catch (error) {

        logger.error(`Error in addMddp by ${req?.user?.username}: ${error.stack}`);
        res.status(500).json({ message: "Failed to add MDDP", error: error.message });
    }
};




//update the mddp
const updateMddp = async (req, res) => {
    const { id } = req.params;
    const { color, stock, expectedDate, status, payment } = req.body;
    const userObj = req?.user; // assuming you have middleware to populate req.user

    try {
        logger.info(`Update MDDP request by ${userObj?.username || "unknown user"} for mddpId=${id}`);

        // 1 Validate required fields
        if (!color || stock === undefined || !status || !expectedDate || !payment) {
            logger.warn(`Validation failed for MDDP update by ${userObj?.username || "unknown user"}`);
            return res.status(400).json({ message: "All fields are required." });
        }

        // 2 Fetch existing MDDP
        const existingMddp = await Mddp.findById(new mongoose.Types.ObjectId(id));
        console.log(existingMddp);
        if (!existingMddp) {
            logger.warn(`MDDP not found for ID=${id} by ${userObj?.username || "unknown user"}`);
            return res.status(404).json({ message: "MDDP not found." });
        }


        // 3. Check if already completed
        if (existingMddp.status === "Completed" || existingMddp.status === "Rejected") {
            logger.warn(`Attempt to edit completed MDDP ID=${id} by ${userObj?.username || "unknown user"}`);
            return res.status(400).json({ message: "Cannot edit a Completed | Rejected MDDP." });
        }


        if (status == "Completed" && payment != "Completed") {
            logger.warn(`Update Failed Because Payment Not Completed but Status is Completed`);
            return res.status(400).json({ message: "Cannot Make Mddp Completed Until Payment Pending." });
        }


        //4. If MDDP is completed and payment completed, update vehicle stock
        if (status === "Completed" && payment === "Completed") {
            const vehicle = await Vehicle.findById(existingMddp.vehicleId);
            if (!vehicle) {
                logger.warn(`Vehicle not found for MDDP ID=${id}`);
                return res.status(404).json({ message: "Vehicle not found." });
            }

            // Normalize color for consistent matching
            const colorNormalized = color.trim().toLowerCase();

            // Find the correct variant inside the vehicle
            const variant = vehicle.variants.id(existingMddp.variantId);
            if (!variant) {
                logger.warn(`Variant not found for MDDP ID=${id}`);
                return res.status(404).json({ message: "Variant not found." });
            }

            // Find color object inside the variant
            const colorObj = variant.colors.find(
                (c) => c.color.trim().toLowerCase() === colorNormalized
            );

            if (!colorObj) {
                logger.warn(`Color '${color}' not found in variant for MDDP ID=${id}`);
                return res.status(404).json({ message: `Color '${color}' not found.` });
            }

            // Real-world consistent logic:
            // Add MDDP stock + blockedCount to vehicle stock + blockedCount
            colorObj.stock += Number(existingMddp.stock);
            colorObj.blockedCount += Number(existingMddp.blockedCount);

            // Reset MDDP stock and blockedCount to 0
            const transferStock = Number(existingMddp.stock);
            const transferBlocked = Number(existingMddp.blockedCount);

            // then reset
            existingMddp.stock = 0;
            existingMddp.blockedCount = 0;

            await existingMddp.save();
            await vehicle.save();

            logger.info(
                `Vehicle stock and blockedCount updated for color '${color}'. 
        New stock=${colorObj.stock}, blockedCount=${colorObj.blockedCount}`
            );

            // Update related customer orders for visibility
            const updatedOrders = await CustomerOrders.updateMany(
                { "mddpStock.id": id },
                {
                    $set: {
                        "vehicleStock.available": true,
                        "mddpStock.available": true,
                        "mddpStock.stock": 0,
                    },
                    $inc: {
                        "vehicleStock.stock": transferStock,
                        "vehicleStock.blockedCount": transferBlocked
                    },
                }
            );

            logger.info(
                `Transferred stock + blockedCount from MDDP → Vehicle for ${updatedOrders.modifiedCount} orders (MDDP ID=${id}).`
            );

        }

        // 5. If MDDP is Rejected → update related Orders
        if (status === "Rejected") {
            if (existingMddp.blockedCount > 0) {
                logger.info(`MDDP ID=${id} marked as Rejected. Updating related orders availability...`);
                // const updatedOrders = await CustomerOrders.updateMany(
                //     { "mddpStock.id": String(id) },
                //     { $set: { "mddpStock.available": false } }  // correct nested path
                // );
                const updatedOrders = await CustomerOrders.updateMany(
                    { $expr: { $eq: [{ $toString: "$mddpStock.id" }, id] } },
                    { $set: { "mddpStock.available": false } }
                );


                logger.info(
                    `Updated ${updatedOrders.modifiedCount || updatedOrders.nModified || 0} orders' mddpStock.available=false for rejected MDDP ID=${id}`
                );

            }

            // 5 Update fields
            existingMddp.color = color;
            existingMddp.stock = stock;
            existingMddp.expectedDate = new Date(expectedDate);
            existingMddp.status = status;

            await existingMddp.save();
        }


        // 6. If MDDP is Approved or Requested → update related Orders
        if (existingMddp.status === "Approved" || "Requested") {
            // 5 Update fields
            existingMddp.color = color;
            existingMddp.stock = stock;
            existingMddp.expectedDate = new Date(expectedDate);
            existingMddp.status = status;

            await existingMddp.save();
        }



        const mddps = await Mddp.find()
            .sort({ createdAt: -1 })
            .populate({
                path: "vehicleId",
                select: "_id model brand branch variants",
                populate: {
                    path: "branch",
                    select: "_id name",
                },
            })
            .lean();


        // Map to include variant details
        const result = mddps.map((mddp) => {
            // Make a shallow copy of vehicleId to avoid mutating original
            const vehicle = mddp.vehicleId ? { ...mddp.vehicleId } : null;

            // Find the variant inside vehicle
            const variant = vehicle?.variants?.find(
                (v) => v._id.toString() === mddp.variantId.toString()
            );

            // Remove variants from vehicle
            if (vehicle) {
                delete vehicle.variants;
            }

            return {
                ...mddp,
                vehicleId: vehicle, // vehicle without variants
                variant,            // extracted variant
            };
        });



        logger.info(`MDDP ID=${id} updated successfully by ${userObj?.username || "unknown user"}`);
        res.status(200).json({ message: "MDDP updated successfully!", result });

    } catch (error) {
        logger.error(`Error updating MDDP ID=${id}:`, error);
        res.status(500).json({ message: "Server error. Please try again." });
    }
};




const deleteMddp = async (req, res) => {
    const { id } = req.params;

    try {
        // Check if MDDP exists
        const mddpItem = await Mddp.findById(new mongoose.Types.ObjectId(id));
        if (!mddpItem) {
            logger.warn("MDDP not found for deletion with id " + id);
            return res.status(404).json({ message: "MDDP not found" });
        }


        if (mddpItem.blockedCount > 0 && (mddpItem.status != "Completed" && mddpItem.status != "Rejected")) {
            logger.info(`MDDP ID=${id} marked as Deleting. Updating related orders availability...`);
            // const updatedOrders = await CustomerOrders.updateMany(
            //     { "mddpStock.id": String(id) },
            //     { $set: { "mddpStock.available": false } }  // correct nested path
            // );
            const updatedOrders = await CustomerOrders.updateMany(
                { $expr: { $eq: [{ $toString: "$mddpStock.id" }, id] } },
                { $set: { "mddpStock.available": false } }
            );


            logger.info(
                `Updated ${updatedOrders.modifiedCount || updatedOrders.nModified || 0} orders' mddpStock.available=false for rejected MDDP ID=${id}`
            );

        }

        // Delete the MDDP
        await Mddp.findByIdAndDelete(id);

        const mddps = await Mddp.find()
            .sort({ createdAt: -1 })
            .populate({
                path: "vehicleId",
                select: "_id model brand branch variants",
                populate: {
                    path: "branch",
                    select: "_id name",
                },
            })
            .lean();


        // Map to include variant details
        const result = mddps.map((mddp) => {
            // Make a shallow copy of vehicleId to avoid mutating original
            const vehicle = mddp.vehicleId ? { ...mddp.vehicleId } : null;

            // Find the variant inside vehicle
            const variant = vehicle?.variants?.find(
                (v) => v._id.toString() === mddp.variantId.toString()
            );

            // Remove variants from vehicle
            if (vehicle) {
                delete vehicle.variants;
            }

            return {
                ...mddp,
                vehicleId: vehicle, // vehicle without variants
                variant,            // extracted variant
            };
        });


        logger.info("MDDP deleted successfully with id " + id);
        return res.status(200).json({
            message: "MDDP deleted successfully",
            result
        });
    } catch (error) {
        logger.error("Failed to delete MDDP with id " + id + ". Error: " + error);
        return res.status(500).json({ message: "Failed to delete MDDP", error: error.message });
    }
};




module.exports = {
    getAllMddps,
    getAllVehiclesFromMddp,
    addMddp,
    updateMddp,
    deleteMddp
}




// async function unblockStock({ vehicleId, variantId, color, fromVehicle, fromMddp }) {
//     const colorNormalized = normalize(color);

//     if (fromVehicle > 0) {
//         const vvc = await findVehicleVariantColor(vehicleId, variantId, colorNormalized);
//         if (vvc.vehicle) {
//             vvc.colorObj.blockedCount = Math.max(0, vvc.colorObj.blockedCount - fromVehicle);
//             await vvc.vehicle.save();
//         }
//     }

//     if (fromMddp > 0) {
//         const mddpDoc = await Mddp.findOne({
//             vehicleId,
//             variantId,
//             color: colorNormalized,
//             status: { $nin: ["Completed", "Rejected"] }
//         });
//         if (mddpDoc) {
//             mddpDoc.blockedCount = Math.max(0, mddpDoc.blockedCount - fromMddp);
//             await mddpDoc.save();
//         }
//     }

//     return { ok: true };
// }

// if (newStatus === "Rejected" || newStatus === "Canceled") {
//     await unblockStock({
//         vehicleId: order.vehicleId,
//         variantId: order.variantId,
//         color: order.color,
//         fromVehicle: order.allocation?.fromVehicle || 0,
//         fromMddp: order.allocation?.fromMddp || 0
//     });
// }
