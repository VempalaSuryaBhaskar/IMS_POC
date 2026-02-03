const mongoose = require("mongoose");

const customerOrderSchema = new mongoose.Schema({
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        required: true
    },
    createdBy: {
        type: String,
        required: true
    },
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
        required: true
    },
    variantId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }, // store variant _id
    color: {
        type: String,
        required: true
    },
    customerDetails: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String, required: true },
        address: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        aadharNumber: { type: String, required: true },
        panNumber: { type: String, required: true },
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    expectedDate: {
        type: Date,
        required: true
    },
    deliveryDate: {
        type: Date,
    },
    financeType: {
        type: String,
        required: true
    },
    financeStatus: {
        type: String,
        enum: ["Pending", "Completed", "Declined"],
        default: "Pending"
    },
    orderStatus: {
        type: String,
        enum: ["Pending", "Dispatched", "Delivered", "Cancelled"],
        default: "Pending"
    },
    totalAmount: {
        type: Number,
        required: true
    },
    totalCount: {
        type: Number,
        required: true
    },
    vehicleStock: {
        id: String,
        stock: Number,
        available: {
            type: Boolean,
            default: false
        }
    },
    mddpStock: {
        id: String,
        stock: Number,
        available: {
            type: Boolean,
            default: false
        }
    }
}, { timestamps: true });



customerOrderSchema.pre("save", function (next) {
    // Finance Declined → Cancel order
    if (this.financeStatus === "Declined" && this.orderStatus !== "Cancelled") {
        this.orderStatus = "Cancelled";
    }

    // Order Cancelled → Finance Declined
    if (this.orderStatus === "Cancelled" && this.financeStatus !== "Declined") {
        this.financeStatus = "Declined";
    }

    // Delivered order → Finance must be Completed
    if (this.orderStatus === "Delivered" && this.financeStatus !== "Completed") {
        this.financeStatus = "Completed";
    }

    next();
});



module.exports = mongoose.model("CustomerOrders", customerOrderSchema);
