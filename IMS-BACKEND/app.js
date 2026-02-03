require("dotenv").config();
const express = require("express");
const connectDB = require("./DB/connection");
const cors = require("cors");
const vehicleRoutes = require("./Routes/VehicleRoutes");
const { authMiddleware } = require("./Auth/Authentication"); // import middleware
const UserRoutes = require("./Routes/UserRoutes");
const bcrypt = require("bcrypt");
const User = require("./Schemas/User");
const BrachRoutes = require("./Routes/BranchRoutes");
const MddpRoutes = require("./Routes/MddpRoutes");
const CustomerOrderRouter = require("./Routes/CustomerOrderRoutes");

//DB Connection 
connectDB();


const app = express();

//middle wares 
app.use(express.json());
app.use(cors());


app.get("/", (req, res) => {
    res.json("Hello World!");
});

//Non Protected Routes
app.use("/api/auth", require("./Routes/AuthRoutes"));


// Protect all routes below
// All routes below this line require JWT authentication
app.use(authMiddleware);

app.use("/api/vehicles", vehicleRoutes);
app.use("/api/branches", BrachRoutes);
app.use("/api/users", UserRoutes);
app.use("/api/mddps", MddpRoutes);
app.use("/api/customerOrders",CustomerOrderRouter)



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));








































app.get("/checkpoint", async (req, res) => {
    const defaultUser = {
        username: "john_doe",
        password: "password123", // will be hashed by pre-save hook
        email: "john.doe@example.com",
        phone: "9876543211",
        role: "Admin",
        createdBy: "system",
        updatedBy: "system",
        permissions: {
            manageBranches: ["Create", "View", "Update", "Delete"],
            vehicleManagement: ["Create", "View", "Update", "Delete"],
            mddpManagement: ["Create", "View", "Update", "Delete"],
            customerOrders: ["Create", "View", "Update", "Delete"],
            finance: ["Create", "View", "Update", "Delete"],
            manageUsers: ["Create", "View", "Update", "Delete"]
        }
    };

    try {
        // Check if user already exists
        const existing = await User.findOne({ username: defaultUser.username });
        if (existing) {
            return res.status(200).json({ message: "Default user already exists", user: existing });
        }

        const newUser = await User.create(defaultUser); // await here
        return res.status(200).json({ message: "Default user created", user: newUser });
    } catch (err) {
        console.error("Checkpoint error:", err);
        return res.status(500).json({ message: "Failed to create default user", error: err });
    }
});