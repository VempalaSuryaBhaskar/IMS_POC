const mongoose = require("mongoose");
const Vehicle = require("./Vehicle");
const Mddp = require("./Mddp");
const CustomerOrders = require("./CustomerOrders");

const branchSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    extractedName: {
        type: String,
        required: true
    },
    location: {
        type: String, required: true
    },
    contact: {
        type: String, required: true
    },
    createdBy: {
        type: String,
        required: true
    },
}, { timestamps: true });




branchSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    try {
        const vehicles = await Vehicle.find({ branch: this._id });

        for (const vehicle of vehicles) {
            // Delete all related MDDP entries
            await Mddp.deleteMany({ vehicleId: vehicle._id });
        }

        // Then delete all vehicles
        await Vehicle.deleteMany({ branch: this._id });

        // Delete all customer orders belonging to this branch
        const deletedOrders = await CustomerOrders.deleteMany({ branchId: this._id });

        console.log(
            `Branch ${this._id} deleted → also deleted ${vehicles.length} vehicles, all related MDDPs, and ${deletedOrders.deletedCount || 0} CustomerOrders`
        );

        console.log(`All vehicles and related MDDPs for branch ${this._id} deleted`);
        next();
    } catch (err) {
        next(err);
    }
});


module.exports = mongoose.model("Branch", branchSchema);
