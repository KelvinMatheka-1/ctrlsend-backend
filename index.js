// index.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const PORT = 5000; // Change this to the desired port number

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

let users = [];

// API Endpoints
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Please provide both username and password.' });
  }

  // Check if the user already exists
  if (users.some((user) => user.username === username)) {
    return res.status(409).json({ error: 'User already exists.' });
  }

  // Store the new user in the in-memory data
  users.push({ username, password, balance: 0 });
  res.json({ message: 'User registered successfully.' });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find((user) => user.username === username && user.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  res.json({ message: 'Login successful.', username: user.username });
});

app.post('/api/transfer', (req, res) => {
  const { sender, recipient, amount } = req.body;
  const senderUser = users.find((user) => user.username === sender);
  const recipientUser = users.find((user) => user.username === recipient);
  
  if (!senderUser || !recipientUser) {
    return res.status(404).json({ error: 'Sender or recipient not found.' });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than zero.' });
  }

  if (senderUser.balance < amount) {
    return res.status(403).json({ error: 'Insufficient funds.' });
  }

  senderUser.balance -= amount;
  recipientUser.balance += amount;

  res.json({ message: 'Money transferred successfully.' });
});