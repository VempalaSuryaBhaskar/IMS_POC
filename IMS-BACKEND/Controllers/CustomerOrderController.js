const Branch = require("../Schemas/Branch");
const logger = require("../Utilities/logging");
const { default: mongoose } = require("mongoose");
const Vehicle = require("../Schemas/Vehicle");
const { acquire } = require("../Utilities/mutex");
const Mddp = require("../Schemas/Mddp");
const CustomerOrders = require("../Schemas/CustomerOrders");


//get All Customers and available Branches
const getAllCustomerOrders = async (req, res) => {
    try {

        // Fetch all branches with only 'name' and '_id'
        const branches = await Branch.find()
            .select("name") // only name and _id
            .sort({ createdAt: -1 }) // descending order by creation date
            .lean();

        const customerOrders = await CustomerOrders.find()
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
        const result = customerOrders.map((order) => {
            // Make a shallow copy of vehicleId to avoid mutating original
            const vehicle = order.vehicleId ? { ...order.vehicleId } : null;

            // Find the variant inside vehicle
            const variant = vehicle?.variants?.find(
                (v) => v._id.toString() === order.variantId.toString()
            );

            // Remove variants from vehicle
            if (vehicle) {
                delete vehicle.variants;
            }

            return {
                ...order,
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



//get all vehicles from orders for selected Branch
const getAllVehiclesFromOrders = async (req, res) => {
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



// ==================== HELPERS ====================

// Normalize color
const normalize = s => (s || "").trim().toLowerCase();

// Validate Payload
function validatePayload(body) {
    const {
        branchId,
        createdBy,
        vehicleId,
        variantId,
        color,
        customerDetails,
        orderDate,
        expectedDate,
        deliveryDate,
        financeType,
        financeStatus,
        orderStatus,
        totalAmount,
        totalCount
    } = body || {};

    let showErrors = {};

    // Basic Required Field Checks
    if (!branchId) showErrors.branchId = "Branch is required";
    if (!createdBy) showErrors.createdBy = "Created By is required";
    if (!vehicleId) showErrors.vehicleId = "Vehicle is required";
    if (!variantId) showErrors.variantId = "Variant is required";
    if (!color) showErrors.color = "Color is required";
    if (!orderDate) showErrors.orderDate = "Order Date is required";
    if (!expectedDate) showErrors.expectedDate = "Expected Date is required";
    if (!financeType) showErrors.financeType = "Finance Type is required";
    if (!financeStatus) showErrors.financeStatus = "Finance Status is required";
    if (!orderStatus) showErrors.orderStatus = "Order Status is required";
    if (!totalAmount) showErrors.totalAmount = "Total Amount is required";
    if (!totalCount) showErrors.totalCount = "Total Count is required";

    // Customer Details Validation
    if (!customerDetails) {
        showErrors.customerDetails = "Customer Details are required";
    } else {
        const { name, phone, email, address, city, state, pincode, aadharNumber, panNumber } = customerDetails;

        if (!name) showErrors.name = "Customer name is required";
        if (!phone) showErrors.phone = "Phone number is required";
        else if (!/^[6-9]\d{9}$/.test(phone)) showErrors.phone = "Invalid phone number";

        if (!email) showErrors.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) showErrors.email = "Invalid email format";

        if (!address) showErrors.address = "Address is required";
        if (!city) showErrors.city = "City is required";
        if (!state) showErrors.state = "State is required";
        if (!pincode) showErrors.pincode = "Pincode is required";
        else if (!/^\d{6}$/.test(pincode)) showErrors.pincode = "Invalid pincode";

        if (!aadharNumber) showErrors.aadharNumber = "Aadhar number is required";
        else if (!/^\d{12}$/.test(aadharNumber)) showErrors.aadharNumber = "Invalid Aadhar number";

        if (!panNumber) showErrors.panNumber = "PAN number is required";
        else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber)) showErrors.panNumber = "Invalid PAN format";
    }

    if (Object.keys(showErrors).length > 0)
        return { ok: false, message: showErrors };

    return { ok: true, message: "Validation Success" };
}



// Find Vehicle, Variant, Color
async function findVehicleVariantColor(vehicleId, variantId, colorNormalized) {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return { error: "Vehicle not found" };

    const variant = vehicle.variants.id(variantId);
    if (!variant) return { error: "Variant not found in vehicle" };

    const colorObj = variant.colors.find(c => normalize(c.color) === colorNormalized);
    if (!colorObj) return { error: "Color not found in variant" };

    return { vehicle, variant, colorObj };
}



// Deduct stock logic (unchanged)
async function deductStock({ vehicleId, variantId, color, orderCount }) {
    const colorNormalized = normalize(color);

    const vvc = await findVehicleVariantColor(vehicleId, variantId, colorNormalized);
    if (vvc.error) return { ok: false, message: vvc.error };
    const { vehicle, variant, colorObj } = vvc;
    const availableStock = (colorObj.stock || 0) - (colorObj.blockedCount || 0);

    if (availableStock >= orderCount) {
        colorObj.stock -= orderCount;
        await vehicle.save();
        return { ok: true, source: "vehicle" };
    }


    return { ok: false, message: "Insufficient stock in vehicle and MDDP" };
}






// ==================== BLOCK STOCK ====================
async function blockStock({ vehicleId, variantId, color, orderCount, expectedDate }) {
    const colorNormalized = normalize(color.trim().toLowerCase());

    // Step 1️ — Find Vehicle, Variant, and Color
    const { vehicle, variant, colorObj, error } = await findVehicleVariantColor(
        vehicleId,
        variantId,
        colorNormalized
    );
    if (error) return { ok: false, message: error };

    // Calculate available in vehicle
    const availableInVehicle = (colorObj.stock || 0) - (colorObj.blockedCount || 0);
    console.log("Available in Vehicle:", availableInVehicle);

    // Step 2️ — Find MDDP (backup stock)
    const mddpDoc = await Mddp.findOne({
        vehicleId: new mongoose.Types.ObjectId(vehicleId),
        variantId: new mongoose.Types.ObjectId(variantId),
        color: colorNormalized,
        status: { $nin: ["Completed", "Rejected"] },
    });


    console.log(mddpDoc);
    const availableInMddp = mddpDoc
        ? (mddpDoc.stock || 0) - (mddpDoc.blockedCount || 0)
        : 0;
    console.log("Available in MDDP:", availableInMddp);

    // Step 3️ — Case 1: Vehicle has full stock
    if (orderCount <= availableInVehicle) {
        colorObj.blockedCount = (colorObj.blockedCount || 0) + orderCount;
        await vehicle.save();

        return {
            ok: true,
            source: "vehicle",
            allocation: {
                vehicleStock: {
                    id: variantId,
                    stock: orderCount,
                    available: true,
                },
                mddpStock: {
                    id: null,
                    stock: 0,
                    available: false,
                },
            },
            doc: vehicle,
        };
    }

    // Step 4️ — Case 2: Partial from Vehicle + MDDP
    if (availableInVehicle > 0 && availableInVehicle < orderCount) {
        const remaining = orderCount - availableInVehicle;

        if (availableInVehicle + availableInMddp >= orderCount) {
            // Block from vehicle and MDDP partially
            colorObj.blockedCount = (colorObj.blockedCount || 0) + availableInVehicle;
            if (mddpDoc) {
                //check point for expectedDate
                console.log("mddp Expected Date on partial allocation : ", mddpDoc?.expectedDate, expectedDate);
                if (new Date(mddpDoc.expectedDate) > new Date(expectedDate)) {
                    return {
                        ok: false,
                        message: `Expected Date must be greater than MDDP arrival date (${new Date(mddpDoc.expectedDate).toLocaleDateString()}).`
                    };
                }
                mddpDoc.blockedCount = (mddpDoc.blockedCount || 0) + remaining;
                await mddpDoc.save();
            }
            await vehicle.save();

            return {
                ok: true,
                source: "mixed",
                allocation: {
                    vehicleStock: {
                        id: variantId,
                        stock: availableInVehicle,
                        available: true,
                    },
                    mddpStock: {
                        id: mddpDoc?._id || null,
                        stock: remaining,
                        available: !!mddpDoc,
                    },
                },
                doc: { vehicle, mddpDoc },
            };
        }
    }

    // Step 5️ — Case 3: Vehicle 0, MDDP enough
    if (availableInVehicle === 0 && orderCount <= availableInMddp) {
        if (!mddpDoc) {
            return { ok: false, message: "No MDDP record found for this color/variant" };
        }

        console.log("mddp Expected Date in vehicle 0 mddp enough : ", mddpDoc?.expectedDate, expectedDate);
        if (new Date(mddpDoc.expectedDate) > new Date(expectedDate)) {
            return {
                ok: false,
                message: `Expected Date Must be Greater than Arrival Of Mddp (${new Date(mddpDoc.expectedDate).toLocaleDateString()})!`
            };
        }
        mddpDoc.blockedCount = (mddpDoc.blockedCount || 0) + orderCount;
        await mddpDoc.save();

        return {
            ok: true,
            source: "mddp",
            allocation: {
                vehicleStock: {
                    id: variantId,
                    stock: 0,
                    available: false,
                },
                mddpStock: {
                    id: mddpDoc._id,
                    stock: orderCount,
                    available: true,
                },
            },
            doc: mddpDoc,
        };
    }

    // Step 6️ — Insufficient in both
    return {
        ok: false,
        message: "Insufficient stock in Vehicle and MDDP",
    };
}





// ==================== ADD ORDER ====================
const addOrder = async (req, res) => {
    const userObj = req?.user;
    try {
        const payload = req.body;
        console.log("payload : ", payload);

        // 1️ Validation
        const v = validatePayload(payload);
        if (!v.ok) return res.status(400).json({ message: v.message });

        const {
            branchId,
            createdBy,
            vehicleId,
            variantId,
            color,
            customerDetails,
            orderDate,
            expectedDate,
            deliveryDate,
            financeType,
            financeStatus,
            orderStatus,
            totalAmount,
            totalCount
        } = payload;

        const orderCount = Number(totalCount);
        const lockKey = `${vehicleId}|${variantId}|${branchId}${normalize(color)}`;
        const unlock = await acquire(lockKey);

        try {
            const isDeliveredAndPaid =
                orderStatus == "Delivered" && financeStatus == "Completed";

            // Case 1: Direct Deduction (Delivered + Paid)
            if (isDeliveredAndPaid) {
                console.log("deducted stock");
                const resultData = await deductStock({ vehicleId, variantId, color, orderCount });
                if (!resultData.ok)
                    return res.status(400).json({ message: resultData.message });

                // Create order with empty allocation (since already deducted)
                const order = new ss({
                    ...payload,
                    vehicleStock: {
                        id: variantId,
                        stock: orderCount,
                        available: true,
                    },
                    mddpStock: {
                        id: null,
                        stock: 0,
                        available: false,
                    },
                });

                await order.save();

                // All Data fetch and send :
                const customerOrders = await ss.find()
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
                const result = customerOrders.map((order) => {
                    // Make a shallow copy of vehicleId to avoid mutating original
                    const vehicle = order.vehicleId ? { ...order.vehicleId } : null;

                    // Find the variant inside vehicle
                    const variant = vehicle?.variants?.find(
                        (v) => v._id.toString() === order.variantId.toString()
                    );

                    // Remove variants from vehicle
                    if (vehicle) {
                        delete vehicle.variants;
                    }

                    return {
                        ...order,
                        vehicleId: vehicle, // vehicle without variants
                        variant,            // extracted variant
                    };
                });



                return res.status(201).json({
                    message: `Order created and stock blocked in ${result.source}`,
                    result,
                });
            }
            console.log("blocked stock");
            //  Case 2: Block Stock (Pending or Finance not done)
            const resultData = await blockStock({ vehicleId, variantId, color, orderCount, expectedDate });
            console.log(resultData);
            if (!resultData.ok)
                return res.status(400).json({ message: resultData.message });

            // Create order and save allocation details
            const order = new CustomerOrders({
                ...payload,
                vehicleStock: resultData.allocation.vehicleStock,
                mddpStock: resultData.allocation.mddpStock,
            });

            await order.save();



            const customerOrders = await CustomerOrders.find()
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
            const result = customerOrders.map((order) => {
                // Make a shallow copy of vehicleId to avoid mutating original
                const vehicle = order.vehicleId ? { ...order.vehicleId } : null;

                // Find the variant inside vehicle
                const variant = vehicle?.variants?.find(
                    (v) => v._id.toString() === order.variantId.toString()
                );

                // Remove variants from vehicle
                if (vehicle) {
                    delete vehicle.variants;
                }

                return {
                    ...order,
                    vehicleId: vehicle, // vehicle without variants
                    variant,            // extracted variant
                };
            });



            return res.status(201).json({
                message: `Order created and stock blocked in ${result.source}`,
                result,
            });

        } finally {
            try {
                unlock();
            } catch (e) { }
        }
    } catch (err) {
        console.error("Error in add-order:", err);
        return res
            .status(500)
            .json({ message: err.message || "Internal Server Error" });
    }
};




// ============= Update Order ===============
const updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { orderStatus, expectedDate, totalCount, financeStatus } = req.body;
        const userObj = req.user;

        const existingOrder = await CustomerOrders.findById(id);
        if (!existingOrder)
            return res.status(404).json({ ok: false, message: "Order not found" });

        // 1️ Protected states
        if (["Completed", "Rejected"].includes(existingOrder.orderStatus)) {
            return res.status(400).json({
                ok: false,
                message: `Cannot update a ${existingOrder.orderStatus} order.`,
            });
        }

        // 2️ Expected date validation
        if (expectedDate) {
            const prevExpectedDate = new Date(existingOrder.expectedDate);
            const newExpectedDate = new Date(expectedDate);
            if (newExpectedDate.getTime() < prevExpectedDate.getTime()) {
                return res.status(400).json({
                    ok: false,
                    message: "Expected date is same as previous — no update needed.",
                });
            }
            existingOrder.expectedDate = expectedDate;
        }

        // 3️ Load vehicle and color
        const vehicle = await Vehicle.findById(new mongoose.Types.ObjectId(existingOrder.vehicleId));
        let colorObj = null;
        if (vehicle) {
            const variant = vehicle.variants?.find(
                (v) => v._id.toString() === existingOrder.variantId?.toString()
            );

            colorObj = variant?.colors?.find(
                (c) =>
                    c.color?.toLowerCase() === existingOrder.color?.toLowerCase()
            );
        } else {
            logger.warn(`No vehicle found for vehicleId : ${existingOrder.vehicleId}`);
        }

        // 4️ Determine allocations
        const hasVehicle =
            existingOrder.vehicleStock?.stock > 0 &&
            existingOrder.vehicleStock?.available === true;
        const hasMddp =
            existingOrder.mddpStock?.stock > 0 &&
            existingOrder.mddpStock?.available === true;

        const prevTotal = existingOrder.totalCount;
        const diff = totalCount - prevTotal;

        // 5 === INCREASE: allocate diff (main first then MDDP) - FIXED ===
        if (diff > 0) {
            let remaining = diff;

            // Try to allocate from vehicle/main if order is allowed to use main
            if (existingOrder.vehicleStock?.available && colorObj) {
                const freeMain = Math.max(0, (colorObj.stock || 0) - (colorObj.blockedCount || 0));
                const takeMain = Math.min(freeMain, remaining);
                if (takeMain > 0) {
                    colorObj.blockedCount = (colorObj.blockedCount || 0) + takeMain;
                    existingOrder.vehicleStock.stock = (existingOrder.vehicleStock.stock || 0) + takeMain;
                    existingOrder.vehicleStock.id = existingOrder.vehicleStock.id || String(existingOrder.variantId || "");
                    existingOrder.vehicleStock.available = (existingOrder.vehicleStock.stock || 0) > 0;
                    remaining -= takeMain;
                }
            }

            // If still remaining -> try MDDP (use order's mddp if present, else find an available MDDP)
            if (remaining > 0) {
                // Prefer the MDDP already referenced by the order (if any)
                let candidateMddp = null;
                if (existingOrder.mddpStock?.id) {
                    candidateMddp = await Mddp.findById(existingOrder.mddpStock.id);
                }
                // If no MDDP on order or that doc has no free capacity, find any with free capacity
                if (!candidateMddp || ((candidateMddp.stock || 0) - (candidateMddp.blockedCount || 0)) <= 0) {
                    // find MDDP with free capacity (adjust filter to your business rules)
                    candidateMddp = await Mddp.findOne({
                        $expr: { $gt: [{ $ifNull: ["$stock", 0] }, { $ifNull: ["$blockedCount", 0] }] }
                    });
                }

                if (!candidateMddp) {
                    return res.status(400).json({ ok: false, message: "Insufficient MDDP stock to allocate remaining units" });
                }

                // compute free capacity on candidate
                const freeMddp = Math.max(0, (candidateMddp.stock || 0) - (candidateMddp.blockedCount || 0));
                const takeMddp = Math.min(freeMddp, remaining);
                if (takeMddp <= 0) {
                    return res.status(400).json({ ok: false, message: "Insufficient MDDP stock to allocate remaining units" });
                }

                // allocate
                candidateMddp.blockedCount = (candidateMddp.blockedCount || 0) + takeMddp;
                await candidateMddp.save();

                // attach to order (if order didn't have mddp id, set it)
                existingOrder.mddpStock = existingOrder.mddpStock || { id: String(candidateMddp._id), stock: 0, available: false };
                existingOrder.mddpStock.id = existingOrder.mddpStock.id || String(candidateMddp._id);
                existingOrder.mddpStock.stock = (existingOrder.mddpStock.stock || 0) + takeMddp;
                existingOrder.mddpStock.available = (existingOrder.mddpStock.stock || 0) > 0;
                remaining -= takeMddp;
            }

            if (remaining > 0) {
                return res.status(400).json({ ok: false, message: "Insufficient stock to increase order" });
            }
        }


        // 6️ === DECREASE CASE ===
        if (diff < 0) {
            let toRelease = Math.abs(diff);

            // Release from MDDP first
            if (hasMddp && existingOrder.mddpStock?.stock > 0) {
                const mddpToRelease = Math.min(existingOrder.mddpStock.stock, toRelease);
                const mddp = await Mddp.findById(existingOrder.mddpStock.id);
                if (mddp) {
                    mddp.blockedCount = Math.max(
                        0,
                        (mddp.blockedCount || 0) - mddpToRelease
                    );
                    await mddp.save();
                }
                existingOrder.mddpStock.stock = Math.max(
                    0,
                    existingOrder.mddpStock.stock - mddpToRelease
                );
                existingOrder.mddpStock.available =
                    existingOrder.mddpStock.stock > 0;
                toRelease -= mddpToRelease;
            }

            // Release remaining from Vehicle
            if (toRelease > 0 && hasVehicle && colorObj) {
                const mainToRelease = Math.min(
                    existingOrder.vehicleStock.stock,
                    toRelease
                );
                colorObj.blockedCount = Math.max(
                    0,
                    (colorObj.blockedCount || 0) - mainToRelease
                );
                existingOrder.vehicleStock.stock = Math.max(
                    0,
                    existingOrder.vehicleStock.stock - mainToRelease
                );
                existingOrder.vehicleStock.available =
                    existingOrder.vehicleStock.stock > 0;
                toRelease -= mainToRelease;
            }

            if (toRelease > 0) {
                return res.status(400).json({
                    ok: false,
                    message: "Trying to release more stock than allocated!",
                });
            }
        }


        // 7️ Handle Rejected Status
        if (orderStatus == "Rejected") {
            // CASE 1: Both Vehicle and MDDP allocations exist
            if (hasVehicle && hasMddp) {
                if (colorObj) {
                    colorObj.blockedCount = Math.max(0, (colorObj.blockedCount || 0) - existingOrder.vehicleStock.stock);
                }
                const mddp = await Mddp.findById(existingOrder.mddpStock.id);
                if (mddp) {
                    mddp.blockedCount = Math.max(0, (mddp.blockedCount || 0) - existingOrder.mddpStock.stock);
                    await mddp.save();
                }
                existingOrder.vehicleStock.stock = 0;
                existingOrder.mddpStock.stock = 0;
                existingOrder.vehicleStock.available = false;
                existingOrder.mddpStock.available = false;
            }
            // CASE 2: Only Vehicle allocation
            else if (hasVehicle && !hasMddp) {
                if (colorObj) {
                    colorObj.blockedCount = Math.max(0, (colorObj.blockedCount || 0) - existingOrder.vehicleStock.stock);
                }
                existingOrder.vehicleStock.stock = 0;
                existingOrder.vehicleStock.available = false;
            }
            // CASE 3: Only MDDP allocation
            else if (!hasVehicle && hasMddp) {
                const mddp = await Mddp.findById(existingOrder.mddpStock.id);
                if (mddp) {
                    mddp.blockedCount = Math.max(0, (mddp.blockedCount || 0) - existingOrder.mddpStock.stock);
                    await mddp.save();
                }
                existingOrder.mddpStock.stock = 0;
                existingOrder.mddpStock.available = false;
            }
            // CASE 4: No DB references available
            else {
                existingOrder.vehicleStock.available = false;
                existingOrder.mddpStock.available = false;
            }

            existingOrder.orderStatus = "Rejected";
        }



        // 8️ Handle Delivered Status
        if (orderStatus === "Delivered") {
            // CASE 1: Both Vehicle and MDDP allocations exist
            if (hasVehicle && hasMddp) {
                if (colorObj) {
                    // Reduce from main stock permanently
                    colorObj.stock = Math.max(0, (colorObj.stock || 0) - existingOrder.vehicleStock.stock);
                    colorObj.blockedCount = Math.max(0, (colorObj.blockedCount || 0) - existingOrder.vehicleStock.stock);
                    await vehicle.save(); //  Save vehicle changes
                }

                const mddp = await Mddp.findById(existingOrder.mddpStock.id);

                if (mddp?.status != "Completed") {
                    return res.status(400).json({ message: "You Need To Wait Until Mddp Stock Completed Or Arrived " });
                }

                if (mddp) {
                    mddp.stock = Math.max(0, (mddp.stock || 0) - existingOrder.mddpStock.stock);
                    mddp.blockedCount = Math.max(0, (mddp.blockedCount || 0) - existingOrder.mddpStock.stock);
                    await mddp.save();
                }

                existingOrder.vehicleStock.stock = 0;
                existingOrder.mddpStock.stock = 0;
                existingOrder.vehicleStock.available = false;
                existingOrder.mddpStock.available = false;
            }

            // CASE 2: Only Vehicle allocation
            else if (hasVehicle && !hasMddp) {
                if (colorObj) {
                    colorObj.stock = Math.max(0, (colorObj.stock || 0) - existingOrder.vehicleStock.stock);
                    colorObj.blockedCount = Math.max(0, (colorObj.blockedCount || 0) - existingOrder.vehicleStock.stock);
                    await vehicle.save(); //  Save vehicle changes
                }
                existingOrder.vehicleStock.stock = 0;
                existingOrder.vehicleStock.available = false;
            }

            // CASE 3: Only MDDP allocation
            else if (!hasVehicle && hasMddp) {
                const mddp = await Mddp.findById(existingOrder.mddpStock.id);

                if (mddp?.status != "Completed") {
                    return res.status(400).json({ message: "You Need To Wait Until Mddp Stock Completed Or Arrived " });
                }

                if (mddp) {
                    mddp.stock = Math.max(0, (mddp.stock || 0) - existingOrder.mddpStock.stock);
                    mddp.blockedCount = Math.max(0, (mddp.blockedCount || 0) - existingOrder.mddpStock.stock);
                    await mddp.save();
                }
                existingOrder.mddpStock.stock = 0;
                existingOrder.mddpStock.available = false;
            }

            // CASE 4: No valid allocations
            else {
                existingOrder.vehicleStock.available = false;
                existingOrder.mddpStock.available = false;
            }

            existingOrder.orderStatus = "Delivered";
        }




        // 8️ Apply other updates
        if (financeStatus) existingOrder.financeStatus = financeStatus;
        existingOrder.totalCount = totalCount;

        await vehicle.save();
        await existingOrder.save();



        //giving all data as fresh
        const customerOrders = await CustomerOrders.find()
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
        const result = customerOrders.map((order) => {
            // Make a shallow copy of vehicleId to avoid mutating original
            const vehicle = order.vehicleId ? { ...order.vehicleId } : null;

            // Find the variant inside vehicle
            const variant = vehicle?.variants?.find(
                (v) => v._id.toString() === order.variantId.toString()
            );

            // Remove variants from vehicle
            if (vehicle) {
                delete vehicle.variants;
            }

            return {
                ...order,
                vehicleId: vehicle, // vehicle without variants
                variant,            // extracted variant
            };
        });



        res.status(200).json({ result, message: "Order Updated Successfully!" });

    } catch (error) {
        console.error("Error in updateOrder:", error);
        return res.status(500).json({ ok: false, message: error.message });
    }
};






// ==================== DELETE ORDER ====================
const deleteOrder = async (req, res) => {
    const { id } = req.params;
    const userObj = req?.user;

    try {
        const existingOrder = await CustomerOrders.findById(new mongoose.Types.ObjectId(id));
        if (!existingOrder)
            return res.status(404).json({ message: "Order not found." });

        const { orderStatus, vehicleId, variantId, color, vehicleStock, mddpStock } = existingOrder;
        const colorNormalized = (color || "").trim().toLowerCase();

        // If order is Delivered or Rejected → delete directly (no unblocking/rollback)
        if (["Delivered", "Rejected"].includes(orderStatus)) {
            await CustomerOrders.findByIdAndDelete(id);
            logger.info(`Order ${id} deleted directly (status=${orderStatus}) by ${userObj?.username || "unknown user"}`);
        } else {
            // Load vehicle + variant + color
            const { vehicle, variant, colorObj } = await findVehicleVariantColor(vehicleId, variantId, colorNormalized);
            const hasVehicle = vehicleStock?.stock > 0 && vehicleStock?.available === true;
            const hasMddp = mddpStock?.stock > 0 && mddpStock?.available === true;

            // CASE 1️: Both Vehicle and MDDP allocations exist
            if (hasVehicle && hasMddp) {
                if (colorObj) {
                    colorObj.blockedCount = Math.max(0, (colorObj.blockedCount || 0) - vehicleStock.stock);
                    await vehicle.save();
                }

                const mddp = await Mddp.findById(mddpStock.id);
                if (mddp) {
                    mddp.blockedCount = Math.max(0, (mddp.blockedCount || 0) - mddpStock.stock);
                    await mddp.save();
                }
            }

            // CASE 2️: Only Vehicle allocation
            else if (hasVehicle && !hasMddp) {
                if (colorObj) {
                    colorObj.blockedCount = Math.max(0, (colorObj.blockedCount || 0) - vehicleStock.stock);
                    await vehicle.save();
                }
            }

            // CASE 3️: Only MDDP allocation
            else if (!hasVehicle && hasMddp) {
                const mddp = await Mddp.findById(mddpStock.id);
                if (mddp) {
                    mddp.blockedCount = Math.max(0, (mddp.blockedCount || 0) - mddpStock.stock);
                    await mddp.save();
                }
            }

            // CASE 4️: No valid allocations (just mark unavailable)
            else {
                existingOrder.vehicleStock.available = false;
                existingOrder.mddpStock.available = false;
            }

            // Finally delete the order
            await CustomerOrders.findByIdAndDelete(id);
            logger.info(` Order ${id} deleted after stock cleanup by ${userObj?.username || "unknown user"}`);
        }



        res.status(200).json({ message: "Order Deleted Successfully!" });
    } catch (err) {
        logger.error(`Error deleting order ID=${id}:`, err);
        res.status(500).json({ message: "Server error while deleting order." });
    }
};






module.exports = {
    getAllCustomerOrders,
    getAllVehiclesFromOrders,
    addOrder,
    updateOrder,
    deleteOrder
}