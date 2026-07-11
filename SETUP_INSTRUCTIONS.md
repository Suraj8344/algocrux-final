# AlgoCrux — Razorpay Integration (Complete)

## ⚠️ Do this first: rotate your Razorpay Key Secret
You pasted your Key Secret in chat (twice). It must be treated as compromised:

1. Razorpay Dashboard → **Settings → API Keys** → regenerate the Key Secret.
2. Put **only the new secret** into the Firebase config command below — never into
   any `.html`/`.js` file, never in chat again. The Key ID (public) is fine to share.

None of the files below contain your secret — it only ever goes into
`firebase functions:config:set`, run from your own terminal.

---

## What's in this package

| File | Purpose |
|---|---|
| `functions/index.js` | Cloud Functions: `createRazorpayOrder`, `verifyRazorpayPayment`, `razorpayWebhook`, `checkExpiredSubscriptions` |
| `functions/package.json` | Dependencies for the functions above |
| `firestore.rules` | Locks `subscriptionActive` / `subscriptionExpiry` / `lastPaymentId` / `lastOrderId` so **only your backend** can ever set them |
| `pricing.html` | Real Razorpay Checkout popup (no more static payment link) |
| `index.html` | All 38 algorithms are visible, but only **3 free ones** (`kadanes-algorithm`, `bubble-sort`, `next-permutation`) are unlocked unless the user has an active subscription — others show a blurred "Premium" overlay and route to `pricing.html` |
| `dashboard.html`, `login.html`, `register.html`, `preview.html` | Unchanged, included for completeness |

## How the "no pay → no access" gating actually works

Two layers, because a purely client-side lock can be bypassed by a determined user in DevTools:

1. **UI layer (`index.html`)** — locked/blurred cards, click redirects to `pricing.html`. This stops casual users.
2. **Data layer (Firestore rules)** — a user's browser can *read* `subscriptionActive`, but can never *write* it. Only your Cloud Functions (using the Admin SDK, which bypasses rules) can set it true, and only after verifying a real Razorpay payment signature.

**Still an honest limitation:** the individual `algorithms/*.html` pages themselves aren't gated here (I don't have those files) — only the `index.html` grid is. Anyone who guesses/bookmarks a direct URL like `algorithms/kadanes-algorithm.html`'s neighbor could still open it directly. If you send me those files, I can add the same ~10-line subscription check to each one, or move them behind a Cloud Function so ungated access isn't possible at all.

---

## 1. Install & configure

```bash
cd functions
npm install
```

Set your secrets (never commit these, never put them in HTML):

```bash
firebase functions:config:set razorpay.key_id="rzp_test_xxxxxxxx"
firebase functions:config:set razorpay.key_secret="your_new_rotated_secret"
firebase functions:config:set razorpay.webhook_secret="a_secret_you_invent_for_the_webhook"
```

`webhook_secret` isn't from Razorpay — invent any random string, then paste that same
string into the Razorpay webhook config in step 3.

> If your `firebase-tools` version has removed `functions.config()`, create a
> `functions/.env` file with `RAZORPAY_KEY_ID=`, `RAZORPAY_KEY_SECRET=`,
> `RAZORPAY_WEBHOOK_SECRET=` instead — `functions/index.js` already falls back to
> `process.env` for each of these.

## 2. Deploy

```bash
firebase deploy --only functions,firestore:rules
```

Note the URL Firebase prints for `razorpayWebhook`, something like:
```
https://us-central1-algocrux8344.cloudfunctions.net/razorpayWebhook
```

## 3. Configure the webhook in Razorpay

Razorpay Dashboard → **Settings → Webhooks → Add New Webhook**:
- URL: the `razorpayWebhook` URL from step 2
- Secret: the same string you set as `razorpay.webhook_secret`
- Active events: check **`payment.captured`**

This webhook is your source of truth — it fires from Razorpay's servers even if the
user closes the tab right after paying, so they can't dodge activation by killing the
page before the client-side `verifyRazorpayPayment` call finishes.

## 4. Upload the HTML files

Upload `index.html`, `pricing.html`, `dashboard.html`, `login.html`, `register.html`,
`preview.html` to wherever you host the static site (Firebase Hosting, Netlify, etc.),
replacing the old versions.

## 5. Test it

Razorpay test mode card: `4111 1111 1111 1111`, any future expiry, any CVV, any OTP
screen that appears (test mode auto-approves). Test UPI: `success@razorpay`.

Sign in → go to `pricing.html` → click **Subscribe Now** → the real Razorpay popup
opens → pay with the test card → you land on `dashboard.html` with the green
"Premium active" banner, and `index.html` shows all cards unlocked.

## 6. Going live

1. Get your live keys from Razorpay (KYC required for live mode).
2. `firebase functions:config:set razorpay.key_id="rzp_live_..." razorpay.key_secret="..."`
3. Add a **second, live-mode** webhook in Razorpay pointing at the same function URL.
4. Redeploy functions.

## Weekly renewal note

This is a one-off ₹9 order each week, not a Razorpay *Subscription* (auto-recurring
mandate) — the user has to come back and pay again after `subscriptionExpiry` passes.
The `dashboard.html` banner shows "free plan" again once it lapses. If you'd rather
auto-charge weekly without the user lifting a finger, that needs Razorpay's
Subscriptions API (a Plan ID + UPI Autopay/e-mandate) — happy to build that version
instead if you want it.
