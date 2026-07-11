const crypto = require("crypto");
const { getAdmin } = require("../lib/firebaseAdmin");

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// We need the RAW request body to verify Razorpay's signature, so the
// default JSON body-parser must be turned off for this route.
module.exports.config = {
  api: { bodyParser: false },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers["x-razorpay-signature"];

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (signature !== expected) {
      console.error("Webhook signature mismatch");
      return res.status(400).send("Invalid signature");
    }

    const event = JSON.parse(rawBody);

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const uid = payment.notes && payment.notes.uid;

      if (uid) {
        const expiry = Date.now() + WEEK_MS;
        const admin = getAdmin();
        await admin.firestore().collection("users").doc(uid).set(
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
        console.warn("payment.captured with no uid in notes", payment.id);
      }
    }

    res.status(200).send("ok");
  } catch (err) {
    console.error("webhook error:", err);
    res.status(500).send("error");
  }
};
