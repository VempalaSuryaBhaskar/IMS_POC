const Mddp = require("./Mddp");
const { default: mongoose } = require("mongoose");
const CustomerOrders = require("./CustomerOrders");
const logger = require("../Utilities/logging"); // adjust the path if needed


//  Allowed constants
const vehicleTypes = [
    "Hatchback",
    "Sedan",
    "SUV",
    "Coupe",
    "Convertible",
    "Crossover",
    "Pickup Truck",
    "Minivan",
    "Station Wagon",
    "Sports Car"
];
const fuelTypes = ["Petrol", "Diesel", "Electric", "Hybrid"];
const transmissions = ["Manual", "Automatic", "CVT", "Hybrid"];



// Variant Schema
const variantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: vehicleTypes, // validate against vehicleTypes
        required: true
    },
    engine: {
        type: Number,
        required: true
    },
    transmission: {
        type: String,
        enum: transmissions, // validate against transmissions
        required: true
    },
    fuel: {
        type: String,
        enum: fuelTypes, // validate against fuelTypes
        required: true
    },
    seating: {
        type: Number,
        required: true
    },
    features: {
        type: [String],
        required: true
    },
    colors: [
        {
            color: { type: String, required: true },
            stock: { type: Number, required: true },
            blockedCount: {
                type: Number,
                default: 0
            }
        }
    ],
    price: {
        type: Number,
        required: true
    },
});


// Vehicle Schema
const vehicleSchema = new mongoose.Schema(
    {
        model: {
            type: String,
            required: true
        },
        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: true
        },
        brand: {
            type: String,
            required: true,
        },
        normalizedBrand: {
            type: String,
            required: true,
        },
        normalizedModel: {
            type: String,
            required: true,
        },
        variants: {
            type: [variantSchema],
            required: true,
        },
        createdBy: {
            type: String,
            required: true,
        },
        updatedBy: {
            type: String,
            require: true,
            default: "System"
        }
    },
    { timestamps: true }
);


// Method to delete variant + related Mddp + remove vehicle if no variants
// vehicleSchema.methods.deleteVariant = async function (vehicleId, variantId) {

//     // Filter out the variant to delete
//     const variantExists = this.variants.some(v => v._id.toString() === variantId.toString());
//     if (!variantExists) throw new Error("Variant not found");

//     this.variants = this.variants.filter(v => v._id.toString() !== variantId.toString());
//     await this.save();

//     // Delete related MDDP entries
//     await Mddp.deleteMany({
//         vehicleId: new mongoose.Types.ObjectId(vehicleId),
//         variantId: new mongoose.Types.ObjectId(variantId),
//     });



//     // If no variants left, delete vehicle itself
//     if (this.variants.length === 0) {
//         await this.deleteOne();
//         return { vehicleDeleted: true };
//     }

//     return { vehicleDeleted: false, remainingVariants: this.variants.length };

// };




// Method to delete variant + related MDDP + related Orders + remove vehicle if no variants
vehicleSchema.methods.deleteVariant = async function (vehicleId, variantId) {

    try {
        // 1) Verify variant exists on this vehicle
        const variantExists = this.variants.some(
            (v) => v._id.toString() === variantId.toString()
        );
        if (!variantExists) throw new Error("Variant not found on vehicle");

        // 2) Remove the variant from the vehicle document
        this.variants = this.variants.filter(
            (v) => v._id.toString() !== variantId.toString()
        );
        await this.save();
        logger.info(`Variant ${variantId} removed from Vehicle ${vehicleId}.`);

        // 3) Delete all MDDP records for this vehicle + variant
        const mddpDeleteResult = await Mddp.deleteMany({
            vehicleId: new mongoose.Types.ObjectId(vehicleId),
            variantId: new mongoose.Types.ObjectId(variantId),
        });
        logger.info(
            `Deleted ${mddpDeleteResult.deletedCount || 0} MDDP entries for variantId=${variantId}.`
        );

        // 4) Delete all CustomerOrders having this variantId
        const orderDeleteResult = await CustomerOrders.deleteMany({
            variantId: new mongoose.Types.ObjectId(variantId),
        });
        logger.info(
            `Deleted ${orderDeleteResult.deletedCount || 0} CustomerOrders for variantId=${variantId}.`
        );

        // 5) If no variants remain, delete the vehicle itself
        if (this.variants.length === 0) {
            await this.deleteOne();
            logger.info(`Vehicle ID=${vehicleId} deleted (no variants remaining).`);
            return {
                vehicleDeleted: true,
                deletedMddpCount: mddpDeleteResult.deletedCount || 0,
                deletedOrderCount: orderDeleteResult.deletedCount || 0,
            };
        }

        // 6) Return summary if vehicle still exists
        return {
            vehicleDeleted: false,
            remainingVariants: this.variants.length,
            deletedMddpCount: mddpDeleteResult.deletedCount || 0,
            deletedOrderCount: orderDeleteResult.deletedCount || 0,
        };
    } catch (err) {
        logger.error(`Error in deleteVariant (vehicleId=${vehicleId}, variantId=${variantId}): ${err.message}`);
        throw err;
    }
};




module.exports = mongoose.model("Vehicle", vehicleSchema);
