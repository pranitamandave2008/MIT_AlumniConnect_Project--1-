
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

// CORS: allow the GitHub Pages frontend.
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

// Verify the JWT token sent by the frontend.
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

// Limit repeated login attempts.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        message: "Too many login attempts. Please try again later."
    }
});

// Basic backend status.
app.get("/", (req, res) => {
    res.send("MIT AlumniConnect Backend is Running!");
});

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

// Test the MongoDB connection.
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
            error: "Database test failed"
        });
    }
});

// Login with an approved college account.
app.post("/api/login", loginLimiter, async (req, res) => {
    try {
        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();

        const password = String(req.body.password || "");

        if (
            !/^[a-z0-9._%+-]+@mit\.asia$/.test(email) ||
            !password ||
            password.length > 200
        ) {
            return res.status(400).json({
                message: "Enter a valid college email and password."
            });
        }

        const user = await db.collection("users").findOne({ email });

        if (!user || !user.passwordHash) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        if (user.approved !== true) {
            return res.status(403).json({
                message: "Your account has not been approved by an admin."
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Invalid email or password."
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
            mustChangePassword
        });
    } catch (error) {
        console.error("Login failed:", error.message);

        return res.status(500).json({
            message: "Unable to log in right now."
        });
    }
});

// Change the temporary password.
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

            if (
                newPassword.length < 10 ||
                newPassword.length > 200 ||
                !/[a-z]/.test(newPassword) ||
                !/[A-Z]/.test(newPassword) ||
                !/[0-9]/.test(newPassword)
            ) {
                return res.status(400).json({
                    message:
                        "Use at least 10 characters, including uppercase, lowercase, and a number."
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
                    message: "Invalid account session. Please log in again."
                });
            }

            const userId = new ObjectId(req.user.sub);
            const users = db.collection("users");

            const user = await users.findOne({
                _id: userId
            });

            if (!user) {
                return res.status(401).json({
                    message: "Account not found."
                });
            }

            if (user.approved !== true) {
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

            // Return a fresh token with the password-change flag cleared.
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

// Protect the existing alumni collection.
app.get("/api/alumni", requireAuth, async (req, res) => {
    try {
        // Check the current database state as well as the JWT.
        if (!ObjectId.isValid(req.user.sub)) {
            return res.status(401).json({
                message: "Invalid account session. Please log in again."
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
                message: "Change your temporary password first."
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
            error: "Unable to retrieve alumni records"
        });
    }
});

// Start the backend.
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

        // Explicitly use the same database as create-user.js.
        db = client.db(DATABASE_NAME);

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
