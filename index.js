const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = 5000; // Change this to the desired port number

require("dotenv").config();

// Create a new Pool instance for database connection
const pool = new Pool({
  user: process.env.PG_USERNAME, // Replace with your PostgreSQL username
  password: process.env.PG_PASSWORD, // Replace with your PostgreSQL password
  host: "localhost", // Replace with your PostgreSQL server address if it's not running locally
  database: "p2p_money_transfer", // Replace with the name of your PostgreSQL database
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
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Please provide both username and password." });
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
    await pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", [
      username,
      password,
    ]);

    res.json({ message: "User registered successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// User Login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await pool.query(
      "SELECT * FROM users WHERE username = $1 AND password = $2",
      [username, password]
    );
    if (user.rowCount === 0) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    res.json({ message: "Login successful.", username: user.rows[0].username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Money Transfer
app.post("/api/transfer", async (req, res) => {
  const { sender, recipient, amount } = req.body;
  try {
    const senderUser = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [sender]
    );
    const recipientUser = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [recipient]
    );

    if (senderUser.rowCount === 0 || recipientUser.rowCount === 0) {
      return res.status(404).json({ error: "Sender or recipient not found." });
    }

    if (amount <= 0) {
      return res
        .status(400)
        .json({ error: "Amount must be greater than zero." });
    }

    if (senderUser.rows[0].balance < amount) {
      return res.status(403).json({ error: "Insufficient funds." });
    }

    // Perform the money transfer
    await pool.query(
      "UPDATE users SET balance = balance - $1 WHERE username = $2",
      [amount, sender]
    );
    await pool.query(
      "UPDATE users SET balance = balance + $1 WHERE username = $2",
      [amount, recipient]
    );

    res.json({ message: "Money transferred successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
