const { default: mongoose } = require("mongoose");
const logger = require("../Utilities/logging");
const Vehicle = require("../Schemas/Vehicle");
const Branch = require("../Schemas/Branch");

// Helper: normalize string for comparison (lowercase, no spaces)
const normalize = (s = "") => String(s).trim().toLowerCase().replace(/\s+/g, "");
const normalizeArray = (arr = []) => {
    if (!Array.isArray(arr)) return "";
    return arr
        .slice()               // create a copy so original array is not modified
        .sort()                // sort alphabetically
        .join("")              // join into single string
        .replace(/\s+/g, "")   // remove all spaces
        .toLowerCase();        // convert to lowercase
};


//get all branches  & vehicles
const getAllBranchesAndVehicles = async (req, res) => {
    try {
        const { username } = req?.user;

        // Fetch all branches with only 'name' and '_id'
        const branches = await Branch.find()
            .select("name") // only name and _id
            .sort({ createdAt: -1 }) // descending order by creation date
            .lean();

        // Fetch all vehicles, sorted descending by creation date
        const vehicles = await Vehicle.find()
            .sort({ createdAt: -1 }) // descending order
            .populate("branch", "name") // populate branch with only 'name'
            .lean();


        logger.info(`Branches and vehicles fetched by ${username}. Branches: ${branches.length}, Vehicles: ${vehicles.length}`);
        res.status(200).json({ branches, vehicles });

    } catch (error) {
        logger.error("Error fetching branches and vehicles:", error);
        res.status(500).json({ message: "Failed to fetch branches and vehicles" });
    }
};




// Add new vehicle
const addVehicle = async (req, res) => {
    const userObj = req?.user;

    try {
        console.log("REQ BODY:", req.body);

        const { brand, model, branch, variants } = req.body;
        const createdBy = userObj?.username || "system";
        const updatedBy = createdBy;
        console.log(req.body);

        // Initialize showErrors
        const showErrors = { brand: "", model: "", branch: "", variants: {} };

        // Basic validations
        if (!brand || brand.trim().length < 3) showErrors.brand = "Brand required or too short";
        if (!model || model.trim().length < 3) showErrors.model = "Model required or too short";
        if (!branch) showErrors.branch = "Branch required";

        if (!variants || typeof variants !== "object") {
            showErrors.variants.general = "Variant details required";
        } else {
            // Individual variant field validations
            const variantErrors = {};
            if (!variants.name || !variants.name.trim()) variantErrors.name = "Variant name required";
            if (!variants.type || !variants.type.trim()) variantErrors.type = "Type required";
            if (!variants.engine) variantErrors.engine = "Engine required";
            if (!variants.transmission || !variants.transmission.trim()) variantErrors.transmission = "Transmission required";
            if (!variants.fuel || !variants.fuel.trim()) variantErrors.fuel = "Fuel required";
            if (!variants.seating) variantErrors.seating = "Seating required";
            if (!variants.price) variantErrors.price = "Price required";
            // if(!variants?.colors?.length == 0) variantErrors.colors = "colors required!"

            if (Object.keys(variantErrors).length) showErrors.variants = variantErrors;
        }

        // Return errors if any
        if (Object.values(showErrors).some(msg => (typeof msg === "string" ? msg : Object.keys(msg).length))) {
            logger.warn("Vehicle creation blocked due to validation errors", { user: createdBy, showErrors });
            return res.status(400).json({ showErrors });
        }

        // Check branch exists
        const branchObj = await Branch.findById(new mongoose.Types.ObjectId(branch.trim()));
        if (!branchObj) {
            showErrors.branch = "Branch not found";
            return res.status(404).json({ showErrors });
        }


        // Check for existing vehicle
        const existingVehicle = await Vehicle.findOne({
            normalizedBrand: normalize(brand),
            normalizedModel: normalize(model),
            branch: new mongoose.Types.ObjectId(branch.trim())
        });

        if (existingVehicle) {
            // Check for duplicate variant
            const duplicate = existingVehicle.variants.some(v =>
                normalize(v.name) === normalize(variants.name) &&
                normalize(v.type) === normalize(variants.type) &&
                Number(v.engine) === Number(variants.engine) &&
                normalize(v.transmission) === normalize(variants.transmission) &&
                normalize(v.fuel) === normalize(variants.fuel) &&
                Number(v.seating) === Number(variants.seating) &&
                normalizeArray(v.features) === normalizeArray(variants.features)
            );

            console.log(duplicate);

            if (duplicate) {
                showErrors.variants.general = `Duplicate variant: ${variants.name}`;
                return res.status(400).json({ showErrors });
            }


            // Add new variant
            existingVehicle.variants.push(variants);
            existingVehicle.updatedBy = updatedBy;
            await existingVehicle.save();

            // Populate branch before sending response
            const populatedVehicle = await Vehicle.findById(existingVehicle._id)
                .populate("branch", "name");

            logger.info(`Variant added to existing vehicle by ${createdBy}`, { brand, model });
            return res.status(200).json({ message: "Variant added to existing vehicle!", populatedVehicle });
        }

        // Create new vehicle with single variant wrapped in array
        const vehicle = new Vehicle({
            brand,
            normalizedBrand: normalize(brand),
            normalizedModel: normalize(model),
            model,
            branch,
            variants: [variants],
            createdBy,
            updatedBy
        });

        const savedVehicle = await vehicle.save();

        // Populate branch name after saving
        const populatedVehicle = await Vehicle.findById(savedVehicle._id).populate("branch", "name");
        console.log(populatedVehicle);

        logger.info(`Vehicle created successfully by ${createdBy}`, { brand, model });
        res.status(201).json({ message: "Vehicle created successfully", populatedVehicle });

    } catch (error) {
        logger.error(`Error creating vehicle by ${userObj?.username}: ${error.stack}`);
        res.status(500).json({ message: "Failed to create vehicle", error: error.message });
    }
};



const updateVehicle = async (req, res) => {
    const userObj = req?.user;
    console.log(req.body);
    const { brand, model, variant, vehicleId, branchId, variantId } = req.body;

    logger.info(`UPDATE Vehicle API called by ${userObj?.username} for vehicleId=${vehicleId}`);

    try {
        // Fetch current vehicle
        const currentVehicle = await Vehicle.findById(vehicleId);
        if (!currentVehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        // Check if another vehicle in the same branch has the same brand or model
        const duplicateVehicle = await Vehicle.findOne({
            branch: branchId,
            $or: [
                { normalizedBrand: normalize(brand) },
                { normalizedModel: normalize(model) }
            ],
            _id: { $ne: new mongoose.Types.ObjectId(vehicleId) }
        });

        if (duplicateVehicle) {
            return res.status(400).json({ message: "Brand or Model already in use" });
        }

        // Update brand & model
        currentVehicle.brand = brand.trim();
        currentVehicle.normalizedBrand = normalize(brand);
        currentVehicle.model = model.trim();
        currentVehicle.normalizedModel = normalize(model);

        // Find variant index
        const variantIndex = currentVehicle.variants.findIndex(v => v._id.toString() === variantId.toString());
        if (variantIndex === -1) {
            return res.status(404).json({ message: "Variant not found in this vehicle" });
        }

        // Check for duplicate variant excluding the current one

        const isDuplicate = currentVehicle.variants.some((v, idx) => {
            if (idx === variantIndex) return false;
            return (
                normalize(v.name) === normalize(variant.name) &&
                normalize(v.type) === normalize(variant.type) &&
                Number(v.engine) === Number(variant.engine) &&
                normalize(v.transmission) === normalize(variant.transmission) &&
                normalize(v.fuel) === normalize(variant.fuel) &&
                Number(v.seating) === Number(variant.seating) &&
                normalizeArray(v.features) === normalizeArray(variant.features)
            );
        });

        if (isDuplicate) {
            return res.status(400).json({ message: "Duplicate variant exists. Cannot update." });
        }

        // Merge and update variant
        currentVehicle.variants[variantIndex] = {
            ...currentVehicle.variants[variantIndex]._doc,
            ...variant
        };

        currentVehicle.updatedBy = userObj?.username || "system";
        await currentVehicle.save();

        logger.info(`Vehicle '${currentVehicle.brand} ${currentVehicle.model}' updated by ${userObj?.username}`);

        const populatedVehicle = await Vehicle.findById(currentVehicle._id)
            .populate("branch", "_id name");

        res.status(200).json({
            message: "Vehicle and variant updated successfully",
            populatedVehicle
        });

    } catch (error) {
        logger.error(`Error updating Vehicle id=${vehicleId} by ${userObj?.username}: ${error.stack}`);
        res.status(500).json({ message: "Failed to update Vehicle", error: error.message });
    }
};




//Deleting variant or vehicle 
const deleteVariant = async (req, res) => {
    const { vehicleId, variantId } = req.params;

    try {
        const vehicle = await Vehicle.findById(new mongoose.Types.ObjectId(vehicleId));
        if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

        console.log(vehicleId, variantId);
        const result = await vehicle.deleteVariant(new mongoose.Types.ObjectId(vehicleId), new mongoose.Types.ObjectId(variantId));

        // Fetch updated vehicles
        const vehicles = await Vehicle.find()
            .sort({ createdAt: -1 })
            .populate("branch", "name")
            .lean();

        if (result.vehicleDeleted) {
            res.json({ message: "Variant and vehicle deleted successfully", vehicles });
        } else {
            res.json({ message: "Variant deleted successfully", vehicles });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message || "Failed to delete variant" });
    }
};



module.exports = {
    getAllBranchesAndVehicles,
    addVehicle,
    updateVehicle,
    deleteVariant
}



