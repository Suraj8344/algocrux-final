const crypto = require("crypto");
const { verifyAuth, getAdmin, setCors } = require("../lib/firebaseAdmin");

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const decoded = await verifyAuth(req);
    const uid = decoded.uid;

    const { orderId, paymentId, signature } = req.body || {};
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ error: "Missing payment fields" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(403).json({ error: "Payment signature mismatch" });
    }

    const expiry = Date.now() + WEEK_MS;
    const admin = getAdmin();
    await admin.firestore().collection("users").doc(uid).set(
      {
        subscriptionActive: true,
        subscriptionExpiry: expiry,
        lastPaymentId: paymentId,
        lastOrderId: orderId,
      },
      { merge: true }
    );

    res.status(200).json({ success: true, subscriptionExpiry: expiry });
  } catch (err) {
    console.error("verify-payment error:", err);
    res.status(err.statusCode || 500).json({ error: err.message || "Verification failed" });
  }
};
