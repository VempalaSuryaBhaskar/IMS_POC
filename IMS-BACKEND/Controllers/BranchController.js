const Branch = require("../Schemas/Branch");
const logger = require("../Utilities/logging");
const { default: mongoose } = require("mongoose");

const getAllBranches = async (req, res) => {
    try {
        const { username } = req?.user; // logged-in user info

        const branches = await Branch.find();

        logger.info(`branchs fetched by ${username}. Count: ${branches.length}`);
        res.status(200).json({ branches });

    } catch (error) {
        logger.error("Error fetching users:", error);
        res.status(500).json({ message: "Failed to fetch users" });
    }
}



const addBranch = async (req, res) => {
    const userObj = req?.user;

    try {
        const { name, contact, location } = req.body;

        if (!name && !contact && !location) {
            logger.warn("Branch creation failed: No fields provided");
            return res.status(400).json({ message: "(name, contact, location) must be provided" });
        }

        const createdBy = userObj?.username || "system";
        const updatedBy = createdBy;

        // Normalize name
        const extractedName = name.replace(/\s+/g, "").toLowerCase();
        console.log("Extracted:", extractedName);

        // Check duplicates
        const duplicateBranch = await Branch.findOne({
            $or: [{ extractedName }, { contact }],
        });

        const showErrors = { name: "", contact: "" };
        if (duplicateBranch) {
            if (duplicateBranch.extractedName === extractedName)
                showErrors.name = "Branch name already in use";
            if (duplicateBranch.contact === contact)
                showErrors.contact = "Contact number already in use";
        }

        if (Object.values(showErrors).some((msg) => msg)) {
            logger.warn("Branch creation blocked due to duplicates", showErrors);
            return res.status(400).json({ showErrors });
        }

        // Validation
        const errors = {};
        if (!name || name.length < 3)
            errors.name = "Branch name must be at least 3 characters";
        if (!location || location.length < 3)
            errors.location = "Location must be at least 3 characters";
        if (!contact || !/^[6-9]\d{9}$/.test(contact))
            errors.contact = "Invalid 10-digit Indian contact number";

        if (Object.keys(errors).length) {
            logger.warn("Branch creation blocked due to field errors", { branch: { name, contact, location }, errors });
            return res.status(400).json({ showErrors: errors });
        }

        // Create and save
        const newBranch = new Branch({
            name,
            extractedName,
            location,
            contact,
            createdBy,
            updatedBy,
        });

        const savedBranch = await newBranch.save();
        logger.info(`Branch created successfully by ${createdBy}`, { name });

        res.status(201).json({
            message: "Branch created successfully",
            savedBranch,
        });

    } catch (error) {
        logger.error(`Error creating Branch by ${userObj?.username}: ${error.stack}`);
        res.status(500).json({ message: "Failed to create branch", error });
    }
}


const updateBranch = async (req, res) => {
    const { id } = req.params;
    const userObj = req?.user;

    logger.info(`/api/branches/${id} Update called by ${userObj?.username}`);

    try {
        logger.info(`Update request received for brancId=${id} by ${userObj?.username}`);

        const objectId = new mongoose.Types.ObjectId(id);
        const { name, contact } = req.body; // only these fields allowed

        if (!name && !contact) {
            logger.warn(`No updatable fields provided for update by ${userObj?.username}`);
            return res.status(400).json({ message: "At least one updatable field must be provided" });
        }

        const branch = await Branch.findById(objectId);
        if (!branch) {
            logger.warn(`Branch not found: id=${id}`);
            return res.status(404).json({ message: "Branch not found" });
        }

        // Apply updates
        if (name) branch.name = name;
        if (contact) branch.contact = contact;

        branch.updatedBy = userObj?.username || "system";

        await branch.save();
        logger.info(`Brancj ${branch.name} updated successfully by ${userObj?.username}`);

        const branches = await Branch.find();

        res.status(200).json({ message: "Branch updated successfully", branches });
    } catch (error) {
        logger.error(`Error updating branch id=${id}: ${error.stack}`);
        res.status(500).json({ message: "Failed to update branch", error });
    }
}




const deleteBranch = async (req, res) => {
    const { id } = req.params;
    const userObj = req?.user;

    logger.info(`/api/branches/${id} DELETE called by ${userObj?.username}`);

    try {
        logger.info(`Delete request for branchId=${id} by ${userObj?.username}`);

        const objectId = new mongoose.Types.ObjectId(id);
        const branch = await Branch.findById(objectId);

        if (!branch) {
            logger.warn(`Branch not found for delete: id=${id}`);
            return res.status(404).json({ message: "Branch not found" });
        }

        // trigger pre('deleteOne') with { document: true }
        await branch.deleteOne();

        logger.info(`Branch '${branch.name}' deleted by ${userObj?.username}`);

        const branches = await Branch.find();

        res.status(200).json({ message: `Branch '${branch.name}' deleted successfully`, branches });
    } catch (error) {
        logger.error(`Error deleting Branch id=${id}: ${error.stack}`);
        res.status(500).json({ message: "Failed to delete Branch", error });
    }
};



const advanceCheckForNewBranch = async (req, res) => {
    const userObj = req?.user;
    const { name, contact } = req.body;

    logger.info(`/api/branches/advanceCheck called by ${userObj?.username}`, { name, contact });

    if (!name && !contact) {
        logger.warn("Advance check failed: No fields provided");
        return res.status(400).json({ message: "(name, contact) must be provided" });
    }

    const extractedName = name.replace(/\s+/g, "").toLowerCase();

    try {
        const duplicateBranch = await Branch.findOne({
            $or: [{ extractedName }, { contact }],
        });

        if (duplicateBranch) {
            const showErrors = { name: "", contact: "" };

            if (duplicateBranch.extractedName === extractedName)
                showErrors.name = "Branch name already in use by another Branch";
            if (duplicateBranch.contact === contact)
                showErrors.contact = "Phone number already in use by another Branch";

            logger.warn("Duplicate fields found", { showErrors, branchId: duplicateBranch._id });
            return res.status(400).json({ showErrors });
        }

        logger.info("No duplicates found for advance check");
        return res.status(200).json({ message: "No duplicates found" });

    } catch (error) {
        logger.error("Error during advance check", { error: error.stack });
        return res.status(500).json({ message: "Error during advance check", error: error.message });
    }
}



const advanceCheckForUpdateBranch = async (req, res) => {
    const userObj = req?.user;
    const { name, contact } = req.body;
    const { id } = req?.params;

    logger.info(`/api/branches/advanceCheck called by ${userObj?.username}`, { name, contact });

    if (!name && !contact) {
        logger.warn("Advance check failed: No fields provided");
        return res.status(400).json({ message: "(name, contact) must be provided" });
    }

    const extractedName = name.replace(/\s+/g, "").toLowerCase();

    try {
        const objectId = new mongoose.Types.ObjectId(id);
        const duplicateBranch = await Branch.findOne({
            $and: [
                { _id: { $ne: objectId } }, // exclude the current branch
                {
                    $or: [
                        { extractedName },
                        { contact }
                    ]
                }
            ]
        });

        if (duplicateBranch) {
            const showErrors = { name: "", contact: "" };

            if (duplicateBranch.extractedName === extractedName)
                showErrors.name = "Branch name already in use by another Branch";
            if (duplicateBranch.contact === contact)
                showErrors.contact = "Phone number already in use by another Branch";

            logger.warn("Duplicate fields found", { showErrors, branchId: duplicateBranch._id });
            return res.status(400).json({ showErrors });
        }

        logger.info("No duplicates found for advance check");
        return res.status(200).json({ message: "No duplicates found" });

    } catch (error) {
        logger.error("Error during advance check", { error: error.stack });
        return res.status(500).json({ message: "Error during advance check", error: error.message });
    }
}


module.exports = {
    getAllBranches,
    addBranch,
    updateBranch,
    deleteBranch,
    advanceCheckForNewBranch,
    advanceCheckForUpdateBranch
}