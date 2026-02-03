const { default: mongoose } = require("mongoose");
const logger = require("../Utilities/logging");
const User = require("../Schemas/User");



const getAllUsers = async (req, res) => {
    try {
        const { username } = req?.user; // logged-in user info

        const users = await User.find({ username: { $ne: username } })
            .select("-password")
            .sort({ createdAt: -1 });

        logger.info(`Users fetched by ${username}. Count: ${users.length}`);
        res.status(200).json({ users });
    } catch (error) {
        logger.error("Error fetching users:", error);
        res.status(500).json({ message: "Failed to fetch users" });
    }
}



const createNewUser = async (req, res) => {
    const userObj = req.user;

    try {
        const { username, password, email, phone, role, permissions } = req.body;

        if (!username && !password && !email && !phone && !role && !permission) {
            logger.warn("User Creation failed: No fields provided");
            return res.status(400).json({ message: "( username, password, email, phone, role, permissions) must be provided" });
        }

        const createdBy = userObj?.username || "system";
        const updatedBy = createdBy;

        // --- Prepare fields for advance check ---
        const fieldsToCheck = { username, email, phone };

        // --- Run advance check ---
        const duplicateUser = await User.findOne({
            $or: Object.entries(fieldsToCheck).map(([key, value]) => ({ [key]: value })),
        });

        const showErrors = { username: "", email: "", phone: "" };
        if (duplicateUser) {
            if (duplicateUser.username === username) showErrors.username = "Username already in use";
            if (duplicateUser.email === email) showErrors.email = "Email already in use";
            if (duplicateUser.phone === phone) showErrors.phone = "Phone number already in use";
        }

        if (Object.values(showErrors).some((msg) => msg)) {
            logger.warn(`User creation blocked due to duplicates by ${userObj?.username}`, showErrors);
            return res.status(400).json({ showErrors });
        }

        // --- Store all fields in an object for validation ---
        const userData = { username, password, email, phone, role, permissions, createdBy, updatedBy };


        // Basic field-level validation
        const errors = {};
        if (!username || username.length < 3) errors.username = "Username must be at least 3 characters";
        if (!password || password.length < 6) errors.password = "Password must be at least 6 characters";
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Invalid email format";
        if (!phone || !/^[6-9]\d{9}$/.test(phone)) errors.phone = "Invalid 10-digit Indian phone number";
        if (!role) errors.role = "Role is required";

        if (Object.keys(errors).length) {
            logger.warn(`User creation blocked due to field errors by ${userObj?.username}`, errors);
            return res.status(400).json({ showErrors: errors });
        }

        // --- Create and save user ---
        const newUser = new User(userData);
        const savedUser = await newUser.save();



        logger.info(`User created successfully by ${userObj?.username}`, { username: newUser.username });
        res.status(200).json({ message: "User created successfully", savedUser });

    } catch (error) {
        logger.error(`Error creating user by ${userObj?.username}: ${error.stack}`);
        res.status(500).json({ message: "Failed to create user", error });
    }
}


const updateUser = async (req, res) => {
    const { id } = req.params;
    const userObj = req?.user;

    logger.info(`/api/users/${id} Update called by ${userObj?.username}`);

    try {
        logger.info(`Update request received for userId=${id} by ${userObj?.username}`);

        const objectId = new mongoose.Types.ObjectId(id);
        const { role, permissions } = req.body; // only these fields allowed

        if (!role && !permissions) {
            logger.warn(`No updatable fields provided for update by ${userObj?.username}`);
            return res.status(400).json({ message: "At least one updatable field must be provided" });
        }

        const user = await User.findById(objectId);
        if (!user) {
            logger.warn(`User not found: id=${id}`);
            return res.status(404).json({ message: "User not found" });
        }

        // Apply updates
        if (role) user.role = role;
        if (permissions) user.permissions = permissions;

        user.updatedBy = userObj?.username || "system";

        await user.save();
        logger.info(`User ${user.username} updated successfully by ${userObj?.username}`);

        const users = await User.find({ username: { $ne: userObj.username } })
            .select("-password")
            .sort({ createdAt: -1 });

        res.status(200).json({ message: "User updated successfully", users });
    } catch (error) {
        logger.error(`Error updating user id=${id}: ${error.stack}`);
        res.status(500).json({ message: "Failed to update user", error });
    }
}


const deleteUser = async (req, res) => {
    const { id } = req.params;
    const userObj = req?.user;

    logger.info(`/api/users/${id} DELETE called by ${userObj?.username}`);

    try {
        logger.info(`Delete request for userId=${id} by ${userObj?.username}`);

        const objectId = new mongoose.Types.ObjectId(id);
        const user = await User.findById(objectId);

        if (!user) {
            logger.warn(`User not found for delete: id=${id}`);
            return res.status(404).json({ message: "User not found" });
        }

        if (req.user && user._id.toString() === req.user._id.toString()) {
            logger.warn(`Self-delete attempt by ${userObj?.username}`);
            return res.status(400).json({ message: "You cannot delete your own account" });
        }

        await User.findByIdAndDelete(objectId);
        logger.info(`User '${user.username}' deleted by ${userObj?.username}`);

        const users = await User.find({ username: { $ne: userObj.username } })
            .select("-password")
            .sort({ createdAt: -1 });

        res.status(200).json({ message: `User '${user.username}' deleted successfully`, users });
    } catch (error) {
        logger.error(`Error deleting user id=${id}: ${error.stack}`);
        res.status(500).json({ message: "Failed to delete user", error });
    }
}


const advanceCheck = async (req, res) => {
    const userObj = req?.user;
    const { username, email, phone } = req.body;

    logger.info(`/api/users/advanceCheck called by ${userObj?.username}`, { username, email, phone });

    if (!username && !email && !phone) {
        logger.warn("Advance check failed: No fields provided");
        return res.status(400).json({ message: "At least one field (username, email, phone) must be provided" });
    }

    try {
        const duplicateUser = await User.findOne({
            $or: [{ username }, { email }, { phone }],
        });

        if (duplicateUser) {
            const showErrors = { username: "", email: "", phone: "" };

            if (duplicateUser.username === username) showErrors.username = "Username already in use by another user";
            if (duplicateUser.email === email) showErrors.email = "Email already in use by another user";
            if (duplicateUser.phone === phone) showErrors.phone = "Phone number already in use by another user";

            logger.warn("Duplicate fields found", { showErrors, userId: duplicateUser._id });
            return res.status(400).json({ showErrors }); // return here to prevent sending another response
        }

        logger.info("No duplicates found for advance check");
        return res.status(200).json({ message: "No duplicates found" });
    } catch (error) {
        logger.error("Error during advance check", { error: error.stack });
        return res.status(500).json({ message: "Error during advance check", error: error.message });
    }
}



module.exports = {
    getAllUsers,
    createNewUser,
    updateUser,
    deleteUser,
    advanceCheck
}