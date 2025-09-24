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
  host: process.env?.DB_HOST ? process.env.DB_HOST : "localhost",
};

// // This logic handles both local/IP connections and the more secure socket connection
// if (!!process.env.DB_SOCKET_PATH && process.env.DB_SOCKET_PATH !== "false") {
//   dbConfig.socketPath = process.env.DB_SOCKET_PATH;
// } else {
//   dbConfig.host = process.env.DB_HOST;
// }

const pool = mysql.createPool(dbConfig);

// const pool = mysql.createPool(
//   `mysql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
// );

// Export the pool so other files can use it
module.exports = pool;
