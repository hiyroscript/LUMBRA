#!/usr/bin/env node
/* =============================================================================
   tools/difficulty.js [levels] [--budget N] [--json]

   Scores every level with one number, D, built only from things that can be
   measured on the compiled level and on the solver's path. Prints one row per
   level with the target D(n) = D(1) · R^(n-1) next to it. Built-in Node
   modules only. Also used as a module by tools/check-levels.js.

     node tools/difficulty.js            all levels
     node tools/difficulty.js 7          one level
     node tools/difficulty.js 10-20      a range

   Terms (all per level, the level being exactly one minute long):
     aps    required actions per second: presses of jump or slide on the
            solver's path at the level's fairness margin (first reduced to a
            locally minimal path, see simplify), plus the releases whose
            timing matters (dropping off a Rail, launching off a Coil,
            floating back up in a Thermal), over the chart only
     gap    seconds between consecutive actions: median and 10th percentile
     slack  the largest margin m (0 to 0.3 in steps of 0.02) the level still
            solves with (each probe with a fixed budget, see SLACK_BUDGET). SIM.solve's margin widens every lethal shape and
            narrows every ledge, so less slack means tighter timing somewhere
     mech   mean number of distinct hazard mechanics present in each 2-bar
            window (a zone counts in every window it overlaps)
     combo  places per minute where two different hazards are within 2 beats
            of each other, or one hazard sits inside another's zone. Pairs are
            found from the compiled level, then grouped into places 2 beats
            wide, so a long run of combos counts once per 2 beats
     rest   fraction of bars with no action at all

   D = aps · (1 + a·mech) · (1 + b·combo/10) · (1 + c·(0.3 − slack)/0.3)
         · (1 − d·rest) · (0.25 / max(gap10, 0.12))^e

   Weights: a = 0.2, b = 0.15, c = 0.3, d = 0.5, e = 0.1. The brief started
   from a = 0.35, b = 0.5, c = 0.6, d = 0.5, e = 0.5. Those compound too fast:
   the old game's own level 30 already scored 16× its level 1, and a level 30
   built to the new rules (all 15 hazards, 7-12 combos a minute, little rest,
   bursts of half beats at 176 bpm) scored 25-35× a gentle level 1 at any
   sensible density. The difficulty bands (2× at level 10, 4-5× at level 21)
   fix the ratio at R = 1.08 (9.3× over the game), so the multipliers around
   aps were scaled down until a brutal level 30 lands at 9.3×. In the dense
   levels (README, Density) that splits into about 2.8× from density (0.34 to
   0.94 required presses per beat), 1.57× from tempo, and about 2.1× from
   mixing, combos and timing. Rest no longer separates the levels: every
   level, level 1 included, has an action in nearly every bar. Per term:
   - aps is the base: every other term is a multiplier around 1, so D stays in
     "actions per second" units and a level twice as dense is twice as hard.
   - a = 0.2: mixing is the largest of the multipliers. Going from one hazard
     in view (level 1) to two or three (level 30) is worth about +30 %.
   - b = 0.15 per 10 combos: combos are already partly counted by mech, so
     this only rewards stacking them back to back (10 a minute is +15 %).
   - c = 0.3: slack is a minimum over the whole level (one tight spot sets
     it), so it is a coarse signal. Most levels keep the full 0.3; the last
     ones, built around tight windows, get up to +30 %.
   - d = 0.5: a level that is half rest feels about a quarter easier, not
     half, because the dense half still has to be played.
   - e = 0.1: the 10th-percentile gap mostly re-measures density (a denser
     level has shorter gaps), so at 0.5 it counted density twice. At 0.1 it
     still separates levels with half-beat bursts from even ones. The 0.12 s
     clamp stops one buffered double press from looking like a burst.
   With these, the measured ranking of the rebuilt levels matches the order
   they were designed in.

   Target: R = 1.08 per level (D(30) ≈ 9.3 · D(1)). See README, Difficulty.
   ========================================================================== */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");

const W = { a: 0.2, b: 0.15, c: 0.3, d: 0.5, e: 0.1 };
const R = 1.08, TOL = 0.04;
/* the fairness margin each level must still solve with (README, Difficulty); D is measured on that path */
function fairMargin(n) { return n <= 1 ? 0.12 : n <= 10 ? 0.08 : n <= 20 ? 0.06 : 0.04; }
const SLACK_MAX = 0.3, SLACK_STEP = 0.02;
/* solver budget (ticks) for each probe of the slack search: at least SLACK_BUDGET, and at least 3× what the level's
   own solve at its fairness margin needed, so a long level is not called tight just because it is long. It depends
   only on the level, so D is reproducible; a margin the solver cannot beat within it counts as too tight */
const SLACK_BUDGET = 1.5e6;
const FILES = ["js/sim.js", "js/levels.js", "js/fixes.js"];
/* hazard kind of every compiled thing that belongs to a hazard (HAZ[].k) */
const KIND = { bl: "bl", ha: "ha", ke: "ke", ga: "ke", ri: "ri", co: "co", ey: "ey", em: "ey", F: "F", X: "X", "1": "1", "2": "1" };
const ZONES = { D: 1, A: 1, T: 1, Z: 1, L: 1 };

/* ---------------------------------------------------------------- loading */
/* the same way tools/parity-check.js does it: classic scripts in one vm context */
function load(root) {
  const ctx = vm.createContext({ console: { log: function () {}, warn: function () {}, error: function () {} } });
  FILES.forEach(function (f) { new vm.Script(fs.readFileSync(path.join(root, f), "utf8"), { filename: f }).runInContext(ctx); });
  return vm.runInContext("({ SIM: SIM, LEVELS: LEVELS, HAZ: HAZ, HOME: HOME," +
    "level: function (n) { var FIX = typeof FIXES !== 'undefined' ? FIXES : {}; var d = LEVELS[n - 1]; d.fix = FIX[n] || []; return SIM.compile(d); } })", ctx);
}

/* ---------------------------------------------------------------- measures */
/* actions on a solver path: every press, and every release that ends a hold of at least half a beat when letting
   go later (by half a beat, or just before the next press of that input) would lose the run: dropping off a Rail
   before a blade, launching off a Coil, floating back up in a Thermal */
function actions(api, L, pathArr, DEC, m) {
  const TPB = api.SIM.TPB, end = L.cells * TPB / 2, out = [];
  const matters = function (i, bit) {
    let j = i; const lim = i + Math.round(TPB / 2 / DEC);
    while (j < pathArr.length && j < lim && !(pathArr[j] & bit)) j++;
    if (j === i) return false;
    const q = pathArr.slice(); for (let k = i; k < j && k < q.length; k++) q[k] |= bit;
    if (j >= q.length) for (let k = q.length; k < j; k++) q.push(bit);
    return !api.SIM.replay(L, q, DEC, m || 0).won;
  };
  let prev = 0, tj = 0, ts = 0;
  for (let i = 0; i <= pathArr.length; i++) {
    const v = i < pathArr.length ? pathArr[i] : 0, t = i * DEC;
    if (t >= end) break;
    if ((v & 1) && !(prev & 1)) { out.push({ t: t, k: "jump" }); tj = t; }
    else if (!(v & 1) && (prev & 1) && t - tj >= TPB / 2 && matters(i, 1)) out.push({ t: t, k: "drop" });
    if ((v & 2) && !(prev & 2)) { out.push({ t: t, k: "slide" }); ts = t; }
    else if (!(v & 2) && (prev & 2) && t - ts >= TPB / 2 && matters(i, 2)) out.push({ t: t, k: "release" });
    prev = v;
  }
  return out;
}
/* The depth-first solver returns the first path it finds, which can hold an input, let go and press it again where
   one press would do. Before counting, drop every press the path can do without, and merge every slide into the slide
   before it when that still wins, until nothing changes. The result is a locally minimal path at the same margin.
   Jumps are never merged: holding jump re-jumps on every landing, so one long hold would hide the timed jumps. */
function simplify(api, L, pathArr, DEC, m) {
  const p = pathArr.slice(), wins = function (q) { return api.SIM.replay(L, q, DEC, m).won; };
  let changed = true;
  while (changed) {
    changed = false;
    for (const bit of [1, 2]) {
      for (let i = 0; i < p.length; i++) {
        if (!(p[i] & bit) || (i && (p[i - 1] & bit))) continue;
        let j = i; while (j + 1 < p.length && (p[j + 1] & bit)) j++;
        /* remove this hold */
        const q = p.slice(); for (let k = i; k <= j; k++) q[k] &= ~bit;
        if (wins(q)) { for (let k = i; k <= j; k++) p[k] = q[k]; changed = true; continue; }
        /* or join it to the previous hold of the same input, if that is close (within a beat) */
        let a = i - 1; while (a >= 0 && !(p[a] & bit)) a--;
        if (bit === 2 && a >= 0 && (i - a) * DEC <= api.SIM.TPB) {
          const r = p.slice(); for (let k = a + 1; k < i; k++) r[k] |= bit;
          if (wins(r)) { for (let k = a + 1; k < i; k++) p[k] = r[k]; changed = true; }
        }
      }
    }
  }
  return p;
}
function pct(sorted, p) { if (!sorted.length) return Infinity; return sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))]; }

/* every hazard instance as an interval [x0, x1] in world units, with its kind */
function hazards(L) {
  const out = [], byId = {};
  L.objs.forEach(function (o) { byId[o.id] = o; });
  L.objs.forEach(function (o) {
    const k = KIND[o.k]; if (!k) return;
    if (o.k === "ga") { const key = byId[o.key]; out.push({ k: k, x0: key ? key.cx : o.x0, x1: o.x1 }); }
    else if (o.k === "em") { const eye = byId[o.eye]; out.push({ k: k, x0: eye ? eye.x : o.x0, x1: o.x1 }); }
    else if (o.k !== "ke" && o.k !== "ey") out.push({ k: k, x0: o.x0, x1: o.x1 });
  });
  L.segs.forEach(function (s) { if (s.kind && KIND[s.kind]) out.push({ k: KIND[s.kind], x0: s.x0, x1: s.x1 }); });
  L.coils.forEach(function (c) { out.push({ k: "S", x0: c.x0, x1: c.x1 }); });
  L.rails.forEach(function (r) { out.push({ k: "L", x0: r.x0, x1: r.x1, zone: true }); });
  L.zones.forEach(function (z) { out.push({ k: z.k, x0: z.x0, x1: z.x1, zone: true }); });
  return out.sort(function (a, b) { return a.x0 - b.x0; });
}
function kindsUsed(L) { const s = {}; hazards(L).forEach(function (h) { s[h.k] = 1; }); return Object.keys(s); }

function mech(L, hz) {
  const bars = L.bars; if (bars < 2) return 0;
  let sum = 0;
  for (let b = 0; b + 2 <= bars; b++) {
    const w0 = b * 16, w1 = w0 + 32, set = {};
    for (const h of hz) if (h.x1 > w0 && h.x0 < w1) set[h.k] = 1;
    sum += Object.keys(set).length;
  }
  return sum / (bars - 1);
}
/* combo places: pairs of different hazards within 2 beats (8 units), grouped into 2-beat places */
function combos(L, hz) {
  const locs = [];
  for (let i = 0; i < hz.length; i++) for (let j = i + 1; j < hz.length; j++) {
    const a = hz[i], b = hz[j];
    if (b.x0 > a.x1 + 8 && !a.zone) break;
    if (a.k === b.k) continue;
    const gap = Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1);
    if (gap > 8) continue;
    locs.push(gap <= 0 ? Math.max(a.x0, b.x0) : (Math.min(a.x1, b.x1) + Math.max(a.x0, b.x0)) / 2);
  }
  locs.sort(function (a, b) { return a - b; });
  const places = [];
  for (const x of locs) if (!places.length || x - places[places.length - 1] > 8) places.push(x);
  return places;
}

/* largest margin on the 0..0.3 grid that still solves (bisection; solvability is monotone in m in practice) */
function slackOf(api, L, budget, known) {
  const n = Math.round(SLACK_MAX / SLACK_STEP), cache = Object.assign({}, known || {});
  const ok = function (i) {
    if (cache[i] === undefined) cache[i] = api.SIM.solve(L, +(i * SLACK_STEP).toFixed(2), budget, 6).ok;
    return cache[i];
  };
  /* a margin already known to solve (the fairness margin) stands in for 0: solvability only gets harder with m */
  let lo = -1, hi = n + 1;
  for (const k in cache) { const i = +k; if (cache[k] && i > lo) lo = i; if (!cache[k] && i < hi) hi = i; }
  if (lo < 0) { if (!ok(0)) return { slack: -1, tried: cache }; lo = 0; }
  if (hi > n) { if (ok(n)) return { slack: SLACK_MAX, tried: cache }; hi = n; }
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (ok(mid)) lo = mid; else hi = mid; }
  return { slack: +(lo * SLACK_STEP).toFixed(2), tried: cache };
}

function scoreD(t) {
  return t.aps * (1 + W.a * t.mech) * (1 + W.b * t.combo / 10) * (1 + W.c * (SLACK_MAX - t.slack) / SLACK_MAX) *
    (1 - W.d * t.rest) * Math.pow(0.25 / Math.max(t.gap10, 0.12), W.e);
}

/* everything about one level. opts: { budget, margin (path to measure on), sol (a solve result to reuse) } */
function measure(api, n, opts) {
  opts = opts || {};
  const def = api.LEVELS[n - 1], L = api.level(n), bpm = def.mu[0], TPB = api.SIM.TPB;
  const sec = (L.cells / 2) * 60 / bpm, budget = opts.budget || 6e6, m = opts.margin !== undefined ? opts.margin : fairMargin(n);
  const sol = opts.sol || api.SIM.solve(L, m, budget, 6);
  const out = { n: n, name: def.name, bpm: bpm, sec: sec, bars: L.bars, L: L, sol: sol, ok: sol.ok };
  if (!sol.ok) return out;
  const minPath = simplify(api, L, sol.path, sol.DEC, m);
  const acts = actions(api, L, minPath, sol.DEC, m), toSec = 60 / bpm / TPB;
  out.path = minPath;
  const gaps = []; for (let i = 1; i < acts.length; i++) gaps.push((acts[i].t - acts[i - 1].t) * toSec);
  gaps.sort(function (a, b) { return a - b; });
  const barsHit = new Uint8Array(L.bars); acts.forEach(function (a) { const b = Math.floor(a.t / (4 * TPB)); if (b < L.bars) barsHit[b] = 1; });
  let quiet = 0; for (let b = 0; b < L.bars; b++) if (!barsHit[b]) quiet++;
  const known = {}; known[Math.round(m / SLACK_STEP)] = true;
  const sl = opts.slack !== undefined ? { slack: opts.slack } : slackOf(api, L, opts.slackBudget || Math.max(SLACK_BUDGET, 3 * (sol.steps || 0)), known);
  const hz = hazards(L), places = combos(L, hz);
  Object.assign(out, { acts: acts, aps: acts.length / sec, gapMed: pct(gaps, 0.5), gap10: pct(gaps, 0.1), slack: sl.slack,
    mech: mech(L, hz), combo: places.length * 60 / sec, comboAt: places, rest: quiet / L.bars, kinds: kindsUsed(L) });
  out.D = scoreD(out);
  return out;
}
function target(D1, n) { return D1 * Math.pow(R, n - 1); }
function band(n) { return n <= 9 ? "easy" : n <= 20 ? "medium" : "hard"; }

module.exports = { load: load, fairMargin: fairMargin, measure: measure, actions: actions, simplify: simplify, hazards: hazards, kindsUsed: kindsUsed, mech: mech, combos: combos,
  slackOf: slackOf, scoreD: scoreD, target: target, band: band, W: W, R: R, TOL: TOL };

/* ---------------------------------------------------------------- CLI */
if (require.main === module) {
  const args = process.argv.slice(2), root = path.resolve(__dirname, "..");
  let budget = 6e6, json = false, sel = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--budget") budget = +args[++i];
    else if (args[i] === "--json") json = true;
    else { const m = /^(\d+)(?:-(\d+))?$/.exec(args[i]); if (m) sel = [+m[1], +(m[2] || m[1])]; }
  }
  const api = load(root), N = api.LEVELS.length;
  const lo = sel ? sel[0] : 1, hi = sel ? sel[1] : N;
  /* D(1) anchors every target, so it is always measured */
  const first = measure(api, 1, { budget: budget }), rows = [];
  for (let n = lo; n <= hi; n++) {
    const r = n === 1 ? first : measure(api, n, { budget: budget });
    rows.push(r);
  }
  if (json) {
    console.log(JSON.stringify(rows.map(function (r) {
      return { n: r.n, ok: r.ok, bpm: r.bpm, sec: +r.sec.toFixed(2), aps: r.aps, gapMed: r.gapMed, gap10: r.gap10, slack: r.slack, mech: r.mech,
        combo: r.combo, rest: r.rest, D: r.D, target: first.D ? target(first.D, r.n) : null, kinds: r.kinds };
    }), null, 1));
    process.exit(0);
  }
  const f = function (v, d) { return v === undefined || v === null || !isFinite(v) ? "-" : v.toFixed(d); };
  const head = ["lv", "name", "bpm", "sec", "aps", "gapMed", "gap10", "slack", "mech", "combo", "rest", "D", "target", "D/target", "band"];
  const tab = [head];
  rows.forEach(function (r) {
    if (!r.ok) { tab.push([String(r.n), r.name, String(r.bpm), f(r.sec, 1), "UNSOLVED"]); return; }
    const t = first.D ? target(first.D, r.n) : NaN;
    tab.push([String(r.n), r.name, String(r.bpm), f(r.sec, 1), f(r.aps, 2), f(r.gapMed, 2), f(r.gap10, 2), f(r.slack, 2), f(r.mech, 2),
      f(r.combo, 0), f(r.rest, 2), f(r.D, 3), f(t, 3), f(r.D / t, 3), band(r.n)]);
  });
  const w = head.map(function (_, c) { return Math.max.apply(null, tab.map(function (r) { return (r[c] || "").length; })); });
  tab.forEach(function (r, i) {
    console.log(r.map(function (c, j) { c = c || ""; return j === 1 ? c + " ".repeat(w[j] - c.length) : " ".repeat(w[j] - c.length) + c; }).join("  "));
    if (i === 0) console.log(w.map(function (x) { return "-".repeat(x); }).join("  "));
  });
  console.log("\nD = aps·(1+" + W.a + "·mech)·(1+" + W.b + "·combo/10)·(1+" + W.c + "·(0.3−slack)/0.3)·(1−" + W.d + "·rest)·(0.25/max(gap10,0.12))^" + W.e +
    "   target D(n) = D(1)·" + R + "^(n−1), ±" + (TOL * 100) + " %");
}
