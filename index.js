const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 5000; // Change this to the desired port number

// require("dotenv").config();

// Create a new Pool instance for database connection
const pool = new Pool({
  user: "kelvin", // Replace with your PostgreSQL username
  password: "Omarionconor2", // Replace with your PostgreSQL password
  host: "localhost", // Replace with your PostgreSQL server address if it's not running locally
  database: "ctrlsend", // Replace with the name of your PostgreSQL database
  port: 5432, // Change this if your PostgreSQL server uses a different port
});

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Test the database connection
pool.connect((err, client, done) => {
  if (err) {
    console.error("Error connecting to PostgreSQL:", err.message);
  } else {
    console.log("Connected to PostgreSQL database!");
    // Release the client when the app is shut down or when an error occurs
    done();
  }
});

// User Registration
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ error: "Please provide username, email, and password." });
  }

  try {
    // Check if the user already exists in the database
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    if (existingUser.rowCount > 0) {
      return res.status(409).json({ error: "User already exists." });
    }

    // Store the new user in the database
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
      [username, email, hashedPassword]
    );

    res.json(newUser.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while registering the user." });
  }
});

// User Login
// ... (your existing login code) ...

// Money Transfer
// ... (your existing money transfer code) ...

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
