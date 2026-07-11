const { getAdmin } = require("../lib/firebaseAdmin");

// Triggered by Vercel Cron (see vercel.json) once a day. Not strictly
// required — the client already checks subscriptionExpiry directly — but
// keeps Firestore's subscriptionActive flag accurate for any admin
// views/reports you build later.
module.exports = async (req, res) => {
  // Vercel Cron requests include this header; reject anything else so the
  // endpoint can't be spammed by randoms hitting the URL directly.
  if (req.headers["x-vercel-cron"] === undefined && process.env.CRON_SECRET) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).send("Unauthorized");
    }
  }

  try {
    const admin = getAdmin();
    const db = admin.firestore();
    const now = Date.now();

    const snap = await db
      .collection("users")
      .where("subscriptionActive", "==", true)
      .where("subscriptionExpiry", "<=", now)
      .get();

    const batch = db.batch();
    snap.forEach((docSnap) => batch.update(docSnap.ref, { subscriptionActive: false }));
    await batch.commit();

    console.log(`Expired ${snap.size} subscriptions`);
    res.status(200).json({ expired: snap.size });
  } catch (err) {
    console.error("check-expired error:", err);
    res.status(500).json({ error: err.message });
  }
};
