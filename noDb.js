/**
 * This script provides functions to interact with the Firestore database
 * for your application.
 */

const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

// --- SETUP ---
try {
  if (!admin.apps.length) {
    if (
      process.env.NODE_ENV === "production" ||
      process.env.FUNCTIONS_EMULATOR
    ) {
      const serviceAccount = require(process.env.SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("Initialized Firebase Admin (deployed environment).");
    } else {
      const serviceAccount = require("./phoenix-prod-470117-firebase-adminsdk-fbsvc-1fc554671d.json");
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("Initialized Firebase Admin (local environment).");
    }
  }
} catch (e) {
  console.error("--- ERROR INITIALIZING FIREBASE ADMIN ---");
  console.error(e.message);
}

const db = getFirestore("no-sql-prod");

// --- 1. "CREATE" FUNCTIONS (WRITING DATA) ---

async function createTopic(topicName) {
  const topicRef = await db.collection("topics").add({ topic_name: topicName });
  return topicRef.id;
}

async function createUser(userId, username = "Anonymous", zipCode = "") {
  console.log(`Creating/Updating user: ${userId}`);
  const userRef = db.collection("users").doc(userId);

  // We use merge: true so we don't wipe out existing data if they log in again
  await userRef.set(
    {
      username: username,
      zip_code: zipCode,
      user_role: "user",
      last_login: admin.firestore.FieldValue.serverTimestamp(),
      // Only set created_at if it doesn't exist
    },
    { merge: true }
  );

  console.log(`User ${userId} processed.`);
}

async function createPrompt(userId, topicId, promptText, reason) {
  console.log(`Creating prompt for user ${userId} on topic ${topicId}`);

  // Note: In a NoSQL structure, we typically trust the ID exists or handle the error gracefully.
  // For this implementation, we will simply store the reference.

  const promptData = {
    prompt_text: promptText, // The "reason" or user input
    reason_context: reason, // Additional context if needed
    is_flagged: false,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    userId: userId,
    topic_id: topicId,
  };

  const promptRef = await db.collection("prompts").add(promptData);
  console.log(`Created prompt with ID: ${promptRef.id}`);
  return promptRef.id;
}

async function addResponseToPrompt(
  promptId,
  responseText,
  metadata,
  isFlagged,
  flagReason
) {
  console.log(`Adding response to prompt ${promptId}`);

  // In Firestore, we can store the response as a subcollection OR a separate collection.
  // Based on your previous file, we are using a subcollection.
  const responsesRef = db
    .collection("prompts")
    .doc(promptId)
    .collection("responses");

  await responsesRef.add({
    response_text: responseText,
    api_metadata: metadata, // JSON object
    flag_reason: flagReason,
    is_flagged: isFlagged,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`Response added to prompt ${promptId}`);
}

async function addEngagementLog(userId, actionType, points) {
  const logsRef = db
    .collection("users")
    .doc(userId)
    .collection("engagement_logs");
  await logsRef.add({
    action_type: actionType,
    points_awarded: points,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// --- 2. "READ" FUNCTIONS (QUERYING DATA) ---

async function getPromptsByTopic(topicId) {
  const promptsRef = db.collection("prompts");
  const q = promptsRef.where("topic_id", "==", topicId);
  const snapshot = await q.get();
  if (snapshot.empty) return [];

  const prompts = [];
  snapshot.forEach((doc) => prompts.push({ id: doc.id, ...doc.data() }));
  return prompts;
}

async function getPromptWithResponses(promptId) {
  const promptRef = db.collection("prompts").doc(promptId);
  const responsesRef = promptRef.collection("responses");
  const [promptDoc, responsesSnapshot] = await Promise.all([
    promptRef.get(),
    responsesRef.get(),
  ]);

  if (!promptDoc.exists) return null;

  const responses = [];
  responsesSnapshot.forEach((doc) =>
    responses.push({ id: doc.id, ...doc.data() })
  );

  return { ...promptDoc.data(), id: promptDoc.id, responses: responses };
}

/**
 * NEW HELPER: Checks if a user exists and returns data.
 * Used for Auth checks in index.js
 */
async function getUser(userId) {
  console.log("userId: ", userId);
  if (!userId) {
    console.log("!userId");
    return null;
  }
  console.log("hit 6");
  const userRef = db.collection("users").doc(userId);
  console.log("hit 7");
  const doc = await userRef.get();
  console.log("hit 8");
  if (!doc.exists) return null;
  return doc.data();
}

module.exports = {
  createTopic,
  createUser,
  createPrompt,
  addResponseToPrompt,
  addEngagementLog,
  getPromptsByTopic,
  getPromptWithResponses,
  getUser, // Exporting the new function
};
