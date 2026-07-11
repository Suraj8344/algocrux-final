/**
 * AlgoCrux — Razorpay Cloud Functions
 * ------------------------------------
 * Deploy with: firebase deploy --only functions
 *
 * Required config (set once from your terminal, NEVER in this file):
 *   firebase functions:config:set razorpay.key_id="rzp_test_xxxx"
 *   firebase functions:config:set razorpay.key_secret="xxxx"
 *   firebase functions:config:set razorpay.webhook_secret="a_string_you_invent"
 *
 * If your firebase-tools version has removed functions.config() (newer CLIs),
 * create a `functions/.env` file instead with:
 *   RAZORPAY_KEY_ID=rzp_test_xxxx
 *   RAZORPAY_KEY_SECRET=xxxx
 *   RAZORPAY_WEBHOOK_SECRET=xxxx
 * and swap the `cfg()` helper below to read from process.env.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

// ---- config helper (works with functions.config(); see note above) ----
function cfg() {
  const c = functions.config().razorpay || {};
  return {
    keyId: c.key_id || process.env.RAZORPAY_KEY_ID,
    keySecret: c.key_secret || process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: c.webhook_secret || process.env.RAZORPAY_WEBHOOK_SECRET,
  };
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const PLAN_AMOUNT_PAISE = 900; // ₹9.00

function getRazorpayInstance() {
  const { keyId, keySecret } = cfg();
  if (!keyId || !keySecret) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Razorpay keys are not configured on the server."
    );
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

/**
 * 1) createRazorpayOrder — callable function
 * Client calls this while logged in. We create a Razorpay Order tied to the
 * user's uid (in `notes`), and return the order id + public key id so the
 * client can open Razorpay Checkout. The amount is set server-side only —
 * the client can never choose its own price.
 */
exports.createRazorpayOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be signed in to subscribe."
    );
  }
  const uid = context.auth.uid;
  const razorpay = getRazorpayInstance();

  const order = await razorpay.orders.create({
    amount: PLAN_AMOUNT_PAISE,
    currency: "INR",
    receipt: `algocrux_${uid}_${Date.now()}`,
    notes: { uid, plan: "weekly_9rs" },
  });

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: cfg().keyId, // public key id — safe to send to the client
  };
});

/**
 * 2) verifyRazorpayPayment — callable function
 * Client calls this right after Razorpay Checkout succeeds, passing back
 * order_id, payment_id, and signature. We verify the HMAC signature using
 * the (never-exposed) key secret, then grant subscription access.
 *
 * NOTE: This is a nice-to-have fast path for instant UI feedback. The
 * webhook below (#3) is the source of truth and will grant access even if
 * the user closes the tab before this call completes.
 */
exports.verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in required.");
  }
  const { orderId, paymentId, signature } = data || {};
  if (!orderId || !paymentId || !signature) {
    throw new functions.https.HttpsError("invalid-argument", "Missing payment fields.");
  }

  const { keySecret } = cfg();
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (expectedSignature !== signature) {
    throw new functions.https.HttpsError("permission-denied", "Payment signature mismatch.");
  }

  const uid = context.auth.uid;
  const expiry = Date.now() + WEEK_MS;

  await db.collection("users").doc(uid).set(
    {
      subscriptionActive: true,
      subscriptionExpiry: expiry,
      lastPaymentId: paymentId,
      lastOrderId: orderId,
    },
    { merge: true }
  );

  return { success: true, subscriptionExpiry: expiry };
});

/**
 * 3) razorpayWebhook — HTTP function (source of truth)
 * Configure this URL in Razorpay Dashboard → Settings → Webhooks, with the
 * "payment.captured" event enabled, and the secret matching
 * razorpay.webhook_secret. This fires from Razorpay's servers directly, so
 * it grants access even if the user's browser tab closes mid-flow.
 */
exports.razorpayWebhook = functions.https.onRequest(async (req, res) => {
  const { webhookSecret } = cfg();
  const signature = req.headers["x-razorpay-signature"];

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(req.rawBody) // raw body is required for signature match
    .digest("hex");

  if (signature !== expected) {
    console.error("Webhook signature mismatch");
    res.status(400).send("Invalid signature");
    return;
  }

  const event = req.body;

  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;
    const uid = payment.notes && payment.notes.uid;

    if (uid) {
      const expiry = Date.now() + WEEK_MS;
      await db.collection("users").doc(uid).set(
        {
          subscriptionActive: true,
          subscriptionExpiry: expiry,
          lastPaymentId: payment.id,
          lastOrderId: payment.order_id,
        },
        { merge: true }
      );
      console.log(`Subscription activated for uid=${uid} via webhook`);
    } else {
      console.warn("payment.captured event with no uid in notes", payment.id);
    }
  }

  res.status(200).send("ok");
});

/**
 * 4) checkExpiredSubscriptions — scheduled function
 * Runs daily, flips subscriptionActive to false for anyone whose
 * subscriptionExpiry has passed. This isn't strictly required (the client
 * already checks the expiry timestamp), but it keeps Firestore accurate for
 * any admin views/reports you build later, and revokes stale access if you
 * ever change the client check.
 */
exports.checkExpiredSubscriptions = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async () => {
    const now = Date.now();
    const snap = await db
      .collection("users")
      .where("subscriptionActive", "==", true)
      .where("subscriptionExpiry", "<=", now)
      .get();

    const batch = db.batch();
    snap.forEach((docSnap) => {
      batch.update(docSnap.ref, { subscriptionActive: false });
    });
    await batch.commit();
    console.log(`Expired ${snap.size} subscriptions`);
    return null;
  });
