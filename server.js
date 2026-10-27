
require("dotenv").config();

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

const app = express();

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

const FRONTEND_ORIGIN =
    "https://pranitamandave2008.github.io";

const DATABASE_NAME = "AlumniConnect";

app.use(express.json({ limit: "20kb" }));

// CORS
app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin === FRONTEND_ORIGIN) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
        res.setHeader(
            "Access-Control-Allow-Methods",
            "GET, POST, OPTIONS"
        );
        res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization"
        );
    }

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});

const client = new MongoClient(MONGODB_URI || "");
let db;

// Authentication middleware
function requireAuth(req, res, next) {
    const authorization = req.headers.authorization || "";

    const token = authorization.startsWith("Bearer ")
        ? authorization.slice(7)
        : "";

    if (!token) {
        return res.status(401).json({
            message: "Please log in first."
        });
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({
            message: "Your login has expired. Please log in again."
        });
    }
}

// Rate limits
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        message: "Too many login attempts. Please try again later."
    }
});

const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        message: "Too many registration attempts. Try again later."
    }
});

// Password validation
function isValidPassword(password) {
    return (
        password.length >= 8 &&
        password.length <= 200 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9]/.test(password)
    );
}

// Basic status
app.get("/", (req, res) => {
    res.send("MIT AlumniConnect Backend is Running!");
});

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

// Test MongoDB
app.get("/test-db", async (req, res) => {
    try {
        await db.command({ ping: 1 });

        res.json({
            status: "connected",
            database: db.databaseName
        });
    } catch (error) {
        console.error("Database test failed:", error.message);

        res.status(500).json({
            message: "Database test failed."
        });
    }
});

// CREATE ACCOUNT
app.post(
    "/api/register",
    registerLimiter,
    async (req, res) => {
        try {
            const username = String(req.body.username || "")
                .trim()
                .toLowerCase();

            const email = String(req.body.email || "")
                .trim()
                .toLowerCase();

            const password = String(req.body.password || "");
            const confirmPassword = String(
                req.body.confirmPassword || ""
            );

            if (!/^[a-z0-9._]{3,20}$/.test(username)) {
                return res.status(400).json({
                    message:
                        "Username must be 3–20 characters using letters, numbers, dots, or underscores."
                });
            }

            if (!/^[a-z0-9._%+-]+@mit\.asia$/.test(email)) {
                return res.status(400).json({
                    message:
                        "Enter a valid email ending in @mit.asia."
                });
            }

            if (!isValidPassword(password)) {
                return res.status(400).json({
                    message:
                        "Password must have at least 8 characters, uppercase, lowercase, a number, and a special character."
                });
            }

            if (password !== confirmPassword) {
                return res.status(400).json({
                    message: "Passwords do not match."
                });
            }

            const users = db.collection("users");

            const existingUser = await users.findOne({
                $or: [
                    { email },
                    { username }
                ]
            });

            if (existingUser) {
                return res.status(409).json({
                    message:
                        "This email or username is already registered."
                });
            }

            const passwordHash = await bcrypt.hash(password, 12);

            await users.insertOne({
                username,
                email,
                passwordHash,
                role: "student",
                approved: true,
                mustChangePassword: false,
                createdAt: new Date()
            });

            return res.status(201).json({
                message:
                    "Account created successfully. You can now log in."
            });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({
                    message:
                        "This email or username is already registered."
                });
            }

            console.error("Registration failed:", error.message);

            return res.status(500).json({
                message: "Unable to create your account right now."
            });
        }
    }
);

// LOGIN USING USERNAME OR EMAIL
app.post("/api/login", loginLimiter, async (req, res) => {
    try {
        const identifier = String(
            req.body.identifier || req.body.email || ""
        ).trim().toLowerCase();

        const password = String(req.body.password || "");

        if (
            !identifier ||
            identifier.length > 254 ||
            !password ||
            password.length > 200
        ) {
            return res.status(400).json({
                message: "Enter your username/email and password."
            });
        }

        const user = await db.collection("users").findOne({
            $or: [
                { email: identifier },
                { username: identifier }
            ]
        });

        if (!user || !user.passwordHash) {
            return res.status(401).json({
                message: "Invalid username/email or password."
            });
        }

        if (user.approved !== true) {
            return res.status(403).json({
                message: "Your account has not been approved."
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Invalid username/email or password."
            });
        }

        const mustChangePassword =
            user.mustChangePassword === true;

        const token = jwt.sign(
            {
                sub: user._id.toString(),
                email: user.email,
                role: user.role || "student",
                mustChangePassword
            },
            JWT_SECRET,
            { expiresIn: "2h" }
        );

        return res.json({
            message: "Login successful.",
            token,
            username: user.username || "",
            mustChangePassword
        });
    } catch (error) {
        console.error("Login failed:", error.message);

        return res.status(500).json({
            message: "Unable to log in right now."
        });
    }
});

// CHANGE PASSWORD
app.post(
    "/api/change-password",
    requireAuth,
    async (req, res) => {
        try {
            const oldPassword = String(
                req.body.oldPassword || ""
            );

            const newPassword = String(
                req.body.newPassword || ""
            );

            if (!isValidPassword(newPassword)) {
                return res.status(400).json({
                    message:
                        "Password must have at least 8 characters, uppercase, lowercase, a number, and a special character."
                });
            }

            if (oldPassword === newPassword) {
                return res.status(400).json({
                    message:
                        "Your new password must be different from your current password."
                });
            }

            if (!ObjectId.isValid(req.user.sub)) {
                return res.status(401).json({
                    message: "Invalid account session."
                });
            }

            const users = db.collection("users");
            const userId = new ObjectId(req.user.sub);

            const user = await users.findOne({ _id: userId });

            if (!user || user.approved !== true) {
                return res.status(403).json({
                    message: "Your account is not approved."
                });
            }

            const oldPasswordMatches = await bcrypt.compare(
                oldPassword,
                user.passwordHash
            );

            if (!oldPasswordMatches) {
                return res.status(400).json({
                    message: "Current password is incorrect."
                });
            }

            const passwordHash = await bcrypt.hash(
                newPassword,
                12
            );

            await users.updateOne(
                { _id: userId },
                {
                    $set: {
                        passwordHash,
                        mustChangePassword: false,
                        passwordChangedAt: new Date()
                    }
                }
            );

            const token = jwt.sign(
                {
                    sub: user._id.toString(),
                    email: user.email,
                    role: user.role || "student",
                    mustChangePassword: false
                },
                JWT_SECRET,
                { expiresIn: "2h" }
            );

            return res.json({
                message: "Password changed successfully.",
                token,
                mustChangePassword: false
            });
        } catch (error) {
            console.error(
                "Password change failed:",
                error.message
            );

            return res.status(500).json({
                message: "Unable to change password right now."
            });
        }
    }
);

// PROTECTED ALUMNI DIRECTORY
app.get("/api/alumni", requireAuth, async (req, res) => {
    try {
        if (!ObjectId.isValid(req.user.sub)) {
            return res.status(401).json({
                message: "Invalid account session."
            });
        }

        const user = await db.collection("users").findOne(
            { _id: new ObjectId(req.user.sub) },
            {
                projection: {
                    approved: 1,
                    mustChangePassword: 1
                }
            }
        );

        if (!user || user.approved !== true) {
            return res.status(403).json({
                message: "Your account is not approved."
            });
        }

        if (user.mustChangePassword === true) {
            return res.status(403).json({
                message: "Change your password first."
            });
        }

        const alumni = await db.collection("alumni")
            .find({})
            .sort({ graduation_year: -1 })
            .toArray();

        return res.json(alumni);
    } catch (error) {
        console.error("Alumni query failed:", error.message);

        return res.status(500).json({
            message: "Unable to retrieve alumni records."
        });
    }
});

// START SERVER
async function startServer() {
    try {
        if (!MONGODB_URI) {
            throw new Error("MONGODB_URI is missing.");
        }

        if (!JWT_SECRET || JWT_SECRET.length < 32) {
            throw new Error(
                "JWT_SECRET must be at least 32 characters long."
            );
        }

        await client.connect();

        db = client.db(DATABASE_NAME);

        // Unique indexes prevent duplicate usernames/emails.
        await db.collection("users").createIndex(
            { email: 1 },
            { unique: true }
        );

        await db.collection("users").createIndex(
            { username: 1 },
            {
                unique: true,
                partialFilterExpression: {
                    username: { $type: "string" }
                }
            }
        );

        await db.command({ ping: 1 });

        console.log(
            `Connected to MongoDB database: ${db.databaseName}`
        );

        app.listen(PORT, "0.0.0.0", () => {
            console.log(
                `MIT AlumniConnect API listening on port ${PORT}`
            );
        });
    } catch (error) {
        console.error("Startup failed:", error.message);
        process.exit(1);
    }
}

startServer();
