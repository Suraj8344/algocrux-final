const fs = require('fs');

const tracker = `<!-- ===== TIME TRACKER ===== -->
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
  import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
  import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyDJZq_QDHd_2ZI3kKaeE16rS9zsbdny29E",
    authDomain: "algocrux8344.firebaseapp.com",
    projectId: "algocrux8344",
    storageBucket: "algocrux8344.firebasestorage.app",
    messagingSenderId: "915570389436",
    appId: "1:915570389436:web:cd97f604b5beb2e515fbb9",
    measurementId: "G-FFQ8CW124S"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const STORAGE_KEY = 'algo_time_start_' + location.pathname.replace(/\//g, '_');
  let uid = null;
  let startTime = parseInt(sessionStorage.getItem(STORAGE_KEY)) || Date.now();
  let hiddenTime = 0;
  let lastHidden = null;
  let hasSaved = false;

  if (!sessionStorage.getItem(STORAGE_KEY)) {
    sessionStorage.setItem(STORAGE_KEY, startTime.toString());
  }

  onAuthStateChanged(auth, (user) => {
    uid = user ? user.uid : null;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      lastHidden = Date.now();
    } else if (lastHidden) {
      hiddenTime += Date.now() - lastHidden;
      lastHidden = null;
    }
  });

  function getActiveSeconds() {
    const total = Date.now() - startTime;
    const active = total - hiddenTime;
    return Math.max(0, Math.floor(active / 1000));
  }

  async function getCurrentTotal() {
    if (!uid) return 0;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() ? (snap.data().totalTimeSpent || 0) : 0;
    } catch (e) { return 0; }
  }

  async function saveTime() {
    if (hasSaved || !uid) return;
    const seconds = getActiveSeconds();
    if (seconds < 3) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    hasSaved = true;
    sessionStorage.removeItem(STORAGE_KEY);
    const currentTotal = await getCurrentTotal();
    const newTotal = currentTotal + seconds;
    try {
      await setDoc(doc(db, 'users', uid), {
        totalTimeSpent: newTotal,
        lastActive: new Date().toISOString()
      }, { merge: true });
      console.log('Time saved:', seconds, 's | Total:', newTotal, 's');
    } catch (e) {
      console.error('Save failed:', e);
      hasSaved = false;
    }
  }

  window.addEventListener('beforeunload', () => saveTime());
  window.addEventListener('pagehide', () => { if (!hasSaved) saveTime(); });
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && !hasSaved) saveTime();
  });
</script> ===== -->
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
  import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
  import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyDJZq_QDHd_2ZI3kKaeE16rS9zsbdny29E",
    authDomain: "algocrux8344.firebaseapp.com",
    projectId: "algocrux8344",
    storageBucket: "algocrux8344.firebasestorage.app",
    messagingSenderId: "915570389436",
    appId: "1:915570389436:web:cd97f604b5beb2e515fbb9",
    measurementId: "G-FFQ8CW124S"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  let uid = null;
  let pageLoadTime = Date.now();
  let hiddenTime = 0;
  let lastHidden = null;
  let alreadySaved = false;

  onAuthStateChanged(auth, (user) => {
    uid = user ? user.uid : null;
  });

  // Track tab visibility
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      lastHidden = Date.now();
    } else if (lastHidden) {
      hiddenTime += Date.now() - lastHidden;
      lastHidden = null;
    }
  });

  function getActiveSeconds() {
    const total = Date.now() - pageLoadTime;
    const active = total - hiddenTime;
    return Math.max(0, Math.floor(active / 1000));
  }

  async function getCurrentTotal() {
    if (!uid) return 0;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() ? (snap.data().totalTimeSpent || 0) : 0;
    } catch (e) { return 0; }
  }

  async function saveTime() {
    if (alreadySaved || !uid) return;
    const seconds = getActiveSeconds();
    if (seconds < 5) return;

    alreadySaved = true;
    const currentTotal = await getCurrentTotal();
    const newTotal = currentTotal + seconds;

    try {
      await setDoc(doc(db, 'users', uid), {
        totalTimeSpent: newTotal,
        lastActive: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      alreadySaved = false;
    }
  }

  // Save when leaving page
  window.addEventListener('beforeunload', () => saveTime());

  // Auto-save every 20 seconds, then RESET timer
  setInterval(() => {
    if (!uid || document.hidden || alreadySaved) return;
    const seconds = getActiveSeconds();
    if (seconds >= 20) {
      saveTime().then(() => {
        // CRITICAL: Reset everything after save so we only count NEW time
        pageLoadTime = Date.now();
        hiddenTime = 0;
        lastHidden = null;
        alreadySaved = false;
      });
    }
  }, 20000);
</script>`;

fs.readdirSync('.').filter(f => f.endsWith('.html')).forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('TIME TRACKER')) {
    const start = content.indexOf('<!-- ===== TIME TRACKER ===== -->
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
  import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
  import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyDJZq_QDHd_2ZI3kKaeE16rS9zsbdny29E",
    authDomain: "algocrux8344.firebaseapp.com",
    projectId: "algocrux8344",
    storageBucket: "algocrux8344.firebasestorage.app",
    messagingSenderId: "915570389436",
    appId: "1:915570389436:web:cd97f604b5beb2e515fbb9",
    measurementId: "G-FFQ8CW124S"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const STORAGE_KEY = 'algo_time_start_' + location.pathname.replace(/\//g, '_');
  let uid = null;
  let startTime = parseInt(sessionStorage.getItem(STORAGE_KEY)) || Date.now();
  let hiddenTime = 0;
  let lastHidden = null;
  let hasSaved = false;

  if (!sessionStorage.getItem(STORAGE_KEY)) {
    sessionStorage.setItem(STORAGE_KEY, startTime.toString());
  }

  onAuthStateChanged(auth, (user) => {
    uid = user ? user.uid : null;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      lastHidden = Date.now();
    } else if (lastHidden) {
      hiddenTime += Date.now() - lastHidden;
      lastHidden = null;
    }
  });

  function getActiveSeconds() {
    const total = Date.now() - startTime;
    const active = total - hiddenTime;
    return Math.max(0, Math.floor(active / 1000));
  }

  async function getCurrentTotal() {
    if (!uid) return 0;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() ? (snap.data().totalTimeSpent || 0) : 0;
    } catch (e) { return 0; }
  }

  async function saveTime() {
    if (hasSaved || !uid) return;
    const seconds = getActiveSeconds();
    if (seconds < 3) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    hasSaved = true;
    sessionStorage.removeItem(STORAGE_KEY);
    const currentTotal = await getCurrentTotal();
    const newTotal = currentTotal + seconds;
    try {
      await setDoc(doc(db, 'users', uid), {
        totalTimeSpent: newTotal,
        lastActive: new Date().toISOString()
      }, { merge: true });
      console.log('Time saved:', seconds, 's | Total:', newTotal, 's');
    } catch (e) {
      console.error('Save failed:', e);
      hasSaved = false;
    }
  }

  window.addEventListener('beforeunload', () => saveTime());
  window.addEventListener('pagehide', () => { if (!hasSaved) saveTime(); });
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && !hasSaved) saveTime();
  });
</script>');
    const end = content.indexOf('</script>', start) + 9;
    content = content.slice(0, start) + tracker + content.slice(end);
    fs.writeFileSync(file, content);
    console.log('Replaced:', file);
  } else {
    content = content.replace('<!-- ===== TIME TRACKER ===== -->
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
  import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
  import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyDJZq_QDHd_2ZI3kKaeE16rS9zsbdny29E",
    authDomain: "algocrux8344.firebaseapp.com",
    projectId: "algocrux8344",
    storageBucket: "algocrux8344.firebasestorage.app",
    messagingSenderId: "915570389436",
    appId: "1:915570389436:web:cd97f604b5beb2e515fbb9",
    measurementId: "G-FFQ8CW124S"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const PAGE_ID = 'algo_page_' + Math.random().toString(36).substr(2, 9);
  const START_KEY = PAGE_ID + '_start';
  const SAVED_KEY = PAGE_ID + '_saved';

  let uid = null;
  let startTime = Date.now();
  let hiddenTime = 0;
  let lastHidden = null;

  sessionStorage.setItem(START_KEY, startTime.toString());

  onAuthStateChanged(auth, (user) => {
    uid = user ? user.uid : null;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      lastHidden = Date.now();
    } else if (lastHidden) {
      hiddenTime += Date.now() - lastHidden;
      lastHidden = null;
    }
  });

  function getActiveSeconds() {
    const stored = parseInt(sessionStorage.getItem(START_KEY)) || startTime;
    const total = Date.now() - stored;
    const active = total - hiddenTime;
    return Math.max(0, Math.floor(active / 1000));
  }

  async function getCurrentTotal() {
    if (!uid) return 0;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() ? (snap.data().totalTimeSpent || 0) : 0;
    } catch (e) { return 0; }
  }

  async function saveTime() {
    if (!uid) return;
    if (sessionStorage.getItem(SAVED_KEY) === 'true') return;
    const seconds = getActiveSeconds();
    if (seconds < 3) return;
    sessionStorage.setItem(SAVED_KEY, 'true');
    const currentTotal = await getCurrentTotal();
    const newTotal = currentTotal + seconds;
    try {
      await setDoc(doc(db, 'users', uid), {
        totalTimeSpent: newTotal,
        lastActive: new Date().toISOString()
      }, { merge: true });
      console.log('Saved:', seconds, 's | Total:', newTotal, 's');
    } catch (e) {
      sessionStorage.removeItem(SAVED_KEY);
    }
  }

  window.addEventListener('beforeunload', () => saveTime());
  window.addEventListener('pagehide', () => {
    if (sessionStorage.getItem(SAVED_KEY) !== 'true') saveTime();
  });
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && sessionStorage.getItem(SAVED_KEY) !== 'true') saveTime();
  });
</script>
<!-- ===== TIME TRACKER ===== -->
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
  import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
  import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyDJZq_QDHd_2ZI3kKaeE16rS9zsbdny29E",
    authDomain: "algocrux8344.firebaseapp.com",
    projectId: "algocrux8344",
    storageBucket: "algocrux8344.firebasestorage.app",
    messagingSenderId: "915570389436",
    appId: "1:915570389436:web:cd97f604b5beb2e515fbb9",
    measurementId: "G-FFQ8CW124S"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  let uid = null;
  let startTime = Date.now();
  let hiddenTime = 0;
  let lastHidden = null;
  let saved = false;

  onAuthStateChanged(auth, (user) => {
    uid = user ? user.uid : null;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      lastHidden = Date.now();
    } else if (lastHidden) {
      hiddenTime += Date.now() - lastHidden;
      lastHidden = null;
    }
  });

  function getSeconds() {
    return Math.max(0, Math.floor((Date.now() - startTime - hiddenTime) / 1000));
  }

  async function getTotal() {
    if (!uid) return 0;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() ? (snap.data().totalTimeSpent || 0) : 0;
    } catch (e) { return 0; }
  }

  async function save() {
    if (saved || !uid) return;
    const sec = getSeconds();
    if (sec < 3) return;
    saved = true;
    const total = await getTotal();
    try {
      await setDoc(doc(db, 'users', uid), {
        totalTimeSpent: total + sec,
        lastActive: new Date().toISOString()
      }, { merge: true });
      console.log('Saved:', sec, 'seconds');
    } catch (e) { saved = false; }
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link) save();
  });
</script>
</body>', tracker + '\n<!-- ===== TIME TRACKER ===== -->
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
  import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
  import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyDJZq_QDHd_2ZI3kKaeE16rS9zsbdny29E",
    authDomain: "algocrux8344.firebaseapp.com",
    projectId: "algocrux8344",
    storageBucket: "algocrux8344.firebasestorage.app",
    messagingSenderId: "915570389436",
    appId: "1:915570389436:web:cd97f604b5beb2e515fbb9",
    measurementId: "G-FFQ8CW124S"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const PAGE_ID = 'algo_page_' + Math.random().toString(36).substr(2, 9);
  const START_KEY = PAGE_ID + '_start';
  const SAVED_KEY = PAGE_ID + '_saved';

  let uid = null;
  let startTime = Date.now();
  let hiddenTime = 0;
  let lastHidden = null;

  sessionStorage.setItem(START_KEY, startTime.toString());

  onAuthStateChanged(auth, (user) => {
    uid = user ? user.uid : null;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      lastHidden = Date.now();
    } else if (lastHidden) {
      hiddenTime += Date.now() - lastHidden;
      lastHidden = null;
    }
  });

  function getActiveSeconds() {
    const stored = parseInt(sessionStorage.getItem(START_KEY)) || startTime;
    const total = Date.now() - stored;
    const active = total - hiddenTime;
    return Math.max(0, Math.floor(active / 1000));
  }

  async function getCurrentTotal() {
    if (!uid) return 0;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() ? (snap.data().totalTimeSpent || 0) : 0;
    } catch (e) { return 0; }
  }

  async function saveTime() {
    if (!uid) return;
    if (sessionStorage.getItem(SAVED_KEY) === 'true') return;
    const seconds = getActiveSeconds();
    if (seconds < 3) return;
    sessionStorage.setItem(SAVED_KEY, 'true');
    const currentTotal = await getCurrentTotal();
    const newTotal = currentTotal + seconds;
    try {
      await setDoc(doc(db, 'users', uid), {
        totalTimeSpent: newTotal,
        lastActive: new Date().toISOString()
      }, { merge: true });
      console.log('Saved:', seconds, 's | Total:', newTotal, 's');
    } catch (e) {
      sessionStorage.removeItem(SAVED_KEY);
    }
  }

  window.addEventListener('beforeunload', () => saveTime());
  window.addEventListener('pagehide', () => {
    if (sessionStorage.getItem(SAVED_KEY) !== 'true') saveTime();
  });
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && sessionStorage.getItem(SAVED_KEY) !== 'true') saveTime();
  });
</script>
<!-- ===== TIME TRACKER ===== -->
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
  import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
  import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyDJZq_QDHd_2ZI3kKaeE16rS9zsbdny29E",
    authDomain: "algocrux8344.firebaseapp.com",
    projectId: "algocrux8344",
    storageBucket: "algocrux8344.firebasestorage.app",
    messagingSenderId: "915570389436",
    appId: "1:915570389436:web:cd97f604b5beb2e515fbb9",
    measurementId: "G-FFQ8CW124S"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  let uid = null;
  let startTime = Date.now();
  let hiddenTime = 0;
  let lastHidden = null;
  let saved = false;

  onAuthStateChanged(auth, (user) => {
    uid = user ? user.uid : null;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      lastHidden = Date.now();
    } else if (lastHidden) {
      hiddenTime += Date.now() - lastHidden;
      lastHidden = null;
    }
  });

  function getSeconds() {
    return Math.max(0, Math.floor((Date.now() - startTime - hiddenTime) / 1000));
  }

  async function getTotal() {
    if (!uid) return 0;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() ? (snap.data().totalTimeSpent || 0) : 0;
    } catch (e) { return 0; }
  }

  async function save() {
    if (saved || !uid) return;
    const sec = getSeconds();
    if (sec < 3) return;
    saved = true;
    const total = await getTotal();
    try {
      await setDoc(doc(db, 'users', uid), {
        totalTimeSpent: total + sec,
        lastActive: new Date().toISOString()
      }, { merge: true });
      console.log('Saved:', sec, 'seconds');
    } catch (e) { saved = false; }
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link) save();
  });
</script>
</body>');
    fs.writeFileSync(file, content);
    console.log('Added:', file);
  }
});
console.log('\nDone! Final tracker installed.');
