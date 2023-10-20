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
    host: "db.yhnevhdrvsbdnhgseple.supabase.co",
    user: "postgres",
    password: "Omarionconor321*",
    database: "postgres",
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

    // Get the hashed password from database
  const hashedPassword = user.password;

  // Use bcrypt to compare with original input password
  const passwordsMatch = await bcrypt.compare(password, hashedPassword);

  if(!passwordsMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
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


// Immediate Money Transfer
app.post("/api/immediate-transfer", requireAuth, async (req, res) => {
  const { recipient, amount } = req.body;
  try {
    // Fetch recipient user from the database
    const recipientUser = await db("users").where("username", recipient).first();

    if (!recipientUser) {
      return res.status(404).json({ error: "Recipient not found." });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than zero." });
    }

    // Check if the sender has enough immediate balance to make the transfer
    const senderUser = await db("users")
      .where("id", req.session.user.id)
      .first();

    if (!senderUser) {
      return res.status(404).json({ error: "Sender not found." });
    }

    if (senderUser.immediate_balance < amount) {
      return res.status(403).json({ error: "Insufficient immediate funds." });
    }

    // Check if the sender is trying to transfer from their own account
    if (recipientUser.id === req.session.user.id) {
      return res
        .status(403)
        .json({ error: "You cannot transfer funds to your own account." });
    }

    // Perform the immediate money transfer
    await db.transaction(async (trx) => {
      // Deduct amount from sender's immediate balance
      await db("users")
        .where("id", req.session.user.id)
        .decrement("immediate_balance", amount)
        .transacting(trx);

      // Add amount to recipient's immediate balance
      await db("users")
        .where("id", recipientUser.id)
        .increment("immediate_balance", amount)
        .transacting(trx);

      // Insert a record into the transactions table
      await db("transactions").insert({
        sender_id: req.session.user.id,
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
app.post("/api/transfer", requireAuth, async (req, res) => {
  const { recipient, amount } = req.body;
  try {
    // Fetch recipient user from the database
    const recipientUser = await db("users").where("username", recipient).first();

    if (!recipientUser) {
      return res.status(404).json({ error: "Recipient not found." });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than zero." });
    }

    // Check if the sender has enough locked balance to make the transfer
    const senderUser = await db("users")
      .where("id", req.session.user.id)
      .first();

    if (!senderUser) {
      return res.status(404).json({ error: "Sender not found." });
    }

    if (senderUser.locked_balance < amount) {
      return res.status(403).json({ error: "Insufficient locked funds." });
    }

    // Check if the sender is trying to transfer from their own account
    if (recipientUser.id === req.session.user.id) {
      return res
        .status(403)
        .json({ error: "You cannot transfer funds to your own account." });
    }

    // Perform the money transfer
    await db.transaction(async (trx) => {
      // Deduct amount from sender's locked balance
      await db("users")
        .where("id", req.session.user.id)
        .decrement("locked_balance", amount)
        .transacting(trx);

      // Add amount to recipient's locked balance
      await db("users")
        .where("id", recipientUser.id)
        .increment("locked_balance", amount)
        .transacting(trx);

      // Insert a record into the transactions table
      await db("transactions").insert({
        sender_id: req.session.user.id,
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
app.post("/api/withdraw-immediate-funds", requireAuth, async (req, res) => {
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

    // Ensure that the logged-in user is the same as the user trying to withdraw funds
    if (req.session.user.username !== username) {
      return res.status(403).json({ error: "You are not authorized to withdraw funds for this user." });
    }

    // Store the withdrawal request in the database
    // await db("withdrawal_requests").insert({
    //   user_id: user.id,
    //   amount,
    //   is_approved: true,
    // });

    // Deduct the requested amount from the user's immediate balance
    await db("users").where("username", username).decrement("immediate_balance", amount);

    res.json({ message: "Withdrawal request for immediate funds sent successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});


// Locked withdrawal request
app.post("/api/withdraw", requireAuth, async (req, res) => {
  const { username, amount } = req.body;
  try {
    // Fetch recipient user from the database
    const recipientUser = await db("users").where("username", username).first();
    const senderUser = await db("users").where("id", req.session.user.id).first();

    if (!recipientUser) {
      return res.status(404).json({ error: "Recipient not found." });
    }

    if (amount <= 0) {
      return res
        .status(400)
        .json({ error: "Withdrawal amount must be greater than zero." });
    }

    // Check if the sender and recipient are the same as the logged-in user
    if (req.session.user.username !== username) {
      return res.status(403).json({ error: "You are not authorized to withdraw funds for this user." });
    }

    // Perform the withdrawal request
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

// Sender approval for withdrawal request
app.post("/api/approve-withdrawal/:requestId", requireAuth, async (req, res) => {
  const { requestId } = req.params;
  try {
    // Fetch the withdrawal request from the database
    const request = await db("withdrawal_requests")
      .where("id", requestId)
      .first();

    if (!request) {
      return res.status(404).json({ error: "Withdrawal request not found." });
    }

    // Check if the currently logged-in user is the sender of the money
    if (req.session.user.id !== request.sender_id) {
      return res.status(403).json({ error: "Only sender can approve" });
    }

    // Check if the request is already approved
    if (request.is_approved) {
      return res.status(400).json({ error: "The request is already approved." });
    }

    // Update the status to 'approved'
    await db("withdrawal_requests").where("id", requestId).update({
      is_approved: true,
    });

    // Deduct the approved amount from the user's locked balance
    await db("users")
      .where("id", request.user_id)
      .decrement("locked_balance", request.amount);

    // Add the approved amount to the user's immediate balance
    await db("users")
      .where("id", request.user_id)
      .increment("immediate_balance", request.amount);

    res.json({ message: "Withdrawal request approved successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Reverse transaction
app.post("/api/reverse-transaction/:transactionId", requireAuth, async (req, res) => {
  const { transactionId } = req.params;

  try {
    // Fetch the transaction from the database
    const transaction = await db("transactions").where("id", transactionId).first();

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found." });
    }

    // Check if the transaction has already been reversed
    if (transaction.is_reversed) {
      return res.status(400).json({ error: "Transaction is already reversed." });
    }

    // Ensure the currently logged-in user is the sender of the transaction
    if (req.session.user.id !== transaction.sender_id) {
      return res.status(403).json({ error: "You are not authorized to reverse this transaction." });
    }

    // Perform the reversal
    await db.transaction(async (trx) => {
      // Mark the transaction as reversed
      await db("transactions").where("id", transactionId).update({
        is_reversed: true,
      });

      // Deduct the transaction amount from the recipient's locked balance
      await db("users")
      .where("id", transaction.recipient_id)
      .decrement("locked_balance", transaction.amount)
      .transacting(trx);

      // Add the transaction amount back to the sender's locked balance
      await db("users")
        .where("id", transaction.sender_id)
        .increment("locked_balance", transaction.amount)
        .transacting(trx);
    });

    res.json({ message: "Transaction reversed successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});


// Reject the request
app.patch("/api/reject-withdrawal/:requestId", requireAuth, async (req, res) => {
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
