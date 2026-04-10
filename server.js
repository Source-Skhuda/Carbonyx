require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const User = require("./user");

const app = express();

// MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ROOT
app.get("/", (req,res)=>{
    res.sendFile(path.join(__dirname, "index.html"));
});

// CONNECT DB
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB Connected ✅"))
.catch(err=>console.log(err));

// AUTH
function auth(req,res,next){
    const token = req.headers.authorization;
    if(!token) return res.status(401).json({message:"No token"});

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }catch{
        res.status(400).json({message:"Invalid token"});
    }
}

// REGISTER
app.post("/api/register", async (req,res)=>{
    const {username,password} = req.body;

    const exists = await User.findOne({username});
    if(exists) return res.status(400).json({message:"User exists"});

    const hashed = await bcrypt.hash(password,10);

    const user = new User({username,password:hashed,activities:[]});
    await user.save();

    res.json({message:"Registered successfully"});
});

// LOGIN
app.post("/api/login", async (req,res)=>{
    const {username,password} = req.body;

    const user = await User.findOne({username});
    if(!user) return res.status(400).json({message:"User not found"});

    const valid = await bcrypt.compare(password,user.password);
    if(!valid) return res.status(400).json({message:"Wrong password"});

    const token = jwt.sign({id:user._id}, process.env.JWT_SECRET);

    res.json({
        token,
        user:{id:user._id, username:user.username}
    });
});

// ADD ACTIVITY
app.post("/api/activity", auth, async (req,res)=>{
    const {category,value} = req.body;

    const user = await User.findById(req.user.id);
    user.activities.push({category,value});
    await user.save();

    res.json(user.activities);
});

// GET ACTIVITY
app.get("/api/activity", auth, async (req,res)=>{
    const user = await User.findById(req.user.id);
    res.json(user.activities);
});

// STATS
app.get("/api/stats", auth, async (req,res)=>{
    const user = await User.findById(req.user.id);

    let total=0, weekly=0;
    let catSum={transport:0,food:0,energy:0};
    const today=new Date();

    user.activities.forEach(a=>{
        total+=a.value;

        const d=new Date(a.date);
        if((today-d)/(1000*60*60*24)<=7) weekly+=a.value;

        catSum[a.category]+=a.value;
    });

    const users = await User.find();
    let communityTotal=0;

    users.forEach(u=>{
        u.activities.forEach(a=>communityTotal+=a.value);
    });

    const avg = users.length ? communityTotal/users.length : 0;

    res.json({total,weekly,catSum,communityAvg:avg});
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, ()=>console.log("Server running 🚀"));