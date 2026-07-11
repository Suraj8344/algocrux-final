/**
 * Shared Firebase Admin SDK init for all API routes.
 * Reads the service account key from the FIREBASE_SERVICE_ACCOUNT_BASE64
 * environment variable (set in Vercel's dashboard, never committed to git).
 */
const admin = require("firebase-admin");

function getAdmin() {
  if (admin.apps.length) return admin;

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 env var is not set");
  }
  const serviceAccount = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  return admin;
}

/**
 * Verifies the Firebase ID token sent from the browser in the
 * "Authorization: Bearer <token>" header. Throws if missing/invalid.
 * Returns the decoded token (contains .uid).
 */
async function verifyAuth(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    const err = new Error("Missing Authorization header");
    err.statusCode = 401;
    throw err;
  }
  try {
    return await getAdmin().auth().verifyIdToken(match[1]);
  } catch (e) {
    console.error("verifyIdToken failed:", e.code, e.message);
    const err = new Error("Invalid or expired auth token: " + e.message);
    err.statusCode = 401;
    throw err;
  }
}

// Permissive CORS for these API routes. Tighten `origin` to your real
// domain once you know it (e.g. 'https://algocrux.com') if you want.
function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

module.exports = { getAdmin, verifyAuth, setCors };
