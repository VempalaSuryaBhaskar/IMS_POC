const mongoose = require("mongoose");

const mddpSchema = new mongoose.Schema({
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
        required: true
    },
    variantId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    color: {
        type: String,
        required: true
    },
    stock: {
        type: Number,
        required: true
    },
    expectedDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ["Requested", "Approved", "Completed", "Rejected"],
        default: "Requested"
    },
    createdBy: {
        type: String,
        required: true
    },
    updatedBy: {
        type: String,
        required: true
    },
    payment: {
        type: String,
        enum: ["Pending", "Completed"],
    },
    blockedCount :{
        type:Number,
        default:0
    }
}, { timestamps: true });

module.exports = mongoose.model("Mddp", mddpSchema);
