/* ---- game.js ---- */
/* ============================================================================
   GAME — state, clock, input, HUD, home screen, results, rebirth.
   UI behaviour follows hiyroscript/vl (screens, cards, wipe, pause rules).
   ========================================================================== */
(function () {
  "use strict";
  const $ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  const pad2 = function (n) { return (n < 10 ? "0" : "") + n; };
  const now = function () { return performance.now() / 1000; };
  const TPB = SIM.TPB, DX = SIM.DX, CH = SIM.CH, N = LEVELS.length;
  const TOUCH = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  const FIX = typeof FIXES !== "undefined" ? FIXES : {};

  /* ---------------- saved state ---------------- */
  /* An optional global can point the save at another key (the developer build uses its own, see README "Builds").
     Without it, which is always the case in the release build, the key is the real one. */
  const REAL_KEY = "shadowskirr.v1";
  const KEY = (window.SHKR_DEV && window.SHKR_DEV.saveKey) || REAL_KEY, LEGACY_KEY = "lumbra.v1", DEFAULTS = { music: 0.8, shake: true, sel: 1, unlocked: 1, rec: {} };
  let S = loadState();
  function loadState() {
    let raw = {}, str = null;
    try { str = localStorage.getItem(KEY); } catch (e) { str = null; }
    /* one-time migration from the old save key; the new key wins if both exist. Only for the real key. */
    if (KEY === REAL_KEY) {
      let legacy = null;
      try { legacy = localStorage.getItem(LEGACY_KEY); } catch (e) { legacy = null; }
      if (legacy !== null) {
        if (str === null) { str = legacy; try { localStorage.setItem(KEY, legacy); } catch (e) {} }
        try { if (localStorage.getItem(KEY) !== null) localStorage.removeItem(LEGACY_KEY); } catch (e) {}
      }
    }
    try { raw = JSON.parse(str || "{}") || {}; } catch (e) { raw = {}; }
    return checkState(raw);
  }
  /* the validation every state goes through, whether loaded or set through the debug handle */
  function checkState(raw) {
    const o = {};
    for (const k in DEFAULTS) o[k] = raw[k] !== undefined && raw[k] !== null ? raw[k] : JSON.parse(JSON.stringify(DEFAULTS[k]));
    o.unlocked = Math.max(1, Math.min(N, o.unlocked | 0 || 1)); o.sel = Math.max(1, Math.min(N, o.sel | 0 || 1));
    if (typeof o.rec !== "object" || !o.rec) o.rec = {};
    return o;
  }
  function setS(obj) { S = checkState(obj || {}); return S; }
  function saveState() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function rec(n) { return S.rec[n] || (S.rec[n] = { t: 0, s: 0, d: false }); }
  function starsFor(t) { return t <= 1 ? 4 : t <= 3 ? 3 : t <= 7 ? 2 : 1; }   /* 4 = three rainbow stars */
  function starsHTML(v, cls) {
    let h = '<div class="stars' + (cls ? " " + cls : "") + '">';
    for (let i = 0; i < 3; i++) h += '<i class="star' + (v === 4 ? " rb" : i < v ? " on" : "") + '"></i>';
    return h + "</div>";
  }

  /* ---------------- levels ---------------- */
  const cache = {};
  function getL(n) { if (!cache[n]) { const d = LEVELS[n - 1]; d.fix = FIX[n] || []; cache[n] = SIM.compile(d); } return cache[n]; }
  const homeL = SIM.compile(HOME);
  const demoL = SIM.compile(Object.assign({}, HOME, { form: new Array(HOME.loops + 1).join(HOME.form + " ") }));
  const demoIn = []; (function () { const r = DEMO_SOL.rle; for (let i = 0; i < r.length; i += 2) for (let k = 0; k < r[i + 1]; k++) demoIn.push(r[i]); })();
  const DEMO_BEATS = homeL.bars * 4 * HOME.loops;
  let homeSong = null;

  /* ---------------- clock: audio time, smoothed against the frame clock ---------------- */
  const clock = {
    off: null, t0p: 0,
    start: function () { this.off = null; this.t0p = now() + 0.1; },
    beat: function (spb) {
      const c = MUSIC.ctx;
      if (c && c.state === "running" && MUSIC.song) {
        const lat = Math.min(0.3, c.outputLatency || c.baseLatency || 0), d = c.currentTime - lat - now();
        if (this.off === null || Math.abs(d - this.off) > 0.06) this.off = d; else this.off += (d - this.off) * 0.04;
        return (now() + this.off - MUSIC.t0) / spb;
      }
      return (now() - this.t0p) / spb;
    }
  };

  const G = { mode: "splash", paused: false, n: 1, def: null, L: null, song: null, st: null, tryN: 1, session: 0, beat: 0, beat0: 0, spb: 0.5,
    deadAt: 0, wonAt: 0, squash: 0, restY: 0, snap: true, cardUp: false, pauseT: 0 };
  const keys = { j: false, s: false, qj: false, qs: false };

  /* ---------------- screens ---------------- */
  const SCREENS = ["splash", "home", "settings", "levels"];
  function show(id) {
    SCREENS.forEach(function (s) { const el = document.getElementById(s); el.classList.toggle("on", s === id); el.classList.remove("enter"); });
    const el = document.getElementById(id);
    if (el && id !== "splash") { void el.offsetWidth; el.classList.add("enter"); }
    if (id === "levels") paintLevels();
    if (id === "home") paintHome(true);
  }
  $$("[data-go]").forEach(function (b) { b.addEventListener("click", function () { show(b.dataset.go); }); });

  /* ---------------- cards ---------------- */
  const overlay = $("#overlay"), cardEl = $("#card");
  let cardActs = [];
  function showCard(o) {
    let html = "";
    if (o.eyebrow) html += '<div class="eyebrow">' + o.eyebrow + "</div>";
    if (o.title) html += "<h2>" + o.title + "</h2>";
    if (o.stars !== undefined) html += starsHTML(o.stars, "big");
    if (o.body) html += "<p>" + o.body + "</p>";
    if (o.stats) { html += '<div class="stat-row">'; o.stats.forEach(function (s) { html += "<div><b>" + s[0] + "</b><span>" + s[1] + "</span></div>"; }); html += "</div>"; }
    html += '<div class="acts">';
    (o.acts || []).forEach(function (a, i) { html += '<button class="chip' + (a.solid ? " solid" : "") + (a.danger ? " danger" : "") + '" data-act="' + i + '">' + a.t + "</button>"; });
    html += "</div>";
    cardEl.innerHTML = html; cardActs = o.acts || []; overlay.classList.add("on"); G.cardUp = true;
    cardEl.style.animation = "none"; void cardEl.offsetWidth; cardEl.style.animation = "";
    if (o.stars !== undefined) $$(".stars.big .star", cardEl).forEach(function (el, i) { setTimeout(function () { el.classList.add("pop"); }, 260 + i * 280); });
  }
  function hideCard() { overlay.classList.remove("on"); cardEl.innerHTML = ""; cardActs = []; G.cardUp = false; }
  overlay.addEventListener("click", function (e) {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const a = cardActs[+b.dataset.act]; if (a && a.fn) a.fn();
  });

  /* ---------------- home ---------------- */
  function setLetters(el, text) {
    el.innerHTML = "";
    text.split(" ").forEach(function (word, wi, arr) {
      const w = document.createElement("span"); w.style.whiteSpace = "nowrap"; w.style.animation = "none";
      word.split("").forEach(function (ch, i) { const s = document.createElement("span"); s.textContent = ch; s.style.animationDelay = (wi * 0.12 + i * 0.03) + "s"; w.appendChild(s); });
      el.appendChild(w); if (wi < arr.length - 1) el.appendChild(document.createTextNode(" "));
    });
  }
  function paintHome(retitle) {
    const n = S.sel, def = LEVELS[n - 1], locked = n > S.unlocked, r = S.rec[n] || { t: 0, s: 0, d: false };
    $("#lvTag").textContent = "level " + pad2(n) + (locked ? "  ·  locked" : "");
    if (retitle) setLetters($("#title"), def.name);
    $("#title").style.opacity = locked ? 0.28 : 1;
    $("#homeStars").innerHTML = locked ? "" : starsHTML(r.d ? r.s : 0).replace(/^<div class="stars">|<\/div>$/g, "");
    $("#homeStars").style.visibility = locked ? "hidden" : "visible";
    $("#startOrb").classList.toggle("locked", locked);
    $("#startLbl").textContent = locked ? "locked" : r.d ? "replay" + "  ·  " + r.t + (r.t === 1 ? " try" : " tries") : r.t ? "play  ·  try " + (r.t + 1) : "play";
    $("#rebirthBtn").classList.toggle("hide", !r.d);
    $("#prevBtn").disabled = n <= 1; $("#nextBtn").disabled = n >= N;
    let done = 0; for (let i = 1; i <= N; i++) if (S.rec[i] && S.rec[i].d) done++;
    $("#railFill").style.width = (done / N * 100) + "%";
    $("#progTag").textContent = pad2(n) + " / " + N;
  }
  function browse(d) {
    const n = Math.max(1, Math.min(N, S.sel + d)); if (n === S.sel) return;
    S.sel = n; saveState(); paintHome(true);
    if (n <= S.unlocked && G.mode === "home") { const def = LEVELS[n - 1]; RENDER.setLevel(demoL, def.th, n * 101); G.snap = true; }
  }
  $("#prevBtn").addEventListener("click", function () { browse(-1); });
  $("#nextBtn").addEventListener("click", function () { browse(1); });
  function homeTheme() { const n = Math.min(S.sel, S.unlocked); return LEVELS[n - 1]; }
  function startHome() {
    G.mode = "home"; G.paused = false; $("#hud").classList.remove("on"); $("#msBanner").classList.remove("show");
    const def = homeTheme();
    G.L = demoL; G.spb = 60 / HOME.mu[0]; G.st = SIM.newState(); G.st.ev = []; G.beat0 = 0; G.squash = 0; G.restY = 0; G.snap = true;
    RENDER.setHome(true); RENDER.setLevel(demoL, def.th, def.n * 101);
    if (MUSIC.ctx) { homeSong = MUSIC.makeSong(HOME, homeL, true); MUSIC.start(homeSong); }
    clock.start();
  }
  function launch() {
    if (S.sel > S.unlocked || G.mode !== "home") return;
    audioGesture();
    const r = $("#startOrb").getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, w = $("#wipe"), W = window.innerWidth, H = window.innerHeight;
    const far = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));
    w.style.left = (cx - 5) + "px"; w.style.top = (cy - 5) + "px"; w.style.setProperty("--sc", Math.ceil(far / 5) + "");
    w.classList.remove("go", "fade"); void w.offsetWidth; w.classList.add("go");
    G.mode = "launch"; MUSIC.stop(0.4);
    setTimeout(function () {
      show(""); startLevel(S.sel);
      w.classList.add("fade"); setTimeout(function () { w.classList.remove("go", "fade"); }, 340);
    }, 500);
  }
  $("#startOrb").addEventListener("click", launch);
  $("#rebirthBtn").addEventListener("click", function () {
    const n = S.sel;
    showCard({ eyebrow: "level " + pad2(n), title: "Rebirth?", body: "This clears the stars and tries of " + LEVELS[n - 1].name + ", as if it had never been played. Every level you have unlocked stays unlocked.",
      acts: [{ t: "rebirth", danger: true, fn: function () { S.rec[n] = { t: 0, s: 0, d: false }; saveState(); hideCard(); paintHome(false); } }, { t: "cancel", fn: hideCard }] });
  });

  /* ---------------- levels panel + settings ---------------- */
  function paintLevels() {
    let html = "";
    for (let i = 1; i <= N; i++) {
      const r = S.rec[i], st = i > S.unlocked ? "locked" : i === S.sel ? "next" : r && r.d ? "done" : "";
      html += '<button class="cell ' + st + '"' + (st === "locked" ? " disabled" : "") + ' data-lv="' + i + '">' + pad2(i) + (i <= S.unlocked ? starsHTML(r && r.d ? r.s : 0) : "") + "</button>";
    }
    $("#lvGrid").innerHTML = html;
  }
  $("#lvGrid").addEventListener("click", function (e) {
    const b = e.target.closest("[data-lv]"); if (!b || b.disabled) return;
    const d = +b.dataset.lv - S.sel; show("home"); if (d) browse(d);
  });
  const vol = $("#volRange");
  vol.value = Math.round(S.music * 100); $("#volOut").textContent = vol.value;
  vol.addEventListener("input", function () { S.music = vol.value / 100; $("#volOut").textContent = vol.value; MUSIC.setVol(S.music); saveState(); });
  const sw = $("#shakeSw"); sw.setAttribute("aria-pressed", S.shake ? "true" : "false");
  sw.addEventListener("click", function () { S.shake = !S.shake; sw.setAttribute("aria-pressed", S.shake ? "true" : "false"); saveState(); });
  $("#resetBtn").addEventListener("click", function () {
    showCard({ eyebrow: "settings", title: "Reset everything?", body: "All unlocks, stars and try counts will be cleared.",
      acts: [{ t: "reset", danger: true, fn: function () { S.rec = {}; S.unlocked = 1; S.sel = 1; saveState(); hideCard(); show("home"); startHome(); } }, { t: "cancel", fn: hideCard }] });
  });

  /* ---------------- play ---------------- */
  function banner() {
    const el = $("#msBanner");
    el.innerHTML = "Reach the end &nbsp;·&nbsp; avoid the obstacles<br>" + (TOUCH ? "<b>jump</b> tap the right side &nbsp;·&nbsp; <b>slide</b> hold the left side"
      : "<b>jump</b> space · ↑ · w · click &nbsp;&nbsp; <b>slide</b> ↓ · s · right-click");
    el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
  }
  function paintHud() {
    $("#hudLevel").innerHTML = "level <b>" + pad2(G.n) + "</b> &nbsp;·&nbsp; " + G.def.name;
    $("#hudTry").innerHTML = "try <b>" + G.tryN + "</b>";
  }
  function startLevel(n) {
    G.n = n; G.def = LEVELS[n - 1]; G.L = getL(n); G.spb = 60 / G.def.mu[0]; G.session = 0;
    G.song = MUSIC.ctx ? MUSIC.makeSong(G.def, G.L, false) : null;
    RENDER.setHome(false); RENDER.setLevel(G.L, G.def.th, n * 101);
    $("#hud").classList.add("on");
    beginRun(true);
  }
  function beginRun(first) {
    const r = rec(G.n);
    if (!r.d) { r.t++; saveState(); G.tryN = r.t; } else { G.session++; G.tryN = G.session; }
    G.st = SIM.newState(); G.st.ev = []; G.mode = "play"; G.paused = false; G.squash = 0; G.restY = 0; G.snap = true; G.beat0 = 0;
    keys.qj = keys.qs = false;
    RENDER.setLevel(G.L, G.def.th, G.n * 101);
    if (G.song) MUSIC.start(G.song);
    clock.start(); paintHud();
    if (first) banner();
  }
  function onEvents(st, x) {
    const ev = st.ev; if (!ev.length) return;
    const fl = st.flip, fb = fl && st.zz ? st.zz.base : 0, o = { flip: fl, fb: fb }, C = RENDER.COL, y = st.y;
    const puff = function (n, sp) { RENDER.emit(x, y + .05, n, { sp: sp, life: .4, sz: .08, ang: Math.PI * .5, spread: 2.6, g: 5, flip: fl, fb: fb }); };
    const pop = function (col, n) { RENDER.ring(x, y + .9, col, 1.8, fl, fb); RENDER.emit(x, y + .9, n || 10, { sp: 5, life: .5, sz: .1, col: col, g: 4, flip: fl, fb: fb }); };
    for (const e of ev) {
      switch (e) {
        case "jump": puff(4, 2); break;
        case "air": pop(C.ha, 8); break;
        case "land": G.squash = .55; puff(5, 2.4); break;
        case "land2": G.squash = 1; puff(12, 4); if (S.shake) RENDER.shake(.4); break;
        case "bounce": G.squash = .8; pop(C.bl, 12); if (S.shake) RENDER.shake(.3); break;
        case "halo": pop(C.ha, 10); break;
        case "key": pop(C.ke, 12); break;
        case "gate": RENDER.emit(x + 3, y + 2.5, 14, { sp: 4, life: .6, sz: .1, col: C.ke, r: 4, g: 2, flip: fl, fb: fb }); break;
        case "rift": pop(C.ri, 14); if (S.shake) RENDER.shake(.2); break;
        case "comet": pop(C.co, 10); break;
        case "eye": RENDER.ring(x, y + 4.9, C.ey, 1.4, fl, fb); break;
        case "coil": pop(C.S, 12); if (S.shake) RENDER.shake(.3); break;
        case "break": RENDER.emit(x, y, 26, { sp: 6, life: .8, sz: .16, k: 1, col: C.X, r: 2.4, flip: fl, fb: fb }); if (S.shake) RENDER.shake(.5); break;
        case "flip": pop(C.Z, 12); break;
        case "grab": RENDER.ring(x, y + 1.75, C.L, 1, fl, fb); break;
        case "slide": puff(3, 1.6); break;
        case "die":
          if (G.mode === "play") {
            RENDER.burst(x, y, fl, fb); if (!S.shake) RENDER.shake(0);
            G.mode = "dead"; G.deadAt = now(); MUSIC.stop(0.14);
          }
          break;
      }
    }
    ev.length = 0;
  }
  function win() {
    G.mode = "won"; G.wonAt = now();
    const r = rec(G.n), first = !r.d;
    if (first) { r.d = true; r.s = starsFor(r.t); }
    if (G.n < N && S.unlocked < G.n + 1) S.unlocked = G.n + 1;
    saveState();
    const n = G.n, shown = first ? r.s : r.s, tries = G.tryN;
    RENDER.emit(G.L.endX + 1, G.L.baseAt(G.L.endX) + 4.5, 40, { sp: 7, life: 1.1, sz: .13, k: 1, r: 1.8, g: 9 });
    setTimeout(function () {
      if (G.mode !== "won" || G.n !== n) return;
      const acts = [];
      if (n < N) acts.push({ t: "next level", solid: true, fn: function () { hideCard(); MUSIC.stop(0.2); S.sel = n + 1; saveState(); startLevel(n + 1); } });
      acts.push({ t: "replay", solid: n >= N, fn: function () { hideCard(); MUSIC.stop(0.2); startLevel(n); } });
      acts.push({ t: "home", fn: function () { hideCard(); if (n < N) S.sel = n + 1; saveState(); show("home"); startHome(); } });
      showCard({ eyebrow: "level " + pad2(n) + " cleared", title: G.def.name, stars: shown,
        stats: first ? [[tries, tries === 1 ? "try" : "tries"]] : [[tries, "this run"], [r.t, "record tries"]], acts: acts });
    }, 1150);
  }

  /* ---------------- pause ---------------- */
  function pauseGame() {
    if (G.mode !== "play" || G.paused) return;
    G.paused = true; G.pauseT = now(); MUSIC.suspend(); keys.j = keys.s = false;
    showCard({ eyebrow: "level " + pad2(G.n) + "  ·  try " + G.tryN, title: "Paused",
      acts: [{ t: "resume", solid: true, fn: resumeGame },
        { t: "restart", fn: function () { hideCard(); MUSIC.resume(); beginRun(false); } },
        { t: "quit", fn: function () { hideCard(); MUSIC.resume(); G.paused = false; show("home"); startHome(); } }] });
  }
  function resumeGame() {
    hideCard(); const p = MUSIC.resume();
    const go = function () { clock.t0p += now() - G.pauseT; clock.off = null; G.paused = false; };
    if (p && p.then) p.then(go, go); else go();
  }
  $("#pauseBtn").addEventListener("click", function (e) { e.stopPropagation(); pauseGame(); });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { if (G.mode === "play") pauseGame(); else MUSIC.suspend(); }
    else if (!G.paused) { MUSIC.resume(); clock.off = null; }
  });
  window.addEventListener("blur", function () { pauseGame(); });

  /* ---------------- input ---------------- */
  let audioOn = false;
  function audioGesture() {
    if (!MUSIC.ctx) { if (!MUSIC.init()) return; MUSIC.setVol(S.music); }
    if (!G.paused) MUSIC.resume();
    if (!audioOn) { audioOn = true; if (G.mode === "home") startHome(); }
  }
  document.addEventListener("pointerdown", audioGesture, { capture: true });
  document.addEventListener("keydown", audioGesture, { capture: true });
  window.addEventListener("keydown", function (e) {
    const c = e.code;
    if (c === "Escape") { if (G.mode === "play" && !G.paused) pauseGame(); else if (G.paused) resumeGame(); return; }
    if (G.cardUp) { if (c === "Enter" && cardActs[0]) { e.preventDefault(); cardActs[0].fn(); } return; }
    if (G.mode === "play") {
      if (c === "Space" || c === "ArrowUp" || c === "KeyW") { if (!e.repeat) { keys.j = true; keys.qj = true; } e.preventDefault(); }
      else if (c === "ArrowDown" || c === "KeyS") { if (!e.repeat) { keys.s = true; keys.qs = true; } e.preventDefault(); }
    } else if (G.mode === "home" && $("#home").classList.contains("on")) {
      if (c === "Enter" || c === "Space") { e.preventDefault(); launch(); }
      else if (c === "ArrowLeft") browse(-1); else if (c === "ArrowRight") browse(1);
    }
  });
  window.addEventListener("keyup", function (e) {
    const c = e.code;
    if (c === "Space" || c === "ArrowUp" || c === "KeyW") keys.j = false;
    else if (c === "ArrowDown" || c === "KeyS") keys.s = false;
  });
  const cv = $("#cv"), ptr = {};
  cv.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    if (G.mode !== "play" || G.paused) return;
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    const a = e.pointerType === "mouse" ? (e.button === 2 ? "s" : "j") : (e.clientX < window.innerWidth / 2 ? "s" : "j");
    ptr[e.pointerId] = a; keys[a] = true; keys["q" + a] = true;
  }, { passive: false });
  const up = function (e) { const a = ptr[e.pointerId]; if (!a) return; delete ptr[e.pointerId]; let still = false; for (const k in ptr) if (ptr[k] === a) still = true; if (!still) keys[a] = false; };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  document.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  document.addEventListener("gesturestart", function (e) { e.preventDefault(); });

  /* ---------------- main loop ---------------- */
  let last = 0, slow = 0, lowQ = false;
  const hudFill = $("#hudFill");
  function loop(ts) {
    requestAnimationFrame(loop);
    const t = ts / 1000, dt = Math.min(0.05, Math.max(0.001, t - last)); last = t;
    if (G.mode === "splash" || !G.st || !G.L) return;
    const st = G.st, L = G.L;
    if (!G.paused) {
      MUSIC.schedule();
      if (G.mode !== "dead" && G.mode !== "launch") G.beat = clock.beat(G.spb) - G.beat0;
      if (G.mode === "home" || G.mode === "launch") {
        if (G.beat >= DEMO_BEATS) { G.beat0 += DEMO_BEATS; G.beat -= DEMO_BEATS; G.st = SIM.newState(); G.st.ev = []; RENDER.setLevel(demoL, homeTheme().th, homeTheme().n * 101); G.snap = true; return; }
        const target = Math.floor(G.beat * TPB); let n = 0;
        while (st.tick < target && !st.dead && !st.won && n++ < 4000) { const v = demoIn[Math.floor(st.tick / DEMO_SOL.DEC)] || 0; SIM.step(L, st, v & 1, v & 2, 0); onEvents(st, st.tick * DX); }
      } else if (G.mode === "play") {
        const target = Math.floor(G.beat * TPB);
        if (target - st.tick > TPB * 1.5) { pauseGame(); }
        else {
          while (st.tick < target && !st.dead && !st.won) {
            if (G.bot) { const v = G.bot.path[Math.floor(st.tick / G.bot.DEC)] || 0; keys.j = !!(v & 1); keys.s = !!(v & 2); }
            SIM.step(L, st, keys.j || keys.qj, keys.s || keys.qs, 0); keys.qj = keys.qs = false;
            onEvents(st, st.tick * DX);
          }
          if (st.won && G.mode === "play") win();
        }
      } else if (G.mode === "dead" && now() - G.deadAt > 0.65) { beginRun(false); return; }
      if (st.gr) G.restY = st.flip && st.zz ? st.zz.base : st.y;
      else if (st.flip && st.zz) G.restY = st.zz.base;
      G.squash = Math.max(0, G.squash - dt * 5);
    }
    const dead = G.mode === "dead", fr = Math.max(0, Math.min(1.5, G.beat * TPB - st.tick));
    const x = dead || st.dead ? st.tick * DX : Math.max(G.beat * 4, -40);
    const y = st.gr || st.hang >= 0 || dead || st.won ? st.y : st.y + st.vy * SIM.DT * fr;
    let thermal = false; for (const z of L.zones) if (z.k === "T" && x >= z.x0 && x < z.x1) thermal = true;
    const bf = G.beat - Math.floor(G.beat), pulse = G.beat < 0 || dead ? 0 : Math.pow(Math.max(0, 1 - bf * 2.3), 2);
    RENDER.frame({ s: st, x: x, y: y, beat: G.beat, time: t, pulse: pulse, dead: dead, squash: G.squash, restY: G.restY, snap: G.snap, thermal: thermal,
      demo: G.mode === "home" || G.mode === "launch", noShake: !S.shake }, G.paused ? 0 : dt);
    G.snap = false;
    if (G.mode === "play" || dead || G.mode === "won") hudFill.style.transform = "scaleX(" + Math.max(0, Math.min(1, x / L.endX)).toFixed(4) + ")";
    /* drop resolution once if the device cannot hold 60 fps */
    if (G.mode === "play" && !G.paused && !lowQ) { slow = dt > 0.024 ? slow + 1 : Math.max(0, slow - 0.25); if (slow > 70) { lowQ = true; RENDER.setQuality(0.72); RENDER.resize(); } }
  }

  /* ---------------- boot ---------------- */
  RENDER.resize(cv);
  let rz = 0;
  const onResize = function () { clearTimeout(rz); rz = setTimeout(function () { RENDER.resize(); G.snap = true; }, 120); };
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", function () { setTimeout(onResize, 160); });
  setLetters($("#splashTitle"), "SHADOW SKIRR");
  let splashDone = false;
  function leaveSplash() {
    if (splashDone) return; splashDone = true;
    $("#splash").classList.add("out");
    startHome();
    setTimeout(function () { show("home"); }, 440);
  }
  setTimeout(leaveSplash, 1900);
  $("#splash").addEventListener("pointerdown", function () { audioGesture(); leaveSplash(); });
  requestAnimationFrame(loop);
  window.__SHADOWSKIRR = { G: G, S: function () { return S; }, startLevel: startLevel, keys: keys, getL: getL,
    saveState: saveState, paintHome: paintHome, paintLevels: paintLevels, startHome: startHome, show: show,
    showCard: showCard, hideCard: hideCard, N: N, setS: setS };
  window.__LUMBRA = window.__SHADOWSKIRR;   /* legacy alias for old test scripts / console snippets */

  /* Developer-build hook. The developer build loads one more script after this one, which defines an init
     function; it runs once the page's scripts have all run, so a script that comes later can still define it.
     In the release build that script is absent and this does nothing. */
  let devHooked = false;
  function devHook() {
    const init = window.SHKR_DEV_INIT;
    if (devHooked || typeof init !== "function") return;
    devHooked = true; init(window.__SHADOWSKIRR);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", devHook); else devHook();
})();

