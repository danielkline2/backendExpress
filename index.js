// require("dotenv").config();
// // Import required modules
// const express = require("express");

// const cors = require("cors"); // Best practice for APIs

// // Load environment variables from a .env file

// // --- Express Server Configuration ---
// const app = express();

// // Use middleware
// app.use(cors()); // Enable Cross-Origin Resource Sharing
// app.use(express.json()); // Middleware to parse JSON bodies

// // Load API keys from environment variables
// // const API_KEY_GOOGLE = process.env.GOOGLE_API_KEY;
// // const API_KEY_CONGRESS = process.env.CONGRESS_API_KEY;
// const API_KEY_GOOGLE = process.env.GOOGLE_API_KEY;
// const API_KEY_CONGRESS = process.env.CONGRESS_API_KEY;
// const DEV = process.env.DEV === "true"; // Convert string 'true' to boolean

// // Check if the required environment variables are set
// if (!API_KEY_GOOGLE || !API_KEY_CONGRESS) {
//   console.error(
//     "Error: 'GOOGLE_API_KEY' or 'CONGRESS_API_KEY' environment variable not found."
//   );
//   console.error(
//     "Please set them using a .env file or your hosting provider's settings."
//   );
//   process.exit(1); // Exit the process with an error code
// }

// // --- API Routes ---

// app.get("/api/get_key_g", (req, res) => {
//   /**
//    * Returns the Google API key as a JSON response.
//    */
//   try {
//     // Equivalent security check for a client header
//     const clientHeader = req.get("X-Client-Id");
//     if (clientHeader && clientHeader !== "your-app-specific-client-id") {
//       // Uncomment the line below to enforce the check in production
//       // return res.status(403).json({ error: "Unauthorized access" });
//     }

//     // Return the key in a JSON object
//     return res.status(200).json({
//       success: true,
//       api_key: API_KEY_GOOGLE,
//     });
//   } catch (error) {
//     // Generic error handling
//     console.error(`An error occurred: ${error}`);
//     return res.status(500).json({
//       success: false,
//       error: "An internal server error occurred.",
//     });
//   }
// });

// app.get("/api/get_key_c", (req, res) => {
//   /**
//    * Returns the Congress API key as a JSON response.
//    */
//   try {
//     // Equivalent security check for a client header
//     const clientHeader = req.get("X-Client-Id");
//     if (clientHeader && clientHeader !== "your-app-specific-client-id") {
//       // Uncomment the line below to enforce the check in production
//       // return res.status(403).json({ error: "Unauthorized access" });
//     }

//     // Return the key in a JSON object
//     return res.status(200).json({
//       success: true,
//       api_key: API_KEY_CONGRESS,
//     });
//   } catch (error) {
//     // Generic error handling
//     console.error(`An error occurred: ${error}`);
//     return res.status(500).json({
//       success: false,
//       error: "An internal server error occurred.",
//     });
//   }
// });

// // --- Start the Server ---
// const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
//   if (DEV) {
//     console.log("Running in development mode.");
//   }
// });

require("dotenv").config();
// Import required modules

const cors = require("cors"); // Best practice for APIs
// 1. Import the Express library
const express = require("express");

// 2. Create an instance of an Express application
const app = express();

// Use middleware
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Middleware to parse JSON bodies

// Load API keys from environment variables
// const API_KEY_GOOGLE = process.env.GOOGLE_API_KEY;
// const API_KEY_CONGRESS = process.env.CONGRESS_API_KEY;
const API_KEY_GOOGLE = process.env.GOOGLE_API_KEY;
const API_KEY_CONGRESS = process.env.CONGRESS_API_KEY;
const DEV = process.env.DEV === "true"; // Convert string 'true' to boolean

// 3. Define the port the server will run on
// Uses the host's suggested port, or 3000 for local development
const port = process.env.PORT || 3000;

// 4. Create a basic API endpoint
// This handles GET requests to http://your-server-address/api
app.get("/api", (req, res) => {
  res.json({ message: "Hello, World!" });
});

app.get("/api/get_key_g", (req, res) => {
  /**
   * Returns the Google API key as a JSON response.
   */
  try {
    // Equivalent security check for a client header
    const clientHeader = req.get("X-Client-Id");
    if (clientHeader && clientHeader !== "your-app-specific-client-id") {
      // Uncomment the line below to enforce the check in production
      // return res.status(403).json({ error: "Unauthorized access" });
    }

    // Return the key in a JSON object
    return res.status(200).json({
      success: true,
      api_key: API_KEY_GOOGLE,
    });
  } catch (error) {
    // Generic error handling
    console.error(`An error occurred: ${error}`);
    return res.status(500).json({
      success: false,
      error: "An internal server error occurred.",
    });
  }
});

app.get("/api/get_key_c", (req, res) => {
  /**
   * Returns the Congress API key as a JSON response.
   */
  try {
    // Equivalent security check for a client header
    const clientHeader = req.get("X-Client-Id");
    if (clientHeader && clientHeader !== "your-app-specific-client-id") {
      // Uncomment the line below to enforce the check in production
      // return res.status(403).json({ error: "Unauthorized access" });
    }

    // Return the key in a JSON object
    return res.status(200).json({
      success: true,
      api_key: API_KEY_CONGRESS,
    });
  } catch (error) {
    // Generic error handling
    console.error(`An error occurred: ${error}`);
    return res.status(500).json({
      success: false,
      error: "An internal server error occurred.",
    });
  }
});

// 5. Start the server and listen for incoming connections
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  if (DEV) {
    console.log("Running in development mode.");
  }
});
