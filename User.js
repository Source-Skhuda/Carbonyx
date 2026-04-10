const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema({
    category: String,
    value: Number,
    date: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    activities: [ActivitySchema]
});

module.exports = mongoose.model("User", UserSchema);

