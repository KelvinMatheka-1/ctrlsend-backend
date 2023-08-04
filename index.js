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
