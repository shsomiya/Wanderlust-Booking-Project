// Require
require('dotenv').config();

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const MongoStore = require("connect-mongo");
const flash = require('connect-flash');
const passport = require("passport");
const LocalStrategy = require("passport-local");
const expressLayouts = require('express-ejs-layouts');
const multer = require('multer');

// Models and Routes
const User = require('./models/user');
const Listing = require("./models/listing.js");
const Review = require("./models/review.js");

const listings = require("./routes/listing.js");
const reviews = require("./routes/reviews.js");
const userRouter = require("./routes/user.js");

// MongoDB
const ATLASDBURL = process.env.MONGO_URI;

// View Engine and Middleware Setup
app.engine('ejs', ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, "public")));
app.use(expressLayouts);
app.set('layout', 'layout/boilerplate');

// Session Store
const store = MongoStore.create({
    mongoUrl: ATLASDBURL,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});

store.on("error", (err) => {
    console.log("MongoStore Error:", err);
});

// Session and Flash
app.use(session({
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true
    }
}));
app.use(flash());

// Passport Config
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Global Flash Variables
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.curruser = req.user;
    next();
});

// Home Route — place this before using userRouter!
app.get("/", (req, res) => {
    res.render("listing/main.ejs");
});


// Routes
app.use("/listing", listings);
app.use("/listing/:id/review", reviews);
app.use("/", userRouter);  // This might also handle `/` routes like login/register

// Error Handling
app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something went wrong" } = err;
    res.status(statusCode).render("listing/error.ejs", { err });
});

// MongoDB Connection
async function main() {
    try {
        await mongoose.connect(ATLASDBURL, {
            tls: true,
            serverSelectionTimeoutMS: 5000
        });
        console.log("✅ Connected to MongoDB");
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err);
    }
}
main();

// Start Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
