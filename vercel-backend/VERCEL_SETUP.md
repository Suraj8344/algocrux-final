# AlgoCrux — Razorpay Backend on Vercel (no Firebase Blaze needed)

This replaces the Cloud Functions approach. Firebase Auth + Firestore stay
exactly as they are (free Spark plan is fine) — only the 3 backend
endpoints that need your Razorpay secret now live on Vercel instead.

## ⚠️ Still true: never paste your Razorpay Key Secret in chat again
Use your **rotated** test secret here. Nothing below stores it in a file
you'll upload anywhere — it only ever goes into Vercel's environment
variables dashboard.

---

## What's in this folder

```
vercel-backend/
├── api/
│   ├── create-order.js      → POST /api/create-order
│   ├── verify-payment.js    → POST /api/verify-payment
│   ├── webhook.js           → POST /api/webhook  (Razorpay calls this)
│   └── check-expired.js     → runs daily via Vercel Cron
├── lib/
│   └── firebaseAdmin.js     → shared Firebase Admin SDK init + auth check
├── package.json
└── vercel.json              → configures the daily cron
```

## 1. Get a Firebase service account key (one-time)

This lets the Vercel functions write to Firestore, the same way the Cloud
Functions Admin SDK did automatically.

1. Firebase Console → gear icon → **Project settings** → **Service accounts** tab
2. Click **Generate new private key** → confirms → downloads a `.json` file
3. **Base64-encode it** so it can go into a single environment variable:

   On Windows PowerShell:
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\your-key.json")) | Set-Clipboard
   ```
   This copies the base64 string straight to your clipboard.

   On Mac/Linux:
   ```bash
   base64 -i your-key.json | pbcopy   # Mac
   base64 -w0 your-key.json | xclip -selection clipboard   # Linux
   ```

Keep that clipboard content handy for step 3 below. Delete the raw
`.json` file afterward if it's sitting in your Downloads folder — no need
to keep an unencoded copy lying around.

## 2. Push this folder to Vercel

Easiest path — Vercel CLI, no GitHub required:

```bash
npm install -g vercel
cd vercel-backend
vercel login
vercel
```

Answer the prompts:
- Set up and deploy? **Y**
- Which scope? (pick your account)
- Link to existing project? **N**
- Project name? (anything, e.g. `algocrux-backend`)
- Directory? **./** (just press enter)
- Override settings? **N**

It'll deploy and print a URL like `https://algocrux-backend.vercel.app`.
**Copy this URL** — you need it in step 4.

## 3. Set environment variables

Go to your new project on vercel.com → **Settings** → **Environment Variables**,
and add these four (apply to Production + Preview + Development):

| Key | Value |
|---|---|
| `RAZORPAY_KEY_ID` | your rotated test key id, e.g. `rzp_test_xxxx` |
| `RAZORPAY_KEY_SECRET` | your rotated test key secret |
| `RAZORPAY_WEBHOOK_SECRET` | any random string you invent (write it down — you'll paste the same one into Razorpay in step 5) |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | the long base64 string from step 1 |

After adding them, **redeploy** so the functions pick them up:
```bash
vercel --prod
```

## 4. Point pricing.html at your Vercel URL

In `pricing.html`, find this line near the top of the `<script type="module">` block:

```js
const BACKEND_URL = 'https://YOUR-VERCEL-PROJECT.vercel.app';
```

Replace it with the real URL from step 2 (no trailing slash), then
re-upload `pricing.html` wherever you host your static site.

## 5. Configure the Razorpay webhook

Razorpay Dashboard → **Settings → Webhooks → Add New Webhook**:
- URL: `https://YOUR-VERCEL-PROJECT.vercel.app/api/webhook`
- Secret: the same string you set as `RAZORPAY_WEBHOOK_SECRET` in step 3
- Active events: check **`payment.captured`**

This is your source of truth — fires even if the user closes the tab
right after paying.

## 6. Test it

Razorpay test card: `4111 1111 1111 1111`, any future expiry, any CVV.

Sign in on your site → `pricing.html` → **Subscribe Now** → pay with the
test card → should redirect to `dashboard.html` with "Premium active" and
`index.html` unlocked.

If something fails, check logs at: your Vercel project → **Deployments** →
(latest) → **Functions** tab → click the function → **Logs**. That'll show
the actual error (bad env var, Firestore permission issue, etc.) the same
way Cloud Functions logs would have.

## Note on the daily cron

`vercel.json` schedules `check-expired` once a day, which Vercel's free
Hobby tier supports. If it ever shows as disabled in your dashboard, it's
not critical — the client already checks `subscriptionExpiry` directly, so
access still lapses correctly either way; the cron just keeps the
`subscriptionActive` flag tidy in Firestore for your own reference.
