// db.js - Your database connection file

const mysql = require("mysql2");
// const fs = require("fs");
const path = require("path");

// Create a connection pool. This is much better for servers than createConnection.

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    ca: process.env.SERVER_CA,
  },
};

// This logic handles both local/IP connections and the more secure socket connection
if (process.env.DB_SOCKET_PATH === "false") {
  dbConfig.host = process.env.DB_HOST;
} else {
  dbConfig.socketPath = process.env.DB_SOCKET_PATH;
}

let pool;
try {
  pool = mysql.createPool(dbConfig);
  // Test connection immediately
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error connecting to MySQL pool:", err);
    } else {
      console.log("MySQL pool created and connection successful.");
      connection.release();
    }
  });
} catch (err) {
  console.error("Exception during pool creation:", err);
}

// Export the pool so other files can use it
module.exports = pool;
