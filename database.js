const mysql = require("mysql2");

const DEV = process.env.DEV === "true"; // Convert string 'true' to boolean

const pool = require("./db");

// const connection = mysql.createConnection(
//   "mysql://root:mysqlmysql@localhost:3306"
// );

function createDeviceIdTable() {
  const sql = `CREATE TABLE IF NOT EXISTS deviceIDs (
      id INT AUTO_INCREMENT PRIMARY KEY, 
      deviceId TEXT);`;

  pool.getConnection(function (err, connection) {
    if (err instanceof Error) {
      console.log(err);
      return;
    }
    connection.query(sql, (err, res) => {
      if (err) {
        console.log("error creating table: ", err);
      } else {
        console.log("table made successfully");
      }
    });
    // ... some query

    connection.release();
  });
}

module.exports = createDeviceIdTable;
