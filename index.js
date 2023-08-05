const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const session = require("express-session");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 5000; // Change this to the desired port number

// require("dotenv").config();

// Authentication Middleware
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res
      .status(401)
      .json({ error: "Unauthorized. User not authenticated." });
  }
  // User is authenticated, proceed to the next middleware or route handler
  next();
}

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


// Set up session middleware
app.use(
  session({
    secret: uuidv4(), // Change this to a secure secret key
    resave: false,
    saveUninitialized: false,
  })
);

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
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
      [username, email, hashedPassword]
    );

    res.json(newUser.rows[0]);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while registering the user." });
  }
});

// User Login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    if (user.rowCount === 0) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.rows[0].password
    );
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    // Save user information in the session after successful login
    req.session.user = {
      id: user.rows[0].id,
      username: user.rows[0].username,
      // Add any other user information you want to store in the session
    };

    res.json({ message: "Login successful.", username: user.rows[0].username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// User Logout
app.post("/api/logout", (req, res) => {
  // Clear the user session to log the user out
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
    }
    res.json({ message: "Logged out successfully." });
  });
});

// Protected route example
app.get("/api/protected", requireAuth, (req, res) => {
  // The user is authenticated, handle the protected route logic here
  const user = req.session.user;
  res.json({ message: "This is a protected route." });
});

// Money Transfer
app.post("/api/transfer", async (req, res) => {
  const { sender, recipient, amount } = req.body;
  try {
    // Fetch sender and recipient users from the database
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
    await pool.query("BEGIN"); // Start a transaction
    await pool.query(
      "UPDATE users SET balance = balance - $1 WHERE username = $2",
      [amount, sender]
    );
    await pool.query(
      "UPDATE users SET balance = balance + $1 WHERE username = $2",
      [amount, recipient]
    );

    // Insert a record into the transactions table
    await pool.query(
      "INSERT INTO transactions (sender_id, recipient_id, amount) VALUES ($1, $2, $3)",
      [senderUser.rows[0].id, recipientUser.rows[0].id, amount]
    );

    await pool.query("COMMIT"); // Commit the transaction

    res.json({ message: "Money transferred successfully." });
  } catch (error) {
    await pool.query("ROLLBACK"); // Rollback the transaction on error
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

//withdrawal request
app.post("/api/withdraw", async (req, res) => {
  const { username, amount } = req.body;
  try {
    // Check if the recipient exists in the database
    const recipientUser = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    if (recipientUser.rowCount === 0) {
      return res.status(404).json({ error: "Recipient not found." });
    }

    if (amount <= 0) {
      return res
        .status(400)
        .json({ error: "Withdrawal amount must be greater than zero." });
    }

    // Store the withdrawal request in the database
    await pool.query(
      "INSERT INTO withdrawal_requests (user_id, amount) VALUES ($1, $2)",
      [recipientUser.rows[0].id, amount]
    );

    res.json({ message: "Withdrawal request sent successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

//sender approval

app.patch("/api/approve-withdrawal/:requestId", async (req, res) => {
  // if (!req.user || !req.user.id) {
  //   return res.status(401).json({ error: "Unauthorized. User not authenticated." });
  // }

  const { requestId } = req.params;
  try {
    // Check if the request exists
    const request = await pool.query(
      "SELECT * FROM withdrawal_requests WHERE id = $1",
      [requestId]
    );

    if (request.rowCount === 0) {
      return res.status(404).json({ error: "Withdrawal request not found." });
    }

    // Check if the sender is the owner of the request
    const sender = await pool.query("SELECT * FROM users WHERE id = $1", [
      req.user.id,
    ]);

    if (sender.rowCount === 0) {
      return res.status(404).json({ error: "Sender not found." });
    }

    // Check if the sender is authorized to approve the request
    if (request.rows[0].user_id !== req.user.id) {
      return res
        .status(403)
        .json({ error: "You are not authorized to approve this request." });
    }

    // Update the status to 'approved'
    await pool.query(
      "UPDATE withdrawal_requests SET is_approved = true WHERE id = $1",
      [requestId]
    );

    res.json({ message: "Withdrawal request approved successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

//Reject the request

app.patch("/api/reject-withdrawal/:requestId", async (req, res) => {
  const { requestId } = req.params;
  try {
    // Check if the request exists
    const request = await pool.query(
      "SELECT * FROM withdrawal_requests WHERE id = $1",
      [requestId]
    );

    if (request.rowCount === 0) {
      return res.status(404).json({ error: "Withdrawal request not found." });
    }

    // Check if the sender is the owner of the request
    const sender = await pool.query("SELECT * FROM users WHERE username = $1", [
      request.rows[0].sender,
    ]);

    if (sender.rowCount === 0) {
      return res.status(404).json({ error: "Sender not found." });
    }

    if (sender.rows[0].id !== req.user.id) {
      return res
        .status(403)
        .json({ error: "You are not authorized to reject this request." });
    }

    // Update the status to 'rejected'
    await pool.query(
      "UPDATE withdrawal_requests SET status = 'rejected' WHERE id = $1",
      [requestId]
    );

    res.json({ message: "Withdrawal request rejected successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

//get methods

// Get All Users
app.get("/api/users", async (req, res) => {
  try {
    const users = await pool.query("SELECT * FROM users");
    res.json(users.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Get the currently logged-in user
app.get("/api/current-user", requireAuth, (req, res) => {
  // The user is authenticated, so req.session.user should contain the user information
  const user = req.session.user;

  // Return the user information as a JSON response
  res.json({ user });
});

// Get all withdrawal requests
app.get("/api/withdrawal-requests", async (req, res) => {
  try {
    // Retrieve all withdrawal requests from the database
    const requests = await pool.query("SELECT * FROM withdrawal_requests");

    res.json(requests.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Get all transactions
app.get("/api/transactions", async (req, res) => {
  try {
    // Retrieve all transactions from the database
    const transactions = await pool.query("SELECT * FROM transactions");

    res.json(transactions.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
