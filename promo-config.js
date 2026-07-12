/* =====================================================================
   promo-config.js
   -----------------------------------------------------------------------
   Single source of truth for the "free for everyone" promo window.
   Every gated page (premium-guard.js, index.html, chart.html) reads
   these two dates. To start, extend, or end the promo, edit ONLY this
   file and redeploy — nothing else needs to change.

   Format: ISO 8601 with timezone. IST is +05:30.
   ===================================================================== */
window.ALGOCRUX_PROMO = {
  // Promo begins July 14, 2026, 00:00 IST
  start: '2026-07-11T00:00:00+05:30',
  // Promo ends July 24, 2026, 23:59:59 IST (10 full days — adjust to
  // '2026-07-21T23:59:59+05:30' for a 7-day window instead)
  end: '2026-07-24T23:59:59+05:30'
};

window.isAlgocruxPromoActive = function () {
  var now = Date.now();
  var start = Date.parse(window.ALGOCRUX_PROMO.start);
  var end = Date.parse(window.ALGOCRUX_PROMO.end);
  return now >= start && now <= end;
};
