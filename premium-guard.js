/* =====================================================================
   premium-guard.js
   -----------------------------------------------------------------------
   THE FIX: previously a question page (questions/<category>/*.html) rendered its
   full content the moment it loaded — nothing on the page itself checked
   whether the visitor was signed in or subscribed. Any entry point that
   linked straight to a question file (the Patterns Map in chart.html,
   the dashboard's recent-activity list, search, or just a typed/bookmarked
   URL) bypassed premium checking entirely.

   This script is loaded as the very first thing in <head> on every
   question page (a plain, blocking <script src="...">, NOT type=module,
   so it runs before the rest of <head>/<body> is parsed) and:
     1. Hides the page instantly so nothing can flash on screen.
     2. Confirms the visitor is signed in (Firebase Auth).
     3. Looks up their Firestore user doc and checks
        subscriptionActive && subscriptionExpiry > Date.now() — the same
        source of truth index.html already uses for the algo gallery.
     4. Reveals the page only if the question is free OR the visitor has
        an active subscription; otherwise redirects to login.html /
        pricing.html before any question content is visible.
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

  // Root-relative path to this file's project root. Derived from the src
  // attribute used to load THIS script (e.g. "../../premium-guard.js" or
  // "../premium-guard.js"), so it automatically matches however deep the
  // current page is nested — no hardcoded folder depth needed.
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

        if (FREE_IDS.has(algoId)) {
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
      // If Firebase itself fails to load, fail closed for paid content.
      console.error('premium-guard: init failed', e);
      if (!FREE_IDS.has(algoId)) {
        goPricing();
      } else {
        reveal();
      }
    }
  })();
})();
