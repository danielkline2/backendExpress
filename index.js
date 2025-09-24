// Load environment variables in development

//if (true) {
if (false) {
  require("dotenv").config();
}
// Import required modules

// anything

const cors = require("cors"); // Best practice for APIs
// 1. Import the Express library
const express = require("express");
const helmet = require("helmet");

const createDeviceIdTable = require("./database");

const bodyParser = require("body-parser");

const { rateLimit } = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: "draft-7", // draft-6: RateLimit-* headers; draft-7: combined RateLimit header
  legacyHeaders: false, // X-RateLimit-* headers
  // store: ... , // Use an external store for more precise rate limiting
});

// Apply the rate limiting middleware to all requests

const pool = require("./db"); // Import the pool from your setup file

// 2. Create an instance of an Express application
const app = express();

// Use middleware
app.use(helmet());
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Middleware to parse JSON bodies
app.use(bodyParser.json());
app.use(limiter);
createDeviceIdTable();

// Load API keys from environment variables
const API_KEY_GOOGLE = process.env.GOOGLE_API_KEY;
const DEV = process.env.DEV === "true"; // Convert string 'true' to boolean

// Check if the required environment variables are set
if (!API_KEY_GOOGLE) {
  console.error("Error: 'GOOGLE_API_KEY1' environment variable not found.");
  console.error(
    "Please set them using a .env file or your hosting provider's settings."
  );
  process.exit(1); // Exit the process with an error code
}

// 3. Define the port the server will run on
// Uses the host's suggested port, or 3000 for local development
const port = process.env.PORT || 8080;

app.get("/api/get_key_g", (req, res) => {
  /**
   * Returns the Google API key as a JSON response.
   */
  try {
    // Equivalent security check for a client header
    const clientHeader = req.get("X-Client-Id");
    const clientKey = req.get("X-Phone-Id");

    try {
      const sql = "SELECT * FROM devDb.deviceIDs WHERE deviceId = ? LIMIT 1";

      // execute will internally call prepare and query
      pool.query(sql, [clientKey], function (err, results, fields) {
        if (err) {
          console.log("Database error in checkKey: ", err);
        }
        console.log("results: ", results); // results contains rows returned by server
        console.log("results?.length == 0: ", results?.length == 0);
        console.log("fields: ", fields); // fields contains extra meta data about results, if available

        // return results?.length > 0;

        if (
          (clientHeader && clientHeader !== "your-app-specific-client-id") ||
          results?.length == 0
        ) {
          // Uncomment the line below to enforce the check in production
          return res.status(403).json({ error: "Unauthorized access" });
        }

        return res.status(200).json({
          success: true,
          api_key: API_KEY_GOOGLE,
        });

        // If you execute same statement again, it will be picked from a LRU cache
        // which will save query preparation time and give better performance
      });
    } catch (err) {
      console.error("Database error in checkKey 2:", err);
      return false; // Always return false if an error occurs
    }

    // Return the key in a JSON object
    console.log("hit");
  } catch (error) {
    // Generic error handling
    console.error(`An error occurred: ${error}`);
    return res.status(500).json({
      success: false,
      error: "An internal server error occurred.",
    });
  }
});

app.post("/start/set_key", (req, res) => {
  console.log("hit");
  const keyObject = req.body;
  const key = keyObject?.startKey;
  let isKeyCheck;

  //   console.log("key: ", key);
  //   console.log("is key check: ", isKeyCheck);

  pool.getConnection(function (err, connection) {
    if (err instanceof Error) {
      console.log("error getting connection:: ", err);
      return;
    }

    // ... some query

    try {
      connection.query(
        "SELECT id FROM `deviceIDs` WHERE `deviceId` = ?",
        [key],
        function (err, results) {
          console.log("selecting id results: ", results);
          if (results.length > 0) {
            console.log("its in there");
            connection.release();
            return res.status(200).json({
              success: false,
              error: false,
            });
          } else {
            console.log("in if statement:: ");
            try {
              const sql =
                'INSERT INTO `deviceIDs`(`deviceId`) VALUES ("' +
                key.toString() +
                '")';
              connection.query(sql, (err, result, fields) => {
                if (err instanceof Error) {
                  console.log("err error", err);
                  return res.status(500).json({
                    success: false,
                    error: err,
                  });
                }
                console.log(result);
                console.log(fields);
              });
              return res.status(200).json({
                success: true,
              });
            } catch (error) {
              console.log("error setting key: ", error);
              return res.status(500).json({
                success: false,
                error: error,
              });
            }
          }
        }
      );
    } catch (error) {
      console.log("error in keycheck: ", error);
      return true;
    }

    connection.release();
  });
});

// 5. Start the server and listen for incoming connections
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  if (DEV) {
    console.log("Running in development mode.");
  }
});
