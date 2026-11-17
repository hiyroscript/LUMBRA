/* ---- dev.js ---- */
/* ============================================================================
   DEV — developer build only. tools/build-release.sh deletes this file (and
   js/dev-config.js) from the release, and its guard fails the build if any of
   it is left behind. Loaded after game.js, which calls SHKR_DEV_INIT once with
   its debug handle when boot is done.
   - first load (no developer save yet): every level unlocked, three rainbow stars
   - Settings gets a developer section: unlock all, reset, put progress back
   - a DEV badge in the home header
   Saves go to shadowskirr.dev.v1 (set by dev-config.js), never shadowskirr.v1.
   ========================================================================== */
(function () {
  "use strict";
  const DEV_KEY = "shadowskirr.dev.v1", SNAP_KEY = "shadowskirr.dev.snapshot";
  const pad2 = function (n) { return (n < 10 ? "0" : "") + n; };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  const CSS =
    "#home .tag.shkr-dev-badge{background:var(--ink);color:#fff;flex:0 0 auto;margin-right:auto;font-weight:700}" +
    ".shkr-dev{margin-top:28px}" +
    ".shkr-dev-head{display:flex;align-items:baseline;justify-content:space-between;gap:6px 14px;flex-wrap:wrap;" +
      "padding-bottom:10px;border-bottom:1px solid var(--line)}" +
    ".shkr-dev-head b{font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:var(--fg)}" +
    ".shkr-dev-head span{font-family:var(--mono);font-size:10px;letter-spacing:.08em;color:var(--faint)}" +
    ".shkr-dev .chip:disabled{opacity:.35;cursor:default;transform:none}" +
    ".shkr-dev .chip:disabled:hover{background:none}";

  window.SHKR_DEV_INIT = function (api) {
    /* Without dev-config.js game.js is on the real save key: stay off so a player's progress is never touched. */
    if (!window.SHKR_DEV || window.SHKR_DEV.saveKey !== DEV_KEY) {
      console.warn("[shadow skirr dev] js/dev-config.js did not load before sim.js; developer tools are off.");
      return;
    }
    const N = api.N;

    /* ---------------- progress helpers ---------------- */
    function current() { const S = api.S(); return { unlocked: S.unlocked, sel: S.sel, rec: JSON.parse(JSON.stringify(S.rec)) }; }
    function rainbow() { const rec = {}; for (let n = 1; n <= N; n++) rec[n] = { t: 1, s: 4, d: true }; return { unlocked: N, sel: api.S().sel, rec: rec }; }
    function fresh() { return { unlocked: 1, sel: 1, rec: {} }; }
    function summary(p) {
      let done = 0, rb = 0;
      for (let n = 1; n <= N; n++) { const r = p.rec && p.rec[n]; if (r && r.d) { done++; if (r.s === 4) rb++; } }
      return pad2(p.unlocked) + " / " + N + " unlocked, " + done + " cleared, " + rb + " rainbow";
    }
    function readSnap() {
      const str = lsGet(SNAP_KEY);
      if (str === null) return null;
      try { const o = JSON.parse(str); return o && typeof o === "object" && o.rec && typeof o.rec === "object" ? o : null; } catch (e) { return null; }
    }
    function snapshot() { lsSet(SNAP_KEY, JSON.stringify(current())); }
    /* replace unlocked / sel / rec, keep music and shake, then repaint the way the normal reset does */
    function apply(p, goHome) {
      const S = api.S();
      api.setS({ music: S.music, shake: S.shake, sel: p.sel, unlocked: p.unlocked, rec: p.rec });
      api.saveState(); api.paintHome(false); api.paintLevels();
      if (goHome) { api.show("home"); api.startHome(); }
      paintPanel();
    }
    function confirmCard(title, body, verb, fn) {
      api.showCard({ eyebrow: "developer", title: title, body: body,
        acts: [{ t: verb, danger: true, fn: function () { api.hideCard(); fn(); } }, { t: "cancel", fn: api.hideCard }] });
    }

    /* ---------------- DOM ---------------- */
    const style = document.createElement("style");
    style.id = "shkr-dev-style"; style.textContent = CSS;
    document.head.appendChild(style);
    document.title = "DEV · " + document.title;

    const brand = document.querySelector("#home header .tag");
    if (brand) {
      const badge = document.createElement("span");
      badge.className = "tag shkr-dev-badge"; badge.id = "shkrDevBadge"; badge.textContent = "dev"; badge.title = "Developer build";
      brand.parentNode.insertBefore(badge, brand.nextSibling);
    }

    const row = function (label, desc, ctl, descId) {
      return '<div class="set-row"><div class="lbl"><b>' + label + "</b><span" + (descId ? ' id="' + descId + '"' : "") + ">" + desc + "</span></div>" +
        '<div class="set-ctl">' + ctl + "</div></div>";
    };
    const sec = document.createElement("div");
    sec.className = "shkr-dev"; sec.id = "shkrDev";
    sec.innerHTML =
      '<div class="shkr-dev-head"><b>developer</b><span id="shkrDevNow"></span></div>' +
      row("Unlock all (rainbow)", "Every level unlocked with three rainbow stars.", '<button class="chip" id="shkrDevUnlock">unlock all</button>') +
      row("Reset progress", "Back to a fresh game: level 01 only, no stars, no tries.", '<button class="chip danger" id="shkrDevReset">reset</button>') +
      row("Put progress back", "", '<button class="chip" id="shkrDevBack">put back</button>', "shkrDevSnap");
    const body = document.querySelector("#settings .panel-body");
    if (body) body.appendChild(sec);
    const backBtn = sec.querySelector("#shkrDevBack"), snapEl = sec.querySelector("#shkrDevSnap"), nowEl = sec.querySelector("#shkrDevNow");

    function paintPanel() {
      const s = readSnap();
      nowEl.textContent = "saves to " + DEV_KEY + " · now " + summary(api.S());
      backBtn.disabled = !s;
      snapEl.textContent = s ? "Back to how it was before the last reset or unlock all: " + summary(s) + "."
        : "No snapshot yet. Reset and unlock all take one first.";
    }

    /* ---------------- actions ---------------- */
    sec.querySelector("#shkrDevUnlock").addEventListener("click", function () {
      confirmCard("Unlock everything?", "Every level is unlocked with three rainbow stars. Current progress is snapshotted first, so it can be put back.",
        "unlock all", function () { snapshot(); apply(rainbow(), true); });
    });
    sec.querySelector("#shkrDevReset").addEventListener("click", function () {
      confirmCard("Reset to a fresh game?", "Only level 01 stays unlocked, with no stars and no tries. Current progress is snapshotted first, so it can be put back.",
        "reset", function () { snapshot(); apply(fresh(), true); });
    });
    backBtn.addEventListener("click", function () {
      const s = readSnap(); if (!s) return;
      confirmCard("Put progress back?", "Restores " + summary(s) + ", exactly as it was right before the last reset or unlock all. Current progress is replaced.",
        "put back", function () {
          const snap = readSnap(); if (!snap) return;
          lsDel(SNAP_KEY);
          apply({ unlocked: snap.unlocked, sel: snap.sel, rec: snap.rec }, true);
        });
    });
    /* progress changes while playing, so refresh the panel whenever Settings opens */
    Array.prototype.forEach.call(document.querySelectorAll('[data-go="settings"]'), function (b) { b.addEventListener("click", paintPanel); });

    /* ---------------- default developer state ---------------- */
    if (lsGet(DEV_KEY) === null) apply(rainbow(), false);
    else paintPanel();
  };
})();
