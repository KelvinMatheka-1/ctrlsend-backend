const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const session = require("express-session");
const { v4: uuidv4 } = require("uuid");
const knex = require("knex");

const app = express();
const PORT = 5000; // Change this to the desired port number

// Knex configuration
const db = knex({
  client: "pg",
  connection: {
    host: "localhost",
    user: "kelvin",
    password: "Omarionconor2",
    database: "ctrlsend",
    port: 5432,
  },
});

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Test the database connection
db.raw("SELECT 1")
  .then(() => {
    console.log("Connected to PostgreSQL database!");
  })
  .catch((err) => {
    console.error("Error connecting to PostgreSQL:", err.message);
  });

// Set up session middleware
app.use(
  session({
    secret: uuidv4(), // Change this to a secure secret key
    resave: false,
    saveUninitialized: false,
  })
);

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
    const existingUser = await db("users").where("username", username).first();
    if (existingUser) {
      return res.status(409).json({ error: "User already exists." });
    }

    // Store the new user in the database
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await db("users")
      .insert({ username, email, password: hashedPassword })
      .returning("*");

    res.json(newUser[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while registering the user." });
  }
});

// User Login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await db("users").where("username", username).first();

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    // Save user information in the session after successful login
    req.session.user = {
      id: user.id,
      username: user.username,
      // Add any other user information you want to store in the session
    };

    res.json({ message: "Login successful.", username: user.username });
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

// Immediate Money Transfer
app.post("/api/immediate-transfer", async (req, res) => {
  const { sender, recipient, amount } = req.body;
  try {
    // Fetch sender and recipient users from the database
    const senderUser = await db("users").where("username", sender).first();
    const recipientUser = await db("users").where("username", recipient).first();

    if (!senderUser || !recipientUser) {
      return res.status(404).json({ error: "Sender or recipient not found." });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than zero." });
    }

    if (senderUser.immediate_balance < amount) {
      return res.status(403).json({ error: "Insufficient immediate funds." });
    }

    // Perform the immediate money transfer
    await db.transaction(async (trx) => {
      // Deduct amount from sender's immediate balance
      await db("users")
        .where("username", sender)
        .decrement("immediate_balance", amount)
        .transacting(trx);

      // Add amount to recipient's immediate balance
      await db("users")
        .where("username", recipient)
        .increment("immediate_balance", amount)
        .transacting(trx);

      // Insert a record into the transactions table
      await db("transactions").insert({
        sender_id: senderUser.id,
        recipient_id: recipientUser.id,
        amount,
      });
    });

    res.json({ message: "Immediate money transferred successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Locked Money Transfer
app.post("/api/transfer", async (req, res) => {
  const { sender, recipient, amount } = req.body;
  try {
    // Fetch sender and recipient users from the database
    const senderUser = await db("users").where("username", sender).first();
    const recipientUser = await db("users").where("username", recipient).first();

    if (!senderUser || !recipientUser) {
      return res.status(404).json({ error: "Sender or recipient not found." });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than zero." });
    }

    if (senderUser.locked_balance < amount) {
      return res.status(403).json({ error: "Insufficient locked funds." });
    }

    // Perform the money transfer
    await db.transaction(async (trx) => {
      // Deduct amount from sender's locked balance
      await db("users")
        .where("username", sender)
        .decrement("locked_balance", amount)
        .transacting(trx);

      // Add amount to recipient's locked balance
      await db("users")
        .where("username", recipient)
        .increment("locked_balance", amount)
        .transacting(trx);

      // Insert a record into the transactions table
      await db("transactions").insert({
        sender_id: senderUser.id,
        recipient_id: recipientUser.id,
        amount,
      });
    });

    res.json({ message: "Money transferred successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Withdrawal request for immediate funds
app.post("/api/withdraw-immediate-funds", async (req, res) => {
  const { username, amount } = req.body;
  try {
    // Check if the user exists in the database
    const user = await db("users").where("username", username).first();

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (amount <= 0) {
      return res
        .status(400)
        .json({ error: "Withdrawal amount must be greater than zero." });
    }

    if (user.immediate_balance < amount) {
      return res.status(403).json({ error: "Insufficient immediate funds." });
    }

    // Store the withdrawal request in the database
    await db("withdrawal_requests").insert({
      user_id: user.id,
      amount,
      is_approved: true,
    });

    // Deduct the requested amount from the user's immediate balance
    await db("users").where("username", username).decrement("immediate_balance", amount);

    res.json({ message: "Withdrawal request for immediate funds sent successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Locked withdrawal request
app.post("/api/withdraw", async (req, res) => {
  const { username, amount } = req.body;
  try {
    // Check if the recipient exists in the database
    const recipientUser = await db("users").where("username", username).first();
    if (!recipientUser) {
      return res.status(404).json({ error: "Recipient not found." });
    }

    if (amount <= 0) {
      return res
        .status(400)
        .json({ error: "Withdrawal amount must be greater than zero." });
    }

    // Store the withdrawal request in the database
    // Set the sender_id to the currently authenticated user's id
    await db("withdrawal_requests").insert({
      user_id: recipientUser.id,
      sender_id: req.session.user.id,
      amount,
    });

    res.json({ message: "Withdrawal request sent successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Sender approval
app.patch("/api/approve-withdrawal/:requestId", async (req, res) => {
  const { requestId } = req.params;
  try {
    // Check if the request exists
    const request = await db("withdrawal_requests").where("id", requestId).first();

    if (!request) {
      return res.status(404).json({ error: "Withdrawal request not found." });
    }

    // Check if the sender is authorized to approve the request
    if (request.sender_id !== req.session.user.id) {
      return res
        .status(403)
        .json({ error: "You are not authorized to approve this request." });
    }

    // Check if the request is already approved
    if (request.is_approved) {
      return res.status(400).json({ error: "Request is already approved." });
    }

    // Update the status to 'approved'
    await db("withdrawal_requests").where("id", requestId).update({
      is_approved: true,
    });

    // Get the requested amount from the withdrawal request
    const requestedAmount = request.amount;

    // Get the sender user's locked balance
    const senderUser = await db("users")
      .where("id", request.sender_id)
      .select("locked_balance")
      .first();

    if (!senderUser) {
      return res.status(404).json({ error: "User not found." });
    }

    // Check if the sender has enough locked balance to approve the withdrawal
    if (senderUser.locked_balance < requestedAmount) {
      return res.status(403).json({ error: "Insufficient locked funds." });
    }

    // Deduct the requested amount from the sender's locked balance
    await db("users")
      .where("id", request.sender_id)
      .decrement("locked_balance", requestedAmount);

    // Update the status of the withdrawal request to 'approved'
    await db("withdrawal_requests").where("id", requestId).update({
      status: "approved",
    });

    res.json({ message: "Withdrawal request approved successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});


// Reject the request
app.patch("/api/reject-withdrawal/:requestId", async (req, res) => {
  const { requestId } = req.params;
  try {
    // Check if the request exists
    const request = await db("withdrawal_requests").where("id", requestId).first();

    if (!request) {
      return res.status(404).json({ error: "Withdrawal request not found." });
    }

    // Check if the sender is authorized to reject the request
    if (request.user_id !== req.session.user.id) {
      return res
        .status(403)
        .json({ error: "You are not authorized to reject this request." });
    }

    // Update the status to 'rejected'
    await db("withdrawal_requests").where("id", requestId).update({
      status: "rejected",
    });

    res.json({ message: "Withdrawal request rejected successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Get All Users
app.get("/api/users", async (req, res) => {
  try {
    const users = await db("users").select("*");
    res.json(users);
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
    const requests = await db("withdrawal_requests").select("*");
    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Get all transactions
app.get("/api/transactions", async (req, res) => {
  try {
    // Retrieve all transactions from the database
    const transactions = await db("transactions").select("*");
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Delete User Account and Related Data
app.delete("/api/users/:userId", requireAuth, async (req, res) => {
  const userId = req.params.userId;

  try {
    // Check if the user exists in the database
    const user = await db("users").where("id", userId).first();

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Perform cleanup of related data
    await db.transaction(async (trx) => {
      // Delete transactions associated with the user
      await db("transactions").where("sender_id", userId).orWhere("recipient_id", userId).del().transacting(trx);

      // Delete withdrawal requests associated with the user
      await db("withdrawal_requests").where("user_id", userId).del().transacting(trx);

      // Delete the user
      await db("users").where("id", userId).del().transacting(trx);
    });

    res.json({ message: "User account and related data deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
