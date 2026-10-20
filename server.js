
const express = require("express");
const mysql = require("mysql2");

const app = express();
const PORT = 3000;

app.use(express.json());

// ADD THIS LINE HERE
app.use(express.static("public"));

// Connect to the local MySQL database
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "mit_alumniconnect",
    port: 3306
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err.message);
        return;
    }

    console.log("MySQL connected successfully!");
});

// Test route
app.get("/", (req, res) => {
    res.send("MIT AlumniConnect Backend is Running!");
});

// Test database route
app.get("/test-db", (req, res) => {
    db.query("SELECT DATABASE() AS databaseName", (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json(results[0]);
    });
});

// NEW: Get all alumni
app.get("/api/alumni", (req, res) => {
    const sql = "SELECT * FROM alumni ORDER BY graduation_year DESC";

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json(results);
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
