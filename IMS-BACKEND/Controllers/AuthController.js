const { verifyToken, createToken } = require("../Auth/Authentication");
const logger = require("../Utilities/logging");
const User = require("../Schemas/User");


// Verify token 
const authCheck = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(" ")[1];

        if (!token) {
            logger.warn("Token missing in request");
            return res.status(401).json({ message: "Not authorized, no token" });
        }

        const decoded = await verifyToken(token);
        if (!decoded) {
            logger.warn("Invalid token detected");
            return res.status(401).json({ message: "Not authorized, token invalid" });
        }

        logger.info("Token verified successfully", { user: decoded.username });
        res.status(200).json({ message: "Token is valid", user: decoded });
    } catch (error) {
        logger.error("Token verification error", { error: error.message });
        res.status(500).json({ message: "Server error" });
    }
}


//login 
const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        logger.info("Login attempt", { username });

        const user = await User.findOne({ username });
        if (!user) {
            logger.warn("Login failed - User not found", { username });
            return res.status(400).json({ message: "User not found" });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            logger.warn("Login failed - Incorrect password", { username });
            return res.status(400).json({ message: "Incorrect password" });
        }

        const token = createToken(user);

        logger.info("Login successful", { username, role: user.role });

        res.status(200).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                permissions: user.permissions,
            },
        });
    } catch (error) {
        logger.error("Login error", { error: error.message });
        res.status(500).json({ message: "Server error" });
    }
}


module.exports = {
    authCheck,
    login
}