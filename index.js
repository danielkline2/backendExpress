// Load environment variables
if (false) {
  require("dotenv").config({ path: "./.env" });
}

const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const bodyParser = require("body-parser");
const { rateLimit } = require("express-rate-limit");
const { GoogleGenAI } = require("@google/genai");
const { makePrompt } = require("./promptMaker");

// --- NEW IMPORTS: NoSQL Functions ---
const noDb = require("./noDb");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(limiter);

// Logging Middleware
app.use((req, res, next) => {
  console.log(`--> ${req.method} ${req.url}`);
  res.on("finish", () => {
    console.log(`<-- ${req.method} ${req.url} ${res.statusCode}`);
  });
  next();
});

// Environment Setup
const API_KEY_GOOGLE = process.env.GOOGLE_API_KEY;
const DEV = process.env.DEV === "true";
const port = process.env.PORT || 3000;

if (!API_KEY_GOOGLE) {
  console.error("Error: 'GOOGLE_API_KEY' environment variable not found.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY_GOOGLE });

// --- HELPER: Validation ---
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

// --- ROUTE: Chart Data ---
app.get("/chartData", async (req, res) => {
  // Hardcoded response logic preserved
  const dataSend = {
    userData: { engagementScore: 78, messagesSent: 12, issuesEngaged: 5 },
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
    // 1. NoSQL Auth Check
    // Replace SQL SELECT with Firestore Get
    const user = await noDb.getUser(clientKey);

    if (!user) {
      // If user doesn't exist in Firestore
      if (!DEV) return res.status(403).json({ error: "Unauthorized access 1" });
      console.warn("DEV MODE: User not found, passing anyway.");
    }

    if (clientHeader && clientHeader !== "your-app-specific-client-id") {
      if (!DEV) return res.status(403).json({ error: "Unauthorized access 2" });
    }

    // If we pass checks, return the data
    return res.json(dataSend);
  } catch (error) {
    console.error("Unexpected error in /chartData:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// --- ROUTE: Get Prompt (Main Logic) ---
app.post("/api/getPrompt", async (req, res) => {
  const {
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
  } = req.body;

  const requiredFields = [
    "name",
    "topic",
    "reason1",
    "contactType",
    "repName",
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
    // 1. NoSQL Auth Check
    const user = await noDb.getUser(clientKey);

    if (!user) {
      if (!DEV) return res.status(403).json({ error: "Unauthorized access 1" });
      console.warn("DEV MODE: User not found, passing anyway.");
    }

    if (clientHeader && clientHeader !== "your-app-specific-client-id") {
      if (!DEV) return res.status(403).json({ error: "Unauthorized access 2" });
    }

    // 2. Save User Prompt to Firestore
    // Replaces INSERT INTO prompts
    let lastUpdatedId;
    try {
      // We pass reason1 as the 'prompt_text' and 'reason' as context
      lastUpdatedId = await noDb.createPrompt(
        clientKey,
        topicId,
        reason1,
        reason1
      );
    } catch (err) {
      console.error("Error saving prompt to NoSQL:", err);
      // We continue even if saving fails, to deliver the AI response
    }

    // 3. Generate AI Content
    try {
      const aiResult = await ai.models.generateContent({
        model: "gemini-2.0-flash-001",
        contents: `system prompt: ${userPrompt.systemPrompt}. user prompt: ${userPrompt.userPrompt}`,
      });

      const candidate = aiResult?.candidates?.[0];
      const finishReason = candidate?.finishReason;
      const aiText = candidate?.content?.parts?.[0]?.text;
      const isFlagged = finishReason === "SAFETY";

      // 4. Save AI Response to Firestore (Subcollection)
      // Replaces INSERT INTO responses
      if (lastUpdatedId) {
        const safetyRating = isFlagged
          ? candidate?.safetyRatings.find((r) =>
              ["HIGH", "MEDIUM"].includes(r.probability)
            )
          : null;

        const metadata = {
          ...aiResult?.usageMetadata,
          responseId: aiResult?.responseId,
          modelVersion: aiResult?.modelVersion,
        };

        // Fire and forget log (don't await)
        noDb
          .addResponseToPrompt(
            lastUpdatedId,
            aiText || "BLOCKED",
            metadata,
            isFlagged,
            safetyRating
          )
          .catch((e) => console.error("Error logging response:", e));
      }

      if (isFlagged) {
        return res.json({
          success: true,
          AIText:
            "We can not provide you with a response at this time. Your reasoning provided violates our terms of service",
          flagged: true,
        });
      } else {
        return res.json({
          success: true,
          AIText: aiText,
          flagged: false,
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

// --- ROUTE: Set Key (User Registration) ---
app.post("/start/set_key", async (req, res) => {
  const keyObject = req.body;
  const key = keyObject?.startKey; // This corresponds to userId

  if (!key) {
    return res.status(400).json({ success: false, error: "No key provided" });
  }

  try {
    // 1. Check if user exists
    const user = await noDb.getUser(key);

    if (user) {
      // Match existing logic: success false, error false means "already valid"
      return res.status(200).json({
        success: false,
        error: false,
      });
    } else {
      // 2. Create new user
      // We default username to Anonymous because this route only provides the ID
      await noDb.createUser(key.toString(), "Anonymous", "");

      return res.status(200).json({
        success: true,
      });
    }
  } catch (error) {
    console.error("Error in set_key:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  if (DEV) {
    console.log("Running in development mode.");
  }
});

process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
});

process.on("unhandledRejection", (reason, p) => {
  console.error("unhandledRejection at:", p, "reason:", reason);
});
