const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
    username: { type: String },
    password: { type: String },
    email: { type: String },
    phone: { type: String },
    role: { type: String },
    createdBy: { type: String },
    permissions: {
        manageBranches: [String],
        vehicleManagement: [String],
        mddpManagement: [String],
        customerOrders: [String],
        finance: [String],
        manageUsers: [String]
    },
    updatedBy: { type: String, default: null }
},{timestamps:true});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  console.log(enteredPassword, this.password);
  console.log(await bcrypt.compare(enteredPassword, this.password));
  return await bcrypt.compare(enteredPassword, this.password);
  // return enteredPassword == this.password;
};

module.exports = mongoose.model("User", userSchema);
