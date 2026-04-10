require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("./model/user");

const app = express();

// MIDDLEWARE
app.use(cors({
    origin: "*",
    methods: ["GET","POST","PUT","DELETE"],
    credentials: true
}));
app.use(express.json());

// ROOT TEST
app.get("/", (req, res) => {
    res.json({ message: "Carbonyx API running 🚀" });
});

// CONNECT DB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected ✅"))
.catch(err => console.log(err));

// AUTH MIDDLEWARE
function auth(req, res, next){
    const token = req.headers["authorization"];
    if(!token) return res.status(401).json({ message: "No token" });

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch{
        res.status(400).json({ message: "Invalid token" });
    }
}

// REGISTER
app.post("/api/register", async (req, res) => {
    try {
        const { username, password } = req.body;

        const exists = await User.findOne({ username });
        if(exists) return res.status(400).json({ message: "User exists" });

        const hashed = await bcrypt.hash(password, 10);

        const user = new User({ username, password: hashed, activities: [] });
        await user.save();

        res.json({ message: "Registered successfully" });

    } catch(err){
        res.status(500).json({ message: err.message });
    }
});

// LOGIN
app.post("/api/login", async (req, res) => {
    try{
        const { username, password } = req.body;

        const user = await User.findOne({ username });
        if(!user) return res.status(400).json({ message: "User not found" });

        const valid = await bcrypt.compare(password, user.password);
        if(!valid) return res.status(400).json({ message: "Wrong password" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

        res.json({
            token,
            user: { id: user._id, username: user.username }
        });

    } catch(err){
        res.status(500).json({ message: err.message });
    }
});

// ADD ACTIVITY
app.post("/api/activity", auth, async (req, res) => {
    const { category, value } = req.body;

    const user = await User.findById(req.user.id);

    user.activities.push({ category, value });
    await user.save();

    res.json(user.activities);
});

// GET ACTIVITIES
app.get("/api/activity", auth, async (req, res) => {
    const user = await User.findById(req.user.id);
    res.json(user.activities);
});

// COMMUNITY
app.get("/api/users", async (req, res) => {
    const users = await User.find();
    res.json(users);
});

// START
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} 🚀`);
    console.log("MongoDB Atlas Connected ✅");
});