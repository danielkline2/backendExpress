// db.js - Your database connection file

const mysql = require("mysql2");

// Create a connection pool. This is much better for servers than createConnection.

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  socketPath: process.env?.DB_SOCKET_PATH,
};

// This logic handles both local/IP connections and the more secure socket connection
if (!process.env.DB_SOCKET_PATH) {
  dbConfig.host = process.env.DB_HOST;
} else {
}

const pool = mysql.createPool(dbConfig);

// Export the pool so other files can use it
module.exports = pool;
