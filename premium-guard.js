/* =====================================================================
   premium-guard.js
   -----------------------------------------------------------------------
   Runs as the very first thing in <head> on every question/algorithm
   page. It:
     1. Hides the page instantly so nothing can flash on screen.
     2. During the promo window (see promo-config.js), skips the paywall
        entirely — still requires sign-in, but treats everyone as
        subscribed.
     3. Outside the promo window: confirms sign-in, then checks Firestore
        (subscriptionActive && subscriptionExpiry > Date.now()) — the
        same source of truth index.html's algo gallery uses.
     4. Reveals the page only if free / promo-active / subscribed;
        otherwise redirects to login.html or pricing.html.

   Depends on promo-config.js being loaded first (see the <script> tags
   injected right after <head> in each page).
   ===================================================================== */
(function () {
  // 1) Hide immediately, before anything else renders.
  var style = document.createElement('style');
  style.textContent = 'html.pg-pending body{opacity:0 !important} html.pg-pending{background:#0f1117}';
  document.head.appendChild(style);
  document.documentElement.classList.add('pg-pending');

  function reveal() {
    document.documentElement.classList.remove('pg-pending');
  }

  // Same free list as index.html's algo gallery — keep in sync with it.
  var FREE_IDS = new Set(['kadanes-algorithm', 'bubble-sort', 'next-permutation']);

  // Derive this question's id from its own filename, e.g.
  // ".../questions/array/sum_3.html" -> "sum_3"
  var algoId = (location.pathname.split('/').pop() || '').replace(/\.html?$/i, '');

  var firebaseConfig = {
    apiKey: "AIzaSyDJZq_QDHd_2ZI3kKaeE16rS9zsbdny29E",
    authDomain: "algocrux8344.firebaseapp.com",
    projectId: "algocrux8344",
    storageBucket: "algocrux8344.firebasestorage.app",
    messagingSenderId: "915570389436",
    appId: "1:915570389436:web:cd97f604b5beb2e515fbb9",
    measurementId: "G-FFQ8CW124S"
  };

  // NOTE: document.currentScript is only valid during this script's own
  // synchronous execution — it becomes null once we `await` below — so it
  // must be read and cached here, up front, not inside the async callbacks.
  var ROOT = (function () {
    var src = (document.currentScript && document.currentScript.getAttribute('src')) || '';
    var idx = src.lastIndexOf('premium-guard.js');
    return idx >= 0 ? src.slice(0, idx) : '';
  })();

  function goLogin() {
    window.location.replace(ROOT + 'login.html');
  }
  function goPricing() {
    window.location.replace(ROOT + 'pricing.html');
  }

  function promoActive() {
    return typeof window.isAlgocruxPromoActive === 'function' && window.isAlgocruxPromoActive();
  }

  (async function run() {
    try {
      var appMod = await import('https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js');
      var authMod = await import('https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js');
      var fsMod = await import('https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js');

      var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(firebaseConfig);
      var auth = authMod.getAuth(app);
      var db = fsMod.getFirestore(app);

      authMod.onAuthStateChanged(auth, async function (user) {
        if (!user) {
          // Not signed in at all — nothing to gate against, send to login.
          goLogin();
          return;
        }

        if (FREE_IDS.has(algoId) || promoActive()) {
          reveal();
          return;
        }

        try {
          var snap = await fsMod.getDoc(fsMod.doc(db, 'users', user.uid));
          var data = snap.exists() ? snap.data() : null;
          var isSubscribed = !!(data && data.subscriptionActive && data.subscriptionExpiry > Date.now());
          if (isSubscribed) {
            reveal();
          } else {
            goPricing();
          }
        } catch (e) {
          console.error('premium-guard: subscription check failed', e);
          goPricing();
        }
      });
    } catch (e) {
      // If Firebase itself fails to load, fail closed for paid content
      // (unless the promo is active, in which case fail open).
      console.error('premium-guard: init failed', e);
      if (FREE_IDS.has(algoId) || promoActive()) {
        reveal();
      } else {
        goPricing();
      }
    }
  })();
})();
