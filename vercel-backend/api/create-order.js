const Razorpay = require("razorpay");
const { verifyAuth, setCors } = require("../lib/firebaseAdmin");

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const PLAN_AMOUNT_PAISE = 900; // ₹9.00 — set server-side only, client can't alter this

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const decoded = await verifyAuth(req); // throws if not signed in
    const uid = decoded.uid;

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: PLAN_AMOUNT_PAISE,
      currency: "INR",
      receipt: `ac_${uid.slice(0, 12)}_${Date.now().toString(36)}`,
      notes: { uid, plan: "weekly_9rs" },
    });

    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID, // public key id — safe for the client
    });
  } catch (err) {
    console.error("create-order error:", err);
    res.status(err.statusCode || 500).json({ error: err.message || "Order creation failed" });
  }
};
