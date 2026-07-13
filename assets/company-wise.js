/* ===================================================================
   Company Wise DSA — shared logic
   Depends on COMPANY_DATA from assets/company-data.js
   All user progress (solved / bookmark / revision / notes) is stored
   in localStorage, namespaced under "cw_" so it never collides with
   the site's existing Firebase-backed animation progress/bookmarks.
=================================================================== */
(function (global) {
  "use strict";

  const LS_KEYS = {
    solved: "cw_solved",       // Set of "company::slug"
    bookmarked: "cw_bookmarked",
    revision: "cw_revision",
    notes: "cw_notes",         // { "company::slug": "text" }
    solvedLog: "cw_solved_log" // { "company::slug": timestampISO }
  };

  function readSet(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) { return new Set(); }
  }
  function writeSet(key, set) {
    try { localStorage.setItem(key, JSON.stringify([...set])); } catch (e) {}
  }
  function readObj(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function writeObj(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
  }

  function qKey(companySlug, questionSlug) { return companySlug + "::" + questionSlug; }

  const State = {
    solved: readSet(LS_KEYS.solved),
    bookmarked: readSet(LS_KEYS.bookmarked),
    revision: readSet(LS_KEYS.revision),
    notes: readObj(LS_KEYS.notes),
    solvedLog: readObj(LS_KEYS.solvedLog),

    isSolved(k) { return this.solved.has(k); },
    isBookmarked(k) { return this.bookmarked.has(k); },
    isRevision(k) { return this.revision.has(k); },

    toggleSolved(k) {
      if (this.solved.has(k)) { this.solved.delete(k); delete this.solvedLog[k]; }
      else { this.solved.add(k); this.solvedLog[k] = new Date().toISOString(); }
      writeSet(LS_KEYS.solved, this.solved);
      writeObj(LS_KEYS.solvedLog, this.solvedLog);
    },
    toggleBookmarked(k) {
      this.bookmarked.has(k) ? this.bookmarked.delete(k) : this.bookmarked.add(k);
      writeSet(LS_KEYS.bookmarked, this.bookmarked);
    },
    toggleRevision(k) {
      this.revision.has(k) ? this.revision.delete(k) : this.revision.add(k);
      writeSet(LS_KEYS.revision, this.revision);
    },
    setNote(k, text) {
      if (text && text.trim()) this.notes[k] = text.trim(); else delete this.notes[k];
      writeObj(LS_KEYS.notes, this.notes);
    },
    getNote(k) { return this.notes[k] || ""; },

    solvedTodayCount() {
      const today = new Date().toDateString();
      return Object.values(this.solvedLog).filter(iso => new Date(iso).toDateString() === today).length;
    }
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function diffClass(d) {
    if (d === "Easy") return "diff-easy";
    if (d === "Medium") return "diff-medium";
    return "diff-hard";
  }

  /* ---------------- HUB PAGE ---------------- */
  const HUB_BATCH = 12;
  let hubState = { filtered: [], rendered: 0, activeDiff: "all", activeLetter: null, query: "" };

  function companiesArray() {
    return Object.values(COMPANY_DATA).sort((a, b) => a.name.localeCompare(b.name));
  }

  function companyMatchesQuery(c, q) {
    if (!q) return true;
    q = q.toLowerCase();
    if (c.name.toLowerCase().includes(q)) return true;
    return c.questions.some(qq =>
      qq.title.toLowerCase().includes(q) ||
      qq.topics.some(t => t.toLowerCase().includes(q)) ||
      qq.difficulty.toLowerCase().includes(q)
    );
  }

  function companyDiffCount(c, diff) {
    if (diff === "all") return c.total;
    return c.counts[diff] || 0;
  }

  function renderDashboard() {
    const all = companiesArray();
    const totalQ = all.reduce((s, c) => s + c.total, 0);
    document.getElementById("dTotalCompanies").textContent = all.length;
    document.getElementById("dTotalQuestions").textContent = totalQ;
    document.getElementById("dSolved").textContent = State.solved.size;
    document.getElementById("dBookmarked").textContent = State.bookmarked.size;
    document.getElementById("dRevision").textContent = State.revision.size;
    document.getElementById("dToday").textContent = State.solvedTodayCount();
  }

  function buildAZRow() {
    const row = document.getElementById("azRow");
    if (!row) return;
    const letters = ["All", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];
    row.innerHTML = letters.map(l =>
      `<span class="az-btn ${l === 'All' ? 'active' : ''}" data-letter="${l}">${l}</span>`
    ).join("");
    row.addEventListener("click", e => {
      const btn = e.target.closest(".az-btn");
      if (!btn) return;
      row.querySelectorAll(".az-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      hubState.activeLetter = btn.dataset.letter === "All" ? null : btn.dataset.letter;
      applyFilters();
    });
  }

  function companyCardHTML(c) {
    const k = window.location.pathname; // unused placeholder to keep template simple
    const pct = c.total ? Math.round((countSolvedForCompany(c) / c.total) * 100) : 0;
    return `
    <a href="company.html?c=${c.slug}" class="company-card ${c.curated ? "curated" : ""}">
      <div class="cc-top">
        <div class="cc-logo" style="background:var(--${c.color}-bg);color:var(--${c.color})">${esc(c.initial)}</div>
        <div>
          <div class="cc-name">${esc(c.name)}</div>
          <div class="cc-count">${c.total} question${c.total === 1 ? "" : "s"}</div>
        </div>
      </div>
      <div class="cc-diffs">
        <span class="diff-easy">${c.counts.Easy || 0} Easy</span>
        <span class="diff-medium">${c.counts.Medium || 0} Med</span>
        <span class="diff-hard">${c.counts.Hard || 0} Hard</span>
      </div>
      <div class="cc-bar"><i style="width:${pct}%"></i></div>
      <div class="cc-foot">
        <span>${pct}% solved</span>
        <span class="go">Open →</span>
      </div>
    </a>`;
  }

  function countSolvedForCompany(c) {
    let n = 0;
    for (const q of c.questions) if (State.isSolved(qKey(c.slug, q.slug))) n++;
    return n;
  }

  function applyFilters() {
    const all = companiesArray();
    hubState.filtered = all.filter(c => {
      if (hubState.activeLetter && !c.name.toUpperCase().startsWith(hubState.activeLetter)) return false;
      if (!companyMatchesQuery(c, hubState.query)) return false;
      if (hubState.activeDiff !== "all" && companyDiffCount(c, hubState.activeDiff) === 0) return false;
      return true;
    });
    hubState.rendered = 0;
    const grid = document.getElementById("companyGrid");
    grid.innerHTML = "";
    document.getElementById("emptyState").style.display = hubState.filtered.length ? "none" : "block";
    renderMoreCards();
  }

  function renderMoreCards() {
    const grid = document.getElementById("companyGrid");
    const slice = hubState.filtered.slice(hubState.rendered, hubState.rendered + HUB_BATCH);
    grid.insertAdjacentHTML("beforeend", slice.map(companyCardHTML).join(""));
    hubState.rendered += slice.length;
    renderLoadMore();
  }

  function renderLoadMore() {
    let wrap = document.getElementById("loadMoreWrap");
    if (wrap) wrap.remove();
    if (hubState.rendered >= hubState.filtered.length) return;
    const section = document.getElementById("companies");
    wrap = document.createElement("div");
    wrap.className = "load-more-wrap";
    wrap.id = "loadMoreWrap";
    wrap.innerHTML = `<button class="btn btn-ghost" id="loadMoreBtn">Load more companies (${hubState.filtered.length - hubState.rendered} left)</button>`;
    document.getElementById("emptyState").insertAdjacentElement("beforebegin", wrap);
    document.getElementById("loadMoreBtn").addEventListener("click", renderMoreCards);
  }

  function initHubPage() {
    renderDashboard();
    buildAZRow();

    document.getElementById("companySearch").addEventListener("input", e => {
      hubState.query = e.target.value.trim();
      applyFilters();
    });

    document.getElementById("diffFilterRow").addEventListener("click", e => {
      const pill = e.target.closest(".pill[data-df]");
      if (!pill) return;
      document.querySelectorAll("#diffFilterRow .pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      hubState.activeDiff = pill.dataset.df;
      applyFilters();
    });

    applyFilters();
  }

  /* ---------------- COMPANY DETAIL PAGE ---------------- */
  const DETAIL_BATCH = 20;
  let detailState = { company: null, filtered: [], rendered: 0, query: "", diff: "all", topic: "all" };

  function getCompanyFromURL() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("c");
    return slug ? COMPANY_DATA[slug] : null;
  }

  function allTopicsFor(c) {
    const set = new Set();
    c.questions.forEach(q => q.topics.forEach(t => set.add(t)));
    return [...set].sort();
  }

  function questionRowHTML(c, q) {
    const k = qKey(c.slug, q.slug);
    const solved = State.isSolved(k);
    const bookmarked = State.isBookmarked(k);
    const revision = State.isRevision(k);
    const openBtn = q.local
      ? `<a href="${esc(q.local)}" class="qbtn qbtn-open" title="Open existing AlgoCrux walkthrough">Open Question</a>`
      : `<span class="qbtn qbtn-soon" title="Not yet built on AlgoCrux">Coming Soon</span>`;
    return `
    <tr data-key="${esc(k)}" data-title="${esc(q.title.toLowerCase())}" data-topics="${esc(q.topics.join(",").toLowerCase())}" data-diff="${esc(q.difficulty)}">
      <td class="qcell-main">
        <div class="qtitle">${esc(q.title)}</div>
        <div class="qtopics">${q.topics.map(t => `<span class="topic-chip">${esc(t)}</span>`).join("")}</div>
      </td>
      <td><span class="diff ${diffClass(q.difficulty)}">${esc(q.difficulty)}</span></td>
      <td class="qcell-freq">${q.frequency ? q.frequency.toFixed(1) + "%" : "—"}</td>
      <td class="qcell-acc">${q.acceptance != null ? q.acceptance.toFixed(1) + "%" : "—"}</td>
      <td class="qcell-actions">
        <button class="icon-btn ${bookmarked ? "on" : ""}" data-act="bookmark" title="Bookmark">★</button>
        <button class="icon-btn ${solved ? "on" : ""}" data-act="solved" title="Mark solved">✓</button>
        <button class="icon-btn ${revision ? "on" : ""}" data-act="revision" title="Add to revision">↻</button>
        <a href="${esc(q.leetcode)}" target="_blank" rel="noopener" class="icon-btn" title="Open on LeetCode">LC</a>
        ${openBtn}
      </td>
    </tr>`;
  }

  function applyDetailFilters() {
    const c = detailState.company;
    detailState.filtered = c.questions.filter(q => {
      if (detailState.diff !== "all" && q.difficulty !== detailState.diff) return false;
      if (detailState.topic !== "all" && !q.topics.includes(detailState.topic)) return false;
      if (detailState.query) {
        const s = detailState.query.toLowerCase();
        if (!q.title.toLowerCase().includes(s) && !q.topics.some(t => t.toLowerCase().includes(s))) return false;
      }
      return true;
    });
    detailState.rendered = 0;
    const tbody = document.getElementById("qTableBody");
    tbody.innerHTML = "";
    document.getElementById("qEmpty").style.display = detailState.filtered.length ? "none" : "block";
    renderMoreRows();
    updateProgressUI();
  }

  function renderMoreRows() {
    const c = detailState.company;
    const tbody = document.getElementById("qTableBody");
    const slice = detailState.filtered.slice(detailState.rendered, detailState.rendered + DETAIL_BATCH);
    tbody.insertAdjacentHTML("beforeend", slice.map(q => questionRowHTML(c, q)).join(""));
    detailState.rendered += slice.length;
    let wrap = document.getElementById("qLoadMoreWrap");
    if (wrap) wrap.remove();
    if (detailState.rendered < detailState.filtered.length) {
      const table = document.getElementById("qTableWrap");
      wrap = document.createElement("div");
      wrap.className = "load-more-wrap";
      wrap.id = "qLoadMoreWrap";
      wrap.innerHTML = `<button class="btn btn-ghost" id="qLoadMoreBtn">Load more questions (${detailState.filtered.length - detailState.rendered} left)</button>`;
      table.insertAdjacentElement("afterend", wrap);
      document.getElementById("qLoadMoreBtn").addEventListener("click", renderMoreRows);
    }
  }

  function updateProgressUI() {
    const c = detailState.company;
    const solved = countSolvedForCompany(c);
    const pct = c.total ? Math.round((solved / c.total) * 100) : 0;
    document.getElementById("pgSolved").textContent = solved;
    document.getElementById("pgRemaining").textContent = c.total - solved;
    document.getElementById("pgBar").style.width = pct + "%";
    document.getElementById("pgPct").textContent = pct + "%";
    ["Easy", "Medium", "Hard"].forEach(d => {
      const total = c.counts[d] || 0;
      const done = c.questions.filter(q => q.difficulty === d && State.isSolved(qKey(c.slug, q.slug))).length;
      const el = document.getElementById("pg" + d);
      if (el) el.textContent = total ? Math.round((done / total) * 100) + "%" : "—";
    });
  }

  function initDetailPage() {
    const c = getCompanyFromURL();
    const notFound = document.getElementById("companyNotFound");
    const content = document.getElementById("companyContent");
    if (!c) {
      notFound.style.display = "block";
      content.style.display = "none";
      return;
    }
    detailState.company = c;
    notFound.style.display = "none";
    content.style.display = "block";

    document.title = c.name + " DSA Questions — AlgoCrux";
    document.getElementById("companyLogo").textContent = c.initial;
    document.getElementById("companyLogo").style.background = `var(--${c.color}-bg)`;
    document.getElementById("companyLogo").style.color = `var(--${c.color})`;
    document.getElementById("companyName").textContent = c.name;
    document.getElementById("companyMeta").textContent =
      `${c.total} questions - ${c.counts.Easy || 0} Easy - ${c.counts.Medium || 0} Medium - ${c.counts.Hard || 0} Hard`;
    if (c.curated) {
      document.getElementById("curatedNote").style.display = "block";
    }

    // Topic filter
    const topics = allTopicsFor(c);
    const topicSel = document.getElementById("topicFilter");
    topics.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t; opt.textContent = t;
      topicSel.appendChild(opt);
    });
    topicSel.addEventListener("change", () => { detailState.topic = topicSel.value; applyDetailFilters(); });

    document.getElementById("qSearch").addEventListener("input", e => {
      detailState.query = e.target.value.trim();
      applyDetailFilters();
    });
    document.getElementById("diffFilterRow").addEventListener("click", e => {
      const pill = e.target.closest(".pill[data-df]");
      if (!pill) return;
      document.querySelectorAll("#diffFilterRow .pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      detailState.diff = pill.dataset.df;
      applyDetailFilters();
    });

    document.getElementById("qTableBody").addEventListener("click", e => {
      const btn = e.target.closest(".icon-btn[data-act]");
      if (!btn) return;
      const tr = btn.closest("tr");
      const k = tr.dataset.key;
      if (btn.dataset.act === "bookmark") { State.toggleBookmarked(k); btn.classList.toggle("on"); }
      if (btn.dataset.act === "solved") { State.toggleSolved(k); btn.classList.toggle("on"); updateProgressUI(); }
      if (btn.dataset.act === "revision") { State.toggleRevision(k); btn.classList.toggle("on"); }
    });

    applyDetailFilters();
  }

  global.CompanyWise = { initHubPage, initDetailPage, State, qKey };
})(window);
