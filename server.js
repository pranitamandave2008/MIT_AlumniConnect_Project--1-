
require("dotenv").config();

const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(express.json());
app.use(express.static("public"));

// Allow your GitHub Pages frontend
const allowedOrigin = "https://pranitamandave2008.github.io";

app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin === allowedOrigin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
        res.setHeader(
            "Access-Control-Allow-Methods",
            "GET, POST, PUT, DELETE, OPTIONS"
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

app.get("/", (req, res) => {
    res.send("MIT AlumniConnect Backend is Running!");
});

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.get("/test-db", async (req, res) => {
    try {
        await db.command({ ping: 1 });

        res.json({
            status: "connected",
            database: db.databaseName
        });
    } catch (error) {
        console.error("MongoDB test failed:", error.message);

        res.status(500).json({
            error: "MongoDB connection test failed"
        });
    }
});

// Temporary login endpoint — authentication not implemented yet
app.post("/api/login", (req, res) => {
    return res.status(501).json({
        message:
            "Login endpoint found, but authentication is not implemented yet."
    });
});

// Existing alumni directory endpoint — unchanged
app.get("/api/alumni", async (req, res) => {
    try {
        const alumni = await db
            .collection("alumni")
            .find({})
            .sort({ graduation_year: -1 })
            .toArray();

        res.json(alumni);
    } catch (error) {
        console.error("Alumni query failed:", error.message);

        res.status(500).json({
            error: "Unable to retrieve alumni records"
        });
    }
});

// Connect to MongoDB BEFORE starting Express
async function startServer() {
    try {
        if (!MONGODB_URI) {
            throw new Error("MONGODB_URI is missing");
        }

        await client.connect();
        db = client.db();

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
