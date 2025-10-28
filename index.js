// Load environment variables in development
if (true) {
  // if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// Import required modules

const cors = require("cors"); // Best practice for APIs
// 1. Import the Express library
const express = require("express");
const helmet = require("helmet");

const bodyParser = require("body-parser");

const { rateLimit } = require("express-rate-limit");

const { GoogleGenAI } = require("@google/genai");
const { makePrompt } = require("./promptMaker");

const jwt = require("jsonwebtoken");

const bcrypt = require("bcrypt");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: "draft-7", // draft-6: RateLimit-* headers; draft-7: combined RateLimit header
  legacyHeaders: false, // X-RateLimit-* headers
  // store: ... , // Use an external store for more precise rate limiting
});

// Apply the rate limiting middleware to all requests

const pool = require("./db"); // Import the pool from your setup file
if (!pool) {
  console.error("MySQL pool is not initialized. Check your db.js for errors.");
  process.exit(1);
}

// 2. Create an instance of an Express application
const app = express();

// Use middleware
app.use(helmet());
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Middleware to parse JSON bodies
app.use(bodyParser.json());
app.use(limiter);

// Global request logger to help diagnose immediate connection resets
app.use((req, res, next) => {
  console.log(`--> ${req.method} ${req.url} headers:`, req.headers);
  // Also log when the response finishes so we can see status
  res.on("finish", () => {
    console.log(`<-- ${req.method} ${req.url} ${res.statusCode}`);
  });
  next();
});

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

const ai = new GoogleGenAI({ apiKey: API_KEY_GOOGLE });

// 3. Define the port the server will run on
// Uses the host's suggested port, or 3000 for local development
const port = process.env.PORT || 3000;

// Helper to run a pool query with a timeout so requests don't hang indefinitely
const queryWithTimeout = (pool, sql, params = [], ms = 10000) => {
  return new Promise((resolve, reject) => {
    let finished = false;
    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        reject(new Error("DB query timeout"));
      }
    }, ms);

    try {
      pool.query(sql, params, (err, results, fields) => {
        if (finished) return; // already timed out
        finished = true;
        clearTimeout(timer);
        if (err) return reject(err);
        resolve({ results, fields });
      });
    } catch (err) {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        reject(err);
      }
    }
  });
};

// Helper to run a pool query without a timeout.
// Useful for background tasks like logging where we don't want to hold up the main request.
const queryWithoutTimeout = (pool, sql, params = []) => {
  return new Promise((resolve, reject) => {
    // Directly execute the query. The promise will resolve or reject
    // only when the database operation itself completes or errors out.
    pool.query(sql, params, (err, results, fields) => {
      if (err) {
        return reject(err);
      }
      resolve({ results, fields });
    });
  });
};

// Validate required fields and return an array of missing field names.
// This helper doesn't send a response directly so it's easier to test and reuse.
const getMissingFields = (body = {}, requiredFields = []) => {
  const missing = [];
  requiredFields.forEach((field) => {
    const val = body[field];
    const isEmptyString = typeof val === "string" && val.trim() === "";
    if (val === undefined || val === null || isEmptyString) {
      missing.push(field);
    }
  });
  return missing;
};

///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////

// // create user
// app.post("/createUser", (req, res) => {});

// // login

// app.post("/login", (req, res) => {});

// app.post("/logout", (req, res) => {});

// app.post("/refreshToken", (req, res) => {});

///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////

app.get("/chartData", async (req, res) => {
  const name = req?.body?.name;
  const dataSend = {
    userData: {
      engagementScore: 78,
      messagesSent: 12,
      issuesEngaged: 5,
    },
    communityData: [
      { label: "Inflation", value: 95, frontColor: "#0D6EFD" },
      { label: "Taxes", value: 80, frontColor: "#0D6EFD" },
      { label: "Housing", value: 75, frontColor: "#0D6EFD" },
      { label: "Transit", value: 60, frontColor: "#0D6EFD" },
      { label: "Schools", value: 45, frontColor: "#0D6EFD" },
    ],
  };

  const clientHeader = req.get("X-Client-Id");
  const clientKey = req.get("X-Phone-Id");

  try {
    const sql = "SELECT * FROM users WHERE userId = ? LIMIT 1";
    let rows = [];

    try {
      const { results } = await queryWithTimeout(pool, sql, [clientKey], 5000);
      rows = results;
      // console.log("DB check result length", results?.length);
      // console.log("DB check result: ", results);
      if (results?.length == 0 || results?.length == undefined) {
        return res.status(403).json({ error: "Unauthorized access 1" });
      }
    } catch (dbErr) {
      console.warn(
        "DB check failed or timed out, continuing in DEV mode:",
        dbErr.message
      );
      // If DB is unavailable, do not hang the request. In production you may want to
      // reject the request instead. For local testing, allow continuation.
      if (!DEV) {
        return res.status(503).json({ error: "Database unavailable" });
      }
    }

    if (
      (clientHeader && clientHeader !== "your-app-specific-client-id") ||
      rows?.length === 0
    ) {
      // For now, when running in DEV allow bypass so you can test quickly.
      if (!DEV) {
        return res.status(403).json({ error: "Unauthorized access 2" });
      }
    }

    //////////////////////////////////////////////////////////////
    //  cleared the checks
    //
    // put code below
    //
    //
    //
    //////////////////////////////////////////////////////////////
  } catch (error) {
    console.error("Unexpected error in /api/getPrompt:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////

app.post("/api/getPrompt", async (req, res) => {
  // console.log("POST /api/getPrompt hit", {
  //   headers: req.headers,
  //   body: req.body,
  // });

  const name = req?.body?.name;
  const topic = req?.body?.topic;
  const reason1 = req?.body?.reason1;
  const contactType = req?.body?.contactType;
  const repName = req?.body?.repName;
  const userZipCode = req?.body?.userZipCode;
  const userStreet = req?.body?.userStreet;
  const userCity = req?.body?.userCity;
  const repPartyName = req?.body?.repPartyName;
  const topicId = req?.body?.topicId;

  // Validate required inputs in one place and return a single helpful error if any are missing.
  const requiredFields = [
    "name",
    "topic",
    "reason1",
    "contactType",
    "repName",
    //"userZipCode",
    // "userStreet",
    "userCity",
    "repPartyName",
    "topicId",
  ];

  const missing = getMissingFields(req.body, requiredFields);
  if (missing.length > 0) {
    return res.status(400).json({
      error: `Please provide the following field(s): ${missing.join(", ")}`,
      missing,
    });
  }

  const promptConfig = {
    name,
    topic,
    reason1,
    contactType,
    repName,
    userZipCode,
    userStreet,
    userCity,
    repPartyName,
    topicId,
  };

  const userPrompt = makePrompt(
    name,
    topic,
    "",
    "",
    reason1,
    "",
    "",
    contactType,
    repName,
    userZipCode,
    userStreet,
    userCity
  );

  if (!userPrompt || Object.keys(userPrompt).length === 0) {
    return res.status(400).json({ error: "Please Provide Prompt" });
  }

  const clientHeader = req.get("X-Client-Id");
  const clientKey = req.get("X-Phone-Id");

  try {
    const sql = "SELECT * FROM users WHERE userId = ? LIMIT 1";
    let rows = [];

    try {
      const { results } = await queryWithTimeout(pool, sql, [clientKey], 5000);
      rows = results;
      // console.log("DB check result length", results?.length);
      // console.log("DB check result: ", results);
      if (results?.length == 0 || results?.length == undefined) {
        return res.status(403).json({ error: "Unauthorized access 1" });
      }
    } catch (dbErr) {
      console.warn(
        "DB check failed or timed out, continuing in DEV mode:",
        dbErr.message
      );
      // If DB is unavailable, do not hang the request. In production you may want to
      // reject the request instead. For local testing, allow continuation.
      if (!DEV) {
        return res.status(503).json({ error: "Database unavailable" });
      }
    }

    if (
      (clientHeader && clientHeader !== "your-app-specific-client-id") ||
      rows?.length === 0
    ) {
      // For now, when running in DEV allow bypass so you can test quickly.
      if (!DEV) {
        return res.status(403).json({ error: "Unauthorized access 2" });
      }
    }

    //////////////////////////////////////////////////////////////
    //.  cleared the checks. add userprommpt to database
    //
    //
    //
    //
    //
    //////////////////////////////////////////////////////////////

    const sqlAddUserPrompt = `INSERT INTO prompts ( userId , prompt_text, topic_id ) VALUES (?,?,?);`;
    let lastUpdatedId;
    try {
      queryWithoutTimeout(pool, sqlAddUserPrompt, [
        clientKey,
        reason1,
        topicId,
      ]).then((results, fields) => {
        console.log("Successfully submitted user prompt");
        console.log("results: ", results);
        console.log("fields: ", fields);
        lastUpdatedId = results.results.insertId;
        console.log("lastUpdatedId: ", lastUpdatedId);
      });
    } catch (error) {
      console.log("error sending userPrompt to database: ", error);
    }

    // Call the AI and return a response. Return the raw result to avoid runtime errors
    // caused by accessing non-existent properties on the AI response object.
    try {
      const aiResult = await ai.models.generateContent({
        model: "gemini-2.0-flash-001",
        contents: `system prompt: ${userPrompt.systemPrompt}. user prompt: ${userPrompt.userPrompt}`,
      });
      console.log("AI result received");

      // if (aiResult?.candidates?.[0]?.finishReason === "SAFETY") {
      // look here,

      //console.log("AI flagged prompt for safety. Logging to database.");

      const sqlAddFlag = `INSERT INTO responses ( prompt_id, api_metadata , flag_reason , is_flagged , response_text )
            VALUES (?,?,?,?,?);`;
      try {
        queryWithoutTimeout(pool, sqlAddFlag, [
          lastUpdatedId,
          JSON.stringify({
            ...aiResult?.usageMetadata,
            responseId: aiResult?.responseId,
            modelVersion: aiResult?.modelVersion,
          }),
          aiResult?.candidates?.[0]?.finishReason === "SAFETY"
            ? aiResult?.candidates?.[0]?.safetyRatings.filter((arrayObj) =>
                ["HIGH", "MEDIUM"].includes(arrayObj.probability)
              )[0]
            : null,
          aiResult?.candidates?.[0]?.finishReason === "SAFETY" ? 1 : 0,
          aiResult?.candidates?.[0]?.content?.parts?.[0]?.text,
        ]).then(() => {
          console.log("Successfully submitted user prompt");
        });
      } catch (error) {
        console.log("error sending userPrompt to database: ", error);
      }
      // }

      if (aiResult?.candidates?.[0]?.finishReason === "SAFETY") {
        return res.json({
          success: true,
          AIText:
            "We can not provide you with a response at this time. Your reasoning provided violates our terms of service",
          flagged: true,
          //aiResult: aiResult,
        });
      } else {
        return res.json({
          success: true,
          AIText: aiResult?.candidates?.[0]?.content?.parts?.[0]?.text,
          flagged: false,
          //aiResult: aiResult,
        });
      }
    } catch (aiErr) {
      console.error("AI call failed:", aiErr);
      return res.status(502).json({ error: "Upstream AI service error" });
    }
  } catch (error) {
    console.error("Unexpected error in /api/getPrompt:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/sent", async (req, res) => {});

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
        "SELECT id FROM `users` WHERE `userId` = ?",
        [key],
        function (err, results) {
          console.log("selecting id results: ", results);
          if (results?.length > 0) {
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
                'INSERT INTO `users`(`userId`) VALUES ("' +
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

// Global error handlers so crashes are visible in logs instead of silently closing sockets
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
});

process.on("unhandledRejection", (reason, p) => {
  console.error("unhandledRejection at:", p, "reason:", reason);
});
